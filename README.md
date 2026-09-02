# Agentic Cinema

> Submitted to the **Agentic Cinema: The Blockbuster Hackathon** (Google Cloud × Replit track) as **SPARK Cinema**.

**Tell us the story. We'll direct the film.**

Agentic Cinema turns one human spark — a memory, a feeling, or an unresolved
moment — into a cinematic production package. A plain-language story becomes a
script, scene map, camera plan, sound direction, and a visual reference for
each scene.

**Live app:** https://agentic-cinema--yes7707.replit.app

---

## What It Does

The web app accepts one story or feeling of at least 10 characters (up to
12,000 characters) and generates:

- A title, logline, and emotional core
- A focused screenplay with action, scene headings, and dialogue blocks
- Camera, lighting, and music direction for the overall package
- A 3–6 card scene map, with the scene count chosen by Gemini
- For every scene: a heading, description, shot type, lens, camera movement,
  visual beat, and sound beat
- A 16:9 AI-generated visual reference for every scene

The server checks that scene headings match locations written in the script and
preserves explicit dialogue parentheticals as performance cues in the related
visual beats. Each scene image has its own loading, error, and retry state.
The scene card also shows the exact combined image prompt and provides a
clipboard copy action.

This is a single-user, in-browser generation session. The app does not provide
an editor for changing generated packages, saved package history, user
accounts, or multi-user collaboration.

## Tech Stack

| Layer | Technology |
|---|---|
| Web frontend | React, TypeScript, Vite, Wouter, TanStack Query |
| API server | Node.js, Express 5, TypeScript |
| API contracts | OpenAPI-generated Zod schemas and React API client |
| Narrative package generation | Replit-managed Gemini integration via `@google/genai` |
| Scene image generation | Google Gen AI SDK (`@google/genai`) and `gemini-3.1-flash-image` |
| Python workflow | Python 3.11+, official `google-genai` SDK, installable CLI |
| Workspace | pnpm monorepo |
| Hosting / deployment | Replit (`replit.app` domain) |

The web app uses two server-side Gemini paths:

- `/api/production-package` uses the Replit-managed Gemini integration and
  defaults to `gemini-3-flash-preview`.
- `/api/scene-image` uses the Google Gen AI SDK and defaults to
  `gemini-3.1-flash-image`, returning a 1K 16:9 image. It does not silently
  fall back to another image model.

## Architecture

1. The user submits a story or feeling through the React input form.
2. The API sends the story to Gemini and parses the structured JSON response
   into the production package.
3. The API reconciles scene headings against the headings found in the script,
   then returns the package to the frontend.
4. The frontend renders one `SceneCard` for each item in `scenes[]`.
5. Each `SceneCard` calls `/api/scene-image` with its shot type, lens, visual
   beat, emotional core, character continuity, environment continuity, camera
   direction, and lighting direction.
6. The frontend renders the returned image, or an individual loading/error
   state when that scene's image request is still running or needs a retry.

## Running Locally

This is a pnpm monorepo. The web app requires the frontend and API server to
run at the same time, each in its own terminal:

```bash
git clone https://github.com/codebyyes/agentic-cinema.git
cd agentic-cinema
pnpm install
```

**Terminal 1 — frontend:**

```bash
pnpm --filter @workspace/agentic-cinema run dev
```

**Terminal 2 — API server:**

```bash
pnpm --filter @workspace/api-server run dev
```

Useful root-level commands:

```bash
pnpm run build       # typecheck and build all workspace packages
pnpm run typecheck   # typecheck libraries and workspace artifacts
```

### Python scene CLI

The repository also contains a small Python scene-generation workflow using the
official `google-genai` SDK:

```bash
python -m pip install -e .
agentic-cinema "A forgotten film reel begins projecting tomorrow's news inside an abandoned neighborhood cinema just before dawn."
```

If no idea is supplied, the CLI uses the default premise in
`src/agentic_cinema/prompts.py` and prints the generated scene text.

## Environment Variables

Set these values in Replit Secrets or in the environment used to run the
services. Credentials are read server-side and are never exposed to the
frontend.

### Web production package

| Variable | Required | Description |
|---|---:|---|
| `AI_INTEGRATIONS_GEMINI_BASE_URL` | Yes | Base URL provisioned by the Replit-managed Gemini integration |
| `AI_INTEGRATIONS_GEMINI_API_KEY` | Yes | Key provisioned by the Replit-managed Gemini integration |
| `GEMINI_MODEL` | No | Overrides the production package model; default: `gemini-3-flash-preview` |

### Scene images

| Variable | Required | Description |
|---|---:|---|
| `GOOGLE_API_KEY` | Yes* | Google AI Studio key used for scene image generation |
| `GEMINI_API_KEY` | Yes* | Compatibility fallback when `GOOGLE_API_KEY` is not set |
| `GEMINI_IMAGE_MODEL` | No | Overrides the image model; default: `gemini-3.1-flash-image` |

`GOOGLE_API_KEY` takes precedence over `GEMINI_API_KEY`. Image generation may
require an enabled Google AI project with available quota or billing.

### Python CLI

The Python CLI uses the same key precedence:

1. `GOOGLE_API_KEY`
2. `GEMINI_API_KEY`

Its optional `GEMINI_MODEL` override defaults to `gemini-2.0-flash`.

## Hackathon Submission

- **Track:** Replit
- **Built with:** Replit Agent and Replit
- **AI:** Google Gemini API
- **Live project:** https://agentic-cinema--yes7707.replit.app
- **Demo video:** _(add link once uploaded)_

## License

This project is licensed under the [MIT License](./LICENSE).