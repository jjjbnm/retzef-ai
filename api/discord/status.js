import crypto from "node:crypto";
function sign(value, secret) { return crypto.createHmac("sha256", secret).update(value).digest("base64url"); }
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ connected: false }); }
  const secret = process.env.DISCORD_CLIENT_SECRET;
  const raw = req.headers.cookie || "";
  const item = raw.split(";").map(v => v.trim()).find(v => v.startsWith("retzef_discord="));
  if (!secret || !item) return res.status(200).json({ connected: false });
  try {
    const value = decodeURIComponent(item.slice("retzef_discord=".length));
    const [payload, signature] = value.split(".");
    if (!payload || !signature || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(sign(payload, secret)))) return res.status(200).json({ connected: false });
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const age = Date.now() - session.at;
    if (!session.id || age < 0 || age > 30 * 24 * 60 * 60 * 1000) return res.status(200).json({ connected: false });
    return res.status(200).json({ connected: true });
  } catch (e) { return res.status(200).json({ connected: false }); }
}
