export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const message = typeof req.body?.message === "string"
    ? req.body.message.trim().slice(0, 8000)
    : "";

  if (!message) {
    return res.status(400).json({ message: "Message is required." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ message: "GEMINI_API_KEY is missing from the Vercel server environment." });
  }

  const prefs = req.body?.personalization && typeof req.body.personalization === "object"
    ? req.body.personalization
    : {};
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
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const providerMessage = typeof data?.error?.message === "string"
        ? data.error.message.slice(0, 350)
        : (data?.error?.status || "Unknown provider error");
      console.error("Gemini API error", response.status, providerMessage);
      return res.status(response.status === 429 ? 429 : 502).json({
        message: "Gemini API error (" + response.status + "): " + providerMessage
      });
    }

    const reply = (data.candidates?.[0]?.content?.parts || [])
      .map(part => typeof part.text === "string" ? part.text : "")
      .join("")
      .trim();

    if (!reply) {
      const reason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason || "No text returned";
      return res.status(502).json({ message: "Gemini returned no text: " + String(reason).slice(0, 120) });
    }

    return res.status(200).json({ reply, model: "gemini-2.5-flash" });
  } catch (error) {
    console.error("Gemini connection error:", error?.message || "unknown");
    return res.status(502).json({ message: "Could not connect to Gemini right now." });
  }
}
