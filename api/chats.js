import { getSession, readChats, setPrivateHeaders, writeChats } from "./_lib.js";

function cleanChats(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-50).map(chat => ({
    id: String(chat?.id || "").slice(0, 80),
    title: String(chat?.title || "שיחה חדשה").slice(0, 120),
    messages: Array.isArray(chat?.messages) ? chat.messages.slice(-200).map(m => ({
      role: m?.role === "assistant" ? "assistant" : "user",
      text: String(m?.text || "").slice(0, 8000)
    })) : []
  })).filter(chat => chat.id);
}

export default async function handler(req, res) {
  setPrivateHeaders(res);
  try {
    const session = await getSession(req);
    if (!session) return res.status(401).json({ message: "יש להתחבר כדי לגשת לשיחות בענן." });

    if (req.method === "GET") {
      return res.status(200).json({ chats: await readChats(session.userId) });
    }

    if (req.method === "POST") {
      const incoming = cleanChats(req.body?.chats);
      const existing = await readChats(session.userId);
      const merged = new Map(existing.map(chat => [chat.id, chat]));
      for (const chat of incoming) merged.set(chat.id, chat);
      const chats = Array.from(merged.values()).slice(-50);
      await writeChats(session.userId, chats);
      return res.status(200).json({ ok: true, chats });
    }

    if (req.method === "DELETE") {
      const id = String(req.query?.id || "");
      const existing = await readChats(session.userId);
      const chats = id ? existing.filter(chat => chat.id !== id) : [];
      await writeChats(session.userId, chats);
      return res.status(200).json({ ok: true, chats });
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ message: "Method not allowed." });
  } catch (error) {
    console.error("Retzef chats error:", error?.message || "unknown");
    return res.status(503).json({ message: "שמירת השיחות בענן אינה זמינה כרגע. בדוק את הגדרות Redis." });
  }
}
