// Retzef AI chat endpoint powered by Gemini.
// The API key stays on the server and is never sent to the browser.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const message = typeof req.body?.message === "string"
    ? req.body.message.trim().slice(0, 8000)
    : "";

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "Gemini API key is not configured on the server." });
  }

  const prefs = req.body?.personalization || {};
  const allowedStyles = ["Friendly", "Professional", "Efficient", "Quirky", "Candid", "Custom"];
  const style = allowedStyles.includes(prefs.style) ? prefs.style : "Friendly";
  const warmth = Math.min(5, Math.max(1, Number(prefs.warmth) || 3));
  const enthusiasm = Math.min(5, Math.max(1, Number(prefs.enthusiasm) || 3));
  const headers = ["Default", "More", "Fewer"].includes(prefs.headers) ? prefs.headers : "Default";
  const emoji = ["Default", "More", "Fewer", "None"].includes(prefs.emoji) ? prefs.emoji : "Default";
  const extraInstructions = typeof prefs.instructions === "string"
    ? prefs.instructions.slice(0, 1500)
    : "";

  const systemInstruction = [
    "You are Retzef AI, a helpful general-purpose assistant.",
    "Reply in the same language as the user's latest message unless they ask otherwise.",
    "Be accurate, clear, age-appropriate, and honest about uncertainty.",
    "Do not claim to have performed actions you did not perform.",
    `Style: ${style}. Warmth: ${warmth}/5. Enthusiasm: ${enthusiasm}/5.`,
    `Headings and lists preference: ${headers}. Emoji preference: ${emoji}.`,
    extraInstructions ? `Additional user preferences: ${extraInstructions}` : ""
  ].filter(Boolean).join("\n");

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
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          contents: [{
            role: "user",
            parts: [{ text: message }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const status = response.status === 429 ? 429 : 502;
      return res.status(status).json({
        error: response.status === 429
          ? "Gemini usage limit reached. Please try again later."
          : "Gemini request failed. Check the API key and model availability."
      });
    }

    const reply = (data.candidates?.[0]?.content?.parts || [])
      .map(part => typeof part.text === "string" ? part.text : "")
      .join("")
      .trim();

    if (!reply) {
      return res.status(502).json({ error: "Gemini returned an empty response." });
    }

    return res.status(200).json({ reply, model: "gemini-2.5-flash" });
  } catch {
    return res.status(502).json({ error: "Could not connect to Gemini. Please try again." });
  }
}
