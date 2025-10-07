export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") return res.status(200).json({ ok: true, route: "tikka-anthropic" });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { question, contexts = [] } = req.body || {};
    const payload = {
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 400,
      temperature: 0.2,
      system: "You are Tikkurila UK's paint assistant. Answer strictly using the provided context. If not in context, advise WhatsApp or the Help Centre.",
      messages: [{ role: "user", content: `Q: ${question}\n\nContext:\n${contexts.join("\n---\n")}` }]
    };

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json();
    return res.status(r.ok ? 200 : 500).json({ text: data?.content?.[0]?.text || "No answer." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
