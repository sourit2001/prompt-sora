import Replicate from "replicate";

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing REPLICATE_API_TOKEN." });
  }

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  } catch {
    return res.status(400).json({ error: "Invalid JSON body." });
  }

  const { character, setting, dialogue, duration } = body;
  if (!character || !setting || !dialogue || !duration) {
    return res.status(400).json({ error: "character, setting, dialogue, and duration fields are required." });
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

Video duration:
${duration} seconds

Make the prompt playful yet production-ready. Ensure the pacing and action fit within the ${duration}-second duration.`;

  try {
    const replicate = new Replicate({
      auth: apiKey,
    });

    console.log("Calling Replicate API with model: openai/gpt-5");
    
    const output = await replicate.run(
      "openai/gpt-5",
      {
        input: {
          prompt: `${systemPrompt}\n\n${userPrompt}`,
          max_tokens: 550,
          temperature: 0.7,
        }
      }
    );

    console.log("Replicate API response received:", typeof output);

    // Replicate returns output as a string or array of strings
    let text = "";
    if (Array.isArray(output)) {
      text = output.join("");
    } else if (typeof output === "string") {
      text = output;
    } else if (output && typeof output === "object") {
      // Sometimes output might be an object with text property
      text = output.text || output.output || JSON.stringify(output);
    }

    if (!text || text.trim().length === 0) {
      console.error("Empty response from Replicate");
      return res.status(502).json({ 
        error: "No content returned from Replicate.",
        debug: { outputType: typeof output, output: output }
      });
    }

    return res.status(200).json({ prompt: text.trim() });
  } catch (err) {
    console.error("Replicate API error:", err);
    return res.status(500).json({ 
      error: "Failed to generate prompt.", 
      details: err?.message || String(err),
      stack: err?.stack
    });
  }
}
