export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing OPENROUTER_API_KEY." });
  }

  const model = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";
  const referer = process.env.OPENROUTER_SITE_URL || "https://" + (req.headers.host || "");
  const appTitle = process.env.OPENROUTER_APP_NAME || "Sora Prompt Playground";

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  } catch {
    return res.status(400).json({ error: "Invalid JSON body." });
  }

  const { character, setting, dialogue } = body;
  if (!character || !setting || !dialogue) {
    return res.status(400).json({ error: "character, setting, and dialogue fields are required." });
  }

  const systemPrompt = `You are a senior creative director helping teams write Sora video prompts.
Return a single block of text that Sora can consume directly.
Use concise sentences, include camera language, lighting, palette, motion, audio cues, and export details (frame rate, aspect, style).
Keep it under 200 words. Do not wrap the answer in markdown.`;

  const userPrompt = `Craft a Sora-ready prompt using the following creative brief.

Main character or subject:
${character}

Setting and environment:
${setting}

Signature line, dialogue beat, or key story moment:
${dialogue}

Make the prompt playful yet production-ready.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": referer,
        "X-Title": appTitle,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 550,
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.text().catch(() => "");
      return res.status(response.status).json({
        error: "OpenRouter request failed",
        details: errorPayload,
      });
    }

    const data = await response.json();
    const choice = data?.choices?.[0];
    const content = choice?.message?.content;

    if (!content) {
      return res.status(502).json({ error: "No content returned from OpenRouter." });
    }

    const text = Array.isArray(content)
      ? content.map((fragment) => (typeof fragment === "string" ? fragment : fragment?.text || "")).join("").trim()
      : String(content).trim();

    return res.status(200).json({ prompt: text });
  } catch (err) {
    return res.status(500).json({ error: "Failed to generate prompt.", details: err?.message || String(err) });
  }
}
