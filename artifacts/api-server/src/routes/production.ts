import { Router, type IRouter } from "express";
import {
  CreateProductionPackageBody,
  CreateProductionPackageResponse,
} from "@workspace/api-zod";
import { ai } from "@workspace/integrations-gemini-ai";

const router: IRouter = Router();

const DEFAULT_MODEL = "gemini-3-flash-preview";
const GEMINI_REQUEST_TIMEOUT_MS = 120_000;
const TRANSIENT_RETRY_DELAY_MS = 500;

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

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const status = Reflect.get(error, "status");
  return typeof status === "number" ? status : undefined;
}

function getProviderError(status: number | undefined, message: string): string {
  if (
    status === 429 &&
    /credits|quota|resource_exhausted|rate limit/i.test(message)
  ) {
    return "Gemini is temporarily unavailable because the AI usage limit has been reached. Please try again later.";
  }

  if (status === 503) {
    return "Gemini is temporarily unavailable. Please try again in a moment.";
  }

  return "Gemini could not generate the production package.";
}

async function generateProductionPackage(story: string, model: string) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await Promise.race([
        ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: story }] }],
          config: {
            systemInstruction: PRODUCTION_SYSTEM_PROMPT,
            temperature: 0.8,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
        new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error("Gemini request timed out.")),
            GEMINI_REQUEST_TIMEOUT_MS,
          );
        }),
      ]);
    } catch (error) {
      lastError = error;
      if (getErrorStatus(error) !== 503 || attempt === 1) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, TRANSIENT_RETRY_DELAY_MS),
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Gemini did not return a response.");
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

  const model = (process.env.GEMINI_MODEL ?? DEFAULT_MODEL).replace(
    /^models\//,
    "",
  );

  try {
    const response = await generateProductionPackage(parsedBody.data.story, model);
    const generatedText = response.text;

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
    const providerStatus = getErrorStatus(error);
    const providerMessage =
      error instanceof Error ? error.message : String(error);
    req.log.error(
      { err: error, status: providerStatus },
      "Could not prepare Gemini production package",
    );
    if (providerStatus === 429 || providerStatus === 503) {
      res
        .status(503)
        .json({ error: getProviderError(providerStatus, providerMessage) });
      return;
    }
    res
      .status(502)
      .json({ error: "The production package could not be prepared." });
  }
});

export default router;