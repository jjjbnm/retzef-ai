import { getSession, readChats, setPrivateHeaders, writeChats } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }
  const message = typeof req.body?.message === "string" ? req.body.message.trim().slice(0, 8000) : "";
  if (!message) return res.status(400).json({ message: "Message is required." });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ message: "GEMINI_API_KEY is missing from the Vercel server environment." });

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
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        model: "gemini-3.8-flash",
        input: message,
        system_instruction: systemInstruction,
        generation_config: {
          temperature: 0.7,
          max_output_tokens: 800,
          thinking_level: "low"
        }
      })
    });
    const data = await response.json();
    if (!response.ok) {
      const providerMessage = typeof data?.error?.message === "string" ? data.error.message.slice(0, 350) : (data?.error?.status || "Unknown provider error");
      console.error("Gemini API error", response.status, providerMessage);
      return res.status(response.status === 429 ? 429 : 502).json({ message: "Gemini API error (" + response.status + "): " + providerMessage });
    }
    const reply = (data.steps || [])
      .filter(step => step?.type === "model_output")
      .flatMap(step => Array.isArray(step.content) ? step.content : [])
      .map(part => typeof part.text === "string" ? part.text : "")
      .join("")
      .trim();
    if (!reply) {
      const reason = data?.status || data?.errors?.[0]?.message || "No text returned";
      return res.status(502).json({ message: "Gemini returned no text: " + String(reason).slice(0, 120) });
    }

    try {
      const session = await getSession(req);
      const conversationId = typeof req.body?.conversation_id === "string" ? req.body.conversation_id.slice(0, 80) : "";
      if (session && conversationId) {
        const chats = await readChats(session.userId);
        let chat = chats.find(item => item.id === conversationId);
        if (!chat) {
          chat = { id: conversationId, title: message.slice(0, 32) || "שיחה חדשה", messages: [] };
          chats.push(chat);
        }
        chat.messages = Array.isArray(chat.messages) ? chat.messages : [];
        chat.messages.push({ role: "user", text: message }, { role: "assistant", text: reply });
        chat.messages = chat.messages.slice(-200);
        await writeChats(session.userId, chats.slice(-50));
      }
    } catch (storageError) {
      console.error("Cloud chat save failed:", storageError?.message || "unknown");
    }

    return res.status(200).json({ reply, model: "gemini-3.8-flash" });
  } catch (error) {
    console.error("Gemini connection error:", error?.message || "unknown");
    return res.status(502).json({ message: "Could not connect to Gemini right now." });
  }
}
