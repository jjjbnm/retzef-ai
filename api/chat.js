// Vercel serverless endpoint. The independent Retzef model is not connected yet.
// This endpoint deliberately does not fabricate AI responses.
export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const message = req.body && typeof req.body.message === "string" ? req.body.message.trim() : "";
  if (!message) return res.status(400).json({ error: "Message is required" });
  return res.status(503).json({
    status: "model_not_connected",
    message: "Retzef AI is online as an interface, but Retzef test 1.0 is not connected yet."
  });
}
