// api/tikka-anthropic.js
const MODEL = "claude-3-haiku-20240307"; // safe, widely available

const SYSTEM_PROMPT = `
You are Tikkurila UK's live-chat agent.

OUTPUT
- Return HTML only (<p>, <ul>, <li>, <b>, <a>).
- 1–2 short sentences max. If unclear, ask ONE short question only.
- If listing options, use a max 3-item <ul>. No long paragraphs.
- No filler like “Certainly”.

BEHAVIOUR
- If clear: give ONE best recommendation + a 1-line why.
- Link PDP/TDS/SDS if present in context.
- Stay within context; if missing, suggest WhatsApp or Help Centre.

RULES
- Ceilings → Anti-Reflex White [2].
- Bathrooms → Luja system: Universal Primer → Luja 7/20/40.
- Radiators → Helmi Primer → Helmi 10/30/80 or Everal Aqua 10/40/80.
`;

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS,GET");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    // simple health check
    return res.status(200).json({ ok: true, route: "tikka-anthropic", model: MODEL });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "missing_api_key" });
    }

    // Handle both parsed and raw JSON bodies
    const body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    const { question = "", contexts = [] } = body;

    const payload = {
      model: MODEL,
      max_tokens: 140,          // short & sleek
      temperature: 0.2,         // less wordy
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `Q: ${question}\n\nContext:\n${(contexts || []).join("\n---\n")}`
      }]
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
      // bubble up Anthropic’s error so you can see the real cause in the console
      return res.status(r.status).json({ error: "anthropic_error", detail: text });
    }

    const data = JSON.parse(text);
    const html = data?.content?.[0]?.text || "";
    return res.status(200).json({ text: html });
  } catch (e) {
    return res.status(500).json({ error: "internal", detail: String(e) });
  }
};
