// Vercel serverless function: the browser never sees the API key.
const SYSTEM = "You are PathFinder, a friendly career counsellor for Indian students from Class 10 to college. Give practical guidance on careers, courses, entrance exams, skills and roadmaps in under 150 words. Do not promise jobs or salaries; tell students to verify exam details on official websites. If a question is unrelated to careers or education, politely steer back.";

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const { messages } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: "No messages" });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "API key not configured" });
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const contents = messages.slice(-10).map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.content).slice(0, 500) }],
  }));
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents }),
    });
    const d = await r.json();
    if (!r.ok) return res.status(502).json({ error: d.error?.message || "AI service error" });
    const reply = (d.candidates?.[0]?.content?.parts || []).map(p => p.text).join("");
    if (!reply) return res.status(502).json({ error: "Empty AI response" });
    res.status(200).json({ reply });
  } catch (e) {
    res.status(500).json({ error: "Could not reach AI service" });
  }
};
