import crypto from "node:crypto";
const REDIRECT_URI = "https://retzef-ai.vercel.app/api/discord/callback";
export default function handler(req, res) {
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).end("Method not allowed"); }
  const clientId = process.env.DISCORD_CLIENT_ID;
  const secret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !secret) return res.status(500).send("Discord OAuth is not configured");
  const state = crypto.randomBytes(24).toString("hex");
  res.setHeader("Set-Cookie", `discord_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/api/discord/callback; Max-Age=300`);
  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("scope", "identify");
  url.searchParams.set("state", state);
  return res.redirect(302, url.toString());
}
