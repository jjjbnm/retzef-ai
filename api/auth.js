import { randomUUID } from "node:crypto";
import { createSession, destroySession, getSession, hashPassword, readUser, setPrivateHeaders, verifyPassword, redisCommand } from "./_lib.js";

export default async function handler(req, res) {
  setPrivateHeaders(res);
  const action = req.method === "GET" ? new URL(req.url, "https://retzef-ai.vercel.app").searchParams.get("action") : req.body?.action;

  try {
    if (req.method === "GET" && action === "me") {
      const session = await getSession(req);
      return res.status(200).json({ authenticated: !!session, user: session ? { username: session.username } : null });
    }

    if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed." });

    if (action === "logout") {
      await destroySession(req, res);
      return res.status(200).json({ ok: true });
    }

    const ip = String(req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim().slice(0, 64);
    const bucket = Math.floor(Date.now() / 60000);
    const rateKey = "retzef:auth-rate:" + (await import("node:crypto")).createHash("sha256").update(ip + ":" + bucket).digest("hex");
    const attempts = Number(await redisCommand(["INCR", rateKey]));
    if (attempts === 1) await redisCommand(["EXPIRE", rateKey, 60]);
    if (attempts > 15) return res.status(429).json({ message: "יותר מדי ניסיונות. נסה שוב בעוד דקה." });

    const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      return res.status(400).json({ message: "שם המשתמש חייב להכיל 3–24 תווים באנגלית, מספרים או _." });
    }
    if (password.length < 10 || password.length > 128) {
      return res.status(400).json({ message: "הסיסמה חייבת להכיל לפחות 10 תווים ועד 128 תווים." });
    }

    if (action === "register") {
      const existing = await readUser(username);
      if (existing) return res.status(409).json({ message: "שם המשתמש כבר תפוס. נסה שם אחר." });
      const { salt, hash } = await hashPassword(password);
      const user = { id: randomUUID(), username, salt, passwordHash: hash, createdAt: new Date().toISOString() };
      const result = await redisCommand(["SET", "retzef:user:" + username.toLowerCase(), JSON.stringify(user), "NX"]);
      if (result !== "OK") return res.status(409).json({ message: "שם המשתמש כבר תפוס. נסה שם אחר." });
      await createSession(res, user);
      return res.status(201).json({ ok: true, user: { username } });
    }

    if (action === "login") {
      const user = await readUser(username);
      if (!user || !(await verifyPassword(password, user.salt, user.passwordHash))) {
        return res.status(401).json({ message: "שם המשתמש או הסיסמה שגויים." });
      }
      await createSession(res, user);
      return res.status(200).json({ ok: true, user: { username: user.username } });
    }

    return res.status(400).json({ message: "Unknown action." });
  } catch (error) {
    console.error("Retzef auth error:", error?.message || "unknown");
    return res.status(503).json({ message: "שירות החשבונות אינו זמין כרגע. בדוק את הגדרות Redis ב־Vercel." });
  }
}
