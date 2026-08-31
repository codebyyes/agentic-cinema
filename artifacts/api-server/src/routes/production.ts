import { Router, type IRouter } from "express";
import {
  CreateProductionPackageBody,
  CreateProductionPackageResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const DEFAULT_MODEL = "gemini-3.6-flash";

const PRODUCTION_SYSTEM_PROMPT = `You are the creative director of Agentic Cinema.
Transform the user's feelings, memory, or story idea into a complete film
production package. Make it emotionally specific, cinematic, and practical for
a small production team.

Return ONLY valid JSON with exactly these keys:
{
  "title": "string",
  "logline": "string",
  "emotionalCore": "string",
  "script": "string",
  "dialogue": "string",
  "camera": "string",
  "lighting": "string",
  "music": "string",
  "scenes": [
    {
      "number": 1,
      "heading": "string",
      "description": "string",
      "visualBeat": "string",
      "soundBeat": "string"
    }
  ]
}

Write a complete but focused short-film package. The script should include
action and scene headings. Dialogue should identify speakers. Camera, lighting,
and music should be concrete enough to guide a shoot. Include 3-6 scenes.
Do not use markdown fences around the JSON.`;

function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  return JSON.parse(cleaned);
}

router.post("/production-package", async (req, res): Promise<void> => {
  const parsedBody = CreateProductionPackageBody.safeParse(req.body);
  if (!parsedBody.success) {
    req.log.warn(
      { errors: parsedBody.error.flatten() },
      "Invalid production package request",
    );
    res.status(400).json({ error: "Please share a story or feeling to begin." });
    return;
  }

  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    req.log.error("Gemini API key is not configured");
    res.status(502).json({ error: "Gemini is not configured yet." });
    return;
  }

  const model = (process.env.GEMINI_MODEL ?? DEFAULT_MODEL).replace(
    /^models\//,
    "",
  );
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: PRODUCTION_SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: parsedBody.data.story }],
          },
        ],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const providerError = await response.text();
      req.log.error(
        { status: response.status, providerError },
        "Gemini generation failed",
      );
      res
        .status(502)
        .json({ error: "Gemini could not generate the production package." });
      return;
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const generatedText = payload.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      req.log.error("Gemini returned no generated text");
      res.status(502).json({ error: "Gemini returned an empty production package." });
      return;
    }

    const productionPackage = CreateProductionPackageResponse.parse(
      extractJson(generatedText),
    );
    res.json(productionPackage);
  } catch (error) {
    req.log.error({ err: error }, "Could not parse Gemini production package");
    res
      .status(502)
      .json({ error: "The production package could not be prepared." });
  }
});

export default router;