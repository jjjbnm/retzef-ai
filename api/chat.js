export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const message = typeof req.body?.message === "string" ? req.body.message.trim().slice(0, 8000) : "";
  if (!message) return res.status(400).json({ message: "Message is required." });

  const apiKey = process.env.RETZEF_BRAIN_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      message: "RETZEF_BRAIN_API_KEY is missing from the Vercel server environment."
    });
  }

  const prefs = req.body?.personalization && typeof req.body.personalization === "object" ? req.body.personalization : {};
  const clamp = (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(1, Math.min(5, number)) : fallback;
  };

  const systemInstruction = [
    "You are Retzef AI, a helpful assistant.",
    "Reply in the same language as the user's latest message.",
    "Be accurate, clear, respectful, and age-appropriate.",
    "Base style: " + String(prefs.style || "Friendly").slice(0, 40) + ".",
    "Warmth level: " + clamp(prefs.warmth, 3) + " out of 5.",
    "Enthusiasm level: " + clamp(prefs.enthusiasm, 3) + " out of 5.",
    "Formatting preference: " + String(prefs.headers || "Default").slice(0, 30) + ".",
    "Emoji preference: " + String(prefs.emoji || "Default").slice(0, 30) + ".",
    "Additional user instructions: " + String(prefs.instructions || "").slice(0, 1500)
  ].join("\n");

  try {
    const response = await fetch("https://retzef-brain-rer878tvp-helpme9284772-7829s-projects.vercel.app/api/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const providerMessage = data?.error?.message || data?.message || "Unknown Retzef Brain error";
      console.error("Retzef Brain API error", response.status, String(providerMessage).slice(0, 300));
      return res.status(response.status === 429 ? 429 : 502).json({
        message: "Retzef Brain API error (" + response.status + "): " + String(providerMessage).slice(0, 300)
      });
    }

    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({ message: "Retzef Brain returned an empty response." });
    }

    return res.status(200).json({ reply: reply.trim(), model: data.model || "retzef-code-subword" });
  } catch (error) {
    console.error("Retzef Brain connection error:", error?.message || "unknown");
    return res.status(502).json({ message: "Could not connect to Retzef Brain right now." });
  }
}
