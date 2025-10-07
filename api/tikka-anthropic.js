// api/tikka-anthropic.js  (CommonJS to avoid ESM warning)
module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS,GET");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") return res.status(200).json({ ok:true, route:"tikka-anthropic" });
  if (req.method !== "POST") return res.status(405).json({ error:"method_not_allowed" });

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error:"missing_api_key" });
    }

    // Body parsing (works whether Vercel parsed it or not)
    const body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    const { question = "", contexts = [] } = body;

    const payload = {
      model: "claude-3-5-sonnet-latest",
      max_tokens: 400,
      temperature: 0.2,
      system:
        "You are Tikkurila UK's paint assistant. Answer strictly from the provided context. " +
        "If not in context, advise WhatsApp or the Help Centre.",
      messages: [{ role: "user", content: `Q: ${question}\n\nContext:\n${(contexts||[]).join("\n---\n")}` }]
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

    const text = await r.text();
    if (!r.ok) {
      // return Anthropic’s real error so you can see why it failed
      return res.status(r.status).json({ error: "anthropic_error", detail: text });
    }

    const data = JSON.parse(text);
    return res.status(200).json({ text: data?.content?.[0]?.text || "" });
  } catch (e) {
    return res.status(500).json({ error: "internal", detail: String(e) });
  }
};
