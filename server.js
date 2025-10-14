import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static("."));

app.post("/api/prompts/generate", async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing OPENROUTER_API_KEY." });
  }

  const model = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";
  const { character, setting, dialogue } = req.body || {};

  if (!character || !setting || !dialogue) {
    return res.status(400).json({ error: "character, setting, and dialogue fields are required." });
  }

  const referer = process.env.OPENROUTER_SITE_URL || "http://localhost:3000";
  const appTitle = process.env.OPENROUTER_APP_NAME || "Sora Prompt Playground";

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
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 550
      })
    });

    if (!response.ok) {
      const errorPayload = await response.text();
      return res.status(response.status).json({
        error: "OpenRouter request failed",
        details: errorPayload
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
      : content.trim();

    return res.json({ prompt: text });
  } catch (error) {
    console.error("OpenRouter error:", error);
    return res.status(500).json({ error: "Failed to generate prompt.", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Sora Prompt Playground server listening on http://localhost:${PORT}`);
});
