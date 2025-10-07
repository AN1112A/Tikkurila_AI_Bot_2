export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, route: "tikka-anthropic" });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { question, contexts = [] } = await req.json?.() || req.body;

    const MODEL = "claude-3-haiku-20240307"; // pick your model

    const SYSTEM_PROMPT = `
You are Tikkurila UK's paint support agent on live chat.

STYLE & FORMAT
- Keep replies short and friendly (40–90 words).
- Use UK English.
- Return HTML only (<p>, <ul>, <li>, <b>, <a>).
- Prefer one clear recommendation; add a brief why.
- Progressive disclosure: never dump everything at once.

INTERACTION RULES
- If the user’s request is unclear, ask ONE targeted question first.
- If clear, give the best option + 1 alternative max.
- Link to product PDP/TDS/SDS when present in context.
- If context is missing, say so and offer WhatsApp or Help Centre.
- Stay within provided context (don’t invent specs).

DOMAIN RULES (apply when relevant)
- Ceilings → Anti-Reflex White [2] (dead-matt, non-flashing).
- Bathrooms → Luja system (Luja Universal Primer + Luja 7/20/40).
- Radiators → Helmi Primer, then Helmi 10/30/80 or Everal Aqua 10/40/80.
`;

    const payload = {
      model: MODEL,
      max_tokens: 280,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Q: ${question}\n\nContext:\n${contexts.join("\n---\n")}`
        }
      ]
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
    const answer = data?.content?.[0]?.text || "No answer.";
    res.status(r.ok ? 200 : r.status).json({ text: answer });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

