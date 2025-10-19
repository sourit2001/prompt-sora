export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.REPLICATE_API_TOKEN;
  
  if (!apiKey) {
    return res.status(500).json({ error: "Missing REPLICATE_API_TOKEN. Please configure it in Vercel environment variables." });
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
    // Use Replicate API directly with fetch for better Vercel compatibility
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "openai/gpt-5",
        input: {
          prompt: `${systemPrompt}\n\n${userPrompt}`,
          max_tokens: 550,
          temperature: 0.7,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: "Replicate API request failed", 
        details: errorText,
        status: response.status
      });
    }

    const prediction = await response.json();
    
    // Poll for completion
    let result = prediction;
    while (result.status === "starting" || result.status === "processing") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const pollResponse = await fetch(result.urls.get, {
        headers: {
          "Authorization": `Token ${apiKey}`,
        }
      });
      result = await pollResponse.json();
    }

    if (result.status === "failed") {
      return res.status(500).json({ error: "Replicate prediction failed", details: result.error });
    }

    const output = result.output;
    const text = Array.isArray(output) ? output.join("") : String(output || "");

    if (!text) {
      return res.status(502).json({ error: "No content returned from Replicate." });
    }

    return res.status(200).json({ prompt: text.trim() });
  } catch (err) {
    return res.status(500).json({ 
      error: "Failed to generate prompt.", 
      details: err?.message || String(err),
      stack: err?.stack
    });
  }
}
