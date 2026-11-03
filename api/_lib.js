import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const COOKIE = "retzef_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

export async function redisCommand(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || ! token) throw new Error("Redis is not configured. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.");
  const response = await fetch(url.replace(/\/+$/, ""), {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error("Redis request failed.");
  return data.result;
}

export function setPrivateHeaders(res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Vary", "Cookie");
}

export function readCookie(req, name) {
  const raw = req.headers.cookie || "";
  const item = raw.split(";").map(v => v.trim()).find(v => v.startsWith(name + "="));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : "";
}

export async function getSession(req) {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  const sessionJson = await redisCommand(["GET", "retzef:session:" + createHash("sha256").update(token).digest("hex")]);
  if (!sessionJson) return null;
  try { return JSON.parse(sessionJson); } catch { return null; }
}

export async function createSession(res, user) {
  const token = randomBytes(32).toString("hex");
  const key = "retzef:session:" + createHash("sha256").update(token).digest("hex");
  await redisCommand(["SET", key, JSON.stringify({ userId: user.id, username: user.username }), "EX", SESSION_SECONDS]);
  res.setHeader("Set-Cookie", COOKIE + "=" + encodeURIComponent(token) + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + SESSION_SECONDS);
}

export async function destroySession(req, res) {
  const token = readCookie(req, COOKIE);
  if (token) {
    const key = "retzef:session:" + createHash("sha256").update(token).digest("hex");
    await redisCommand(["DEL", key]);
  }
  res.setHeader("Set-Cookie", COOKIE + "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
}

export async function hashPassword(password, saltHex) {
  const salt = saltHex || randomBytes(16).toString("hex");
  const derived = await scrypt(password, Buffer.from(salt, "hex"), 64);
  return { salt, hash: Buffer.from(derived).toString("hex") };
}

export async function verifyPassword(password, salt, expectedHex) {
  const actual = await scrypt(password, Buffer.from(salt, "hex"), 64);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function readUser(username) {
  const value = await redisCommand(["GET", "retzef:user:" + username.toLowerCase()]);
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}

export async function readChats(userId) {
  const value = await redisCommand(["GET", "retzef:chats:" + userId]);
  if (!value) return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

export async function writeChats(userId, chats) {
  await redisCommand(["SET", "retzef:chats:" + userId, JSON.stringify(chats)]);
}
