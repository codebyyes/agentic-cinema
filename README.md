# Agentic Cinema

> Submitted to the **Agentic Cinema: The Blockbuster Hackathon** (Google Cloud × Replit track) as **SPARK Cinema**.

**Tell us the story. We'll direct the film.**

Agentic Cinema turns a single human spark — a memory, a feeling, an unresolved moment — into a complete, shootable film production package. Instead of asking users to speak the language of cameras and lighting, it lets them speak naturally, and uses Google's Gemini models to translate that story into cinematic language: a script, a scene-by-scene shot list, and a generated image for every scene.

**Live app:** https://agentic-cinema--yes7707.replit.app

---

## What It Does

Given a short, plain-language description of a story or feeling, Agentic Cinema generates:

- A title, logline, and emotional core
- A full script with dialogue
- A dynamically-sized scene breakdown (3–6 scenes, determined by Gemini based on the story's own complexity — not hardcoded)
- For each scene: shot type, lens, camera movement, lighting direction, and sound design
- A corresponding AI-generated image for every scene, grounded in that scene's specific shot type, lens, and visual description

The number of scenes and the content of each one is entirely determined by Gemini's interpretation of the input story — the application does not impose a fixed structure.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Backend | Node.js API server |
| AI / narrative + scene reasoning | Google Gemini API |
| AI / scene image generation | Google Gemini image model (`gemini-3.1-flash-image`) |
| Development | Built end-to-end with **Replit Agent** |
| Hosting / deployment | **Replit** (`replit.app` domain) |

Both the Gemini API and Replit are called and used directly at runtime — the narrative/scene generation and every scene image are produced by live Gemini API calls from the app's backend, and the app is developed, hosted, and deployed entirely on Replit.

## Architecture

1. User submits a short story/feeling via the input form.
2. The backend sends the input to Gemini, which returns a structured production package (title, logline, emotional core, script, and a `scenes[]` array with `shotType`, `lens`, `movement`, `visualBeat`, `soundBeat` for each scene).
3. The frontend renders one `SceneCard` per item in `scenes[]`.
4. Each `SceneCard` independently calls `/api/scene-image`, which sends that scene's `shotType`, `lens`, and `visualBeat` to Gemini's image model and returns a generated image.
5. Each scene card handles its own loading, success, and error/retry state — a failed image generation on one scene never blocks or breaks the rest of the production package.

## Running Locally

This is a monorepo (managed with `pnpm`). The full app requires two services running at once — the frontend and the API server — each in its own terminal:

```bash
git clone https://github.com/codebyyes/agentic-cinema.git
cd agentic-cinema
pnpm install
```

**Terminal 1 — Frontend:**
```bash
pnpm --filter @workspace/agentic-cinema run dev
```

**Terminal 2 — API Server:**
```bash
pnpm --filter @workspace/api-server run dev
```

Other useful root-level commands:

```bash
pnpm run build       # production build
pnpm run typecheck   # type checking
```

## Environment Variables

Create a `.env` file (or set the equivalent in Replit Secrets) with:

| Variable | Description |
|---|---|
| `GOOGLE_API_KEY` | A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey), with a Prepay/billing balance enabled for image generation |
| `GEMINI_IMAGE_MODEL` | (optional) Overrides the default image model used for scene generation |

The API key is used server-side only and is never exposed to the frontend or included in any client response.

## Hackathon Submission

- **Track:** Replit
- **Built with:** Replit Agent (development), Replit (hosting/deployment)
- **AI:** Google Gemini API (Google Cloud AI tools)
- **Live project:** https://agentic-cinema--yes7707.replit.app
- **Demo video:** _(add link once uploaded)_

## License

This project is licensed under the [MIT License](./LICENSE).