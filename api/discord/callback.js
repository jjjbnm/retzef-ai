import crypto from "node:crypto";
const REDIRECT_URI = "https://retzef-ai.vercel.app/api/discord/callback";
function readCookie(req, name) {
  const raw = req.headers.cookie || "";
  const item = raw.split(";").map(v => v.trim()).find(v => v.startsWith(name + "="));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : "";
}
function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}
export default async function handler(req, res) {
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).end("Method not allowed"); }
  const clearState = "discord_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/api/discord/callback; Max-Age=0";
  const fail = (message) => { res.setHeader("Set-Cookie", clearState); return res.status(400).send(message); };
  const { code, state, error } = req.query || {};
  if (error) return fail("Discord authorization was cancelled");
  const expected = readCookie(req, "discord_oauth_state");
  if (!code || !state || !expected || state !== expected) return fail("Invalid OAuth state");
  const clientId = process.env.DISCORD_CLIENT_ID, clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) return res.status(500).send("Discord OAuth is not configured");
  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "authorization_code", code: String(code), redirect_uri: REDIRECT_URI })
    });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || !token.access_token) return fail("Discord token exchange failed");
    const userResponse = await fetch("https://discord.com/api/users/@me", { headers: { Authorization: `Bearer ${token.access_token}` } });
    const user = await userResponse.json();
    if (!userResponse.ok || !user.id) return fail("Could not verify Discord account");
    const payload = Buffer.from(JSON.stringify({ id: user.id, at: Date.now() })).toString("base64url");
    const session = payload + "." + sign(payload, clientSecret);
    res.setHeader("Set-Cookie", [
      clearState,
      `retzef_discord=${session}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`
    ]);
    return res.redirect(302, "/?discord=connected");
  } catch (e) {
    return fail("Discord connection failed. Please try again.");
  }
}
