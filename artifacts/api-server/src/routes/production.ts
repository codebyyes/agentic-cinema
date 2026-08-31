import { Router, type IRouter } from "express";
import {
  CreateProductionPackageBody,
  CreateProductionPackageResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const DEFAULT_MODEL = "gemini-3.6-flash";
const GEMINI_REQUEST_TIMEOUT_MS = 120_000;

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
  "dialogue": [
    {
      "character": "string",
      "parenthetical": "string",
      "line": "string"
    }
  ],
  "camera": "string",
  "lighting": "string",
  "music": "string",
  "scenes": [
    {
      "number": 1,
      "heading": "string",
      "description": "string",
      "visualBeat": "string",
      "soundBeat": "string",
      "shotType": "Close-up",
      "lens": "85mm",
      "movement": "Slow dolly in"
    }
  ]
}

Write a complete but focused short-film package. The script should include
action and scene headings. Return dialogue as an array of screenplay blocks:
each block must have a character name and a spoken line, with an optional
parenthetical direction. Keep each character name concise and uppercase-ready.
For every scene, specify a practical shot type such as close-up, medium shot,
wide shot, overhead, or POV; a lens focal length with the millimeter value
(for example 24mm, 35mm, 50mm, 85mm, or 135mm); and a camera movement. Every
movement must use one of these production types: Dolly, Handheld, Crane, or
Drone. You may add direction and speed, such as "Slow dolly in" or "Handheld
drift"; never use "Static" as the movement value. Camera, lighting, and music
should be concrete enough to guide a shoot. Include 3-6 scenes.
Do not use markdown fences around the JSON.`;

function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("Gemini did not return a JSON production package");
    }
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  }
}

function getGeminiApiKey(): string | undefined {
  const googleApiKey = process.env.GOOGLE_API_KEY?.trim();
  if (googleApiKey) return googleApiKey;

  const legacyApiKey = process.env.GEMINI_API_KEY?.trim();
  return legacyApiKey || undefined;
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

  const apiKey = getGeminiApiKey();
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
    let response: Response | undefined;
    let providerError = "";

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        GEMINI_REQUEST_TIMEOUT_MS,
      );

      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
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
      } finally {
        clearTimeout(timeout);
      }

      if (response.ok) break;

      providerError = await response.text();
      if (response.status !== 503 || attempt === 1) break;

      req.log.warn(
        { status: response.status, attempt: attempt + 1 },
        "Gemini temporarily unavailable; retrying once",
      );
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (!response?.ok) {
      req.log.error(
        { status: response?.status, providerError },
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