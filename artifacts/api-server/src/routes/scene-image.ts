import { GoogleGenAI } from "@google/genai";
import { Router, type IRouter } from "express";
import {
  CreateSceneImageBody,
  CreateSceneImageResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image";
const IMAGE_REQUEST_TIMEOUT_MS = 120_000;
const TRANSIENT_RETRY_DELAY_MS = 500;

function getImageClient(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_API_KEY or GEMINI_API_KEY is required for scene image generation.",
    );
  }
  return new GoogleGenAI({ apiKey });
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const status = Reflect.get(error, "status");
  if (typeof status === "number") return status;
  const code = Reflect.get(error, "code");
  return typeof code === "number" ? code : undefined;
}

function buildSceneImagePrompt(input: {
  visualBeat: string;
  shotType: string;
  lens: string;
}): string {
  return [
    "Create a cinematic film still for a live-action short film.",
    `Framing and camera: ${input.shotType}, photographed with a ${input.lens} lens.`,
    `Scene direction and emotional context: ${input.visualBeat}`,
    "Treat the emotional core, character continuity, environment continuity, camera direction, and lighting direction as hard constraints established by the film package. Preserve the specified visual grammar, color palette, saturation, contrast, and light-source logic. Do not invent an opposing mood, change character identities, remove stated weather or setting details, or default to generic photorealism when the package specifies a stylized look.",
    "Use emotionally specific composition, coherent production design, and a cinematic finish while following the supplied style direction exactly.",
    "No text, captions, subtitles, borders, watermarks, logos, or interface elements.",
  ].join("\n");
}

function getImagePart(response: Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>) {
  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.inlineData?.data) return part.inlineData;
    }
  }
  return undefined;
}

async function generateSceneImage(
  prompt: string,
  model: string,
) {
  const imageClient = getImageClient();
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await Promise.race([
        imageClient.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseModalities: ["IMAGE"],
            imageConfig: {
              aspectRatio: "16:9",
              imageSize: "1K",
            },
          },
        }),
        new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error("Scene image request timed out.")),
            IMAGE_REQUEST_TIMEOUT_MS,
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
    : new Error("Gemini did not return a scene image.");
}

router.post("/scene-image", async (req, res): Promise<void> => {
  const parsedBody = CreateSceneImageBody.safeParse(req.body);
  if (!parsedBody.success) {
    req.log.warn(
      { errors: parsedBody.error.flatten() },
      "Invalid scene image request",
    );
    res.status(400).json({ error: "This scene is missing visual camera direction." });
    return;
  }

  const model = (process.env.GEMINI_IMAGE_MODEL ?? DEFAULT_IMAGE_MODEL).replace(
    /^models\//,
    "",
  );

  try {
    const response = await generateSceneImage(
      buildSceneImagePrompt(parsedBody.data),
      model,
    );
    const image = getImagePart(response);

    if (!image?.data) {
      req.log.error(
        {
          model,
          finishReasons: response.candidates?.map((candidate) => candidate.finishReason),
        },
        "Gemini returned no scene image",
      );
      res.status(502).json({
        error:
          "Gemini did not return an image for this scene. The prompt may have been blocked by a safety filter.",
      });
      return;
    }

    const sceneImage = CreateSceneImageResponse.parse({
      imageData: image.data,
      mimeType: image.mimeType ?? "image/png",
      model,
    });
    res.json(sceneImage);
  } catch (error) {
    const providerStatus = getErrorStatus(error);
    const providerMessage =
      error instanceof Error ? error.message : String(error);
    req.log.error(
      { err: error, status: providerStatus, model },
      "Could not generate scene image",
    );

    if (
      providerStatus === 429 ||
      /credits|quota|resource_exhausted|rate limit/i.test(providerMessage)
    ) {
      res.status(503).json({
        error:
          "Scene image generation is temporarily unavailable because the Google AI quota or billing limit has been reached.",
      });
      return;
    }

    if (providerStatus === 404) {
      res.status(502).json({
        error: `The configured image model (${model}) is not available for this Google AI project.`,
      });
      return;
    }

    if (providerStatus === 503) {
      res.status(503).json({
        error: "Scene image generation is temporarily unavailable. Please retry this scene.",
      });
      return;
    }

    if (/GOOGLE_API_KEY|GEMINI_API_KEY/.test(providerMessage)) {
      res.status(503).json({
        error: "Scene image generation is not configured on the server.",
      });
      return;
    }

    res.status(502).json({
      error: "This scene image could not be generated.",
    });
  }
});

export default router;