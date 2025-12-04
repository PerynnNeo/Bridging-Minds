// api/rewrite.js
import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { transcript, systemPrompt } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: "Transcript is required" });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Rewrite this unclear message into one complete autism-friendly sentence: "${transcript}"` 
        },
      ],
      temperature: 0.3,
      max_tokens: 150,
    });

    const text = completion.choices[0].message.content.trim();

    return res.status(200).json({ rewrite: text });

  } catch (err) {
    console.error("Rewrite API error:", err);
    return res.status(500).json({
      error: err?.response?.data || err.message,
    });
  }
}
