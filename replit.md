# Agentic Cinema

A Python starter for building cinematic agent workflows with the Google Gemini
API.

## Run

 - `uv run agentic-cinema` — generate the built-in example scene
 - `uv run agentic-cinema "Your scene idea"` — generate a scene from a prompt
 - `uv run python -m compileall -q src` — compile-check the Python package

Required secret: `GEMINI_API_KEY`.
Optional environment variable: `GEMINI_MODEL` (defaults to `gemini-1.5-flash`).

## Stack

- Python 3.11+
- Google Gen AI Python SDK
- `uv` for dependency and environment management

## Where things live

- `src/agentic_cinema/gemini.py` — reusable Gemini client wrapper
- `src/agentic_cinema/scene.py` — cinematic scene-generation workflow
- `src/agentic_cinema/prompts.py` — cinematic system prompt and default premise
- `src/agentic_cinema/cli.py` — command-line entry point
- `README.md` — setup and extension guide

## Architecture decisions

- Credentials are read from environment variables at request time and never
  stored in source code.
- The model is configurable through `GEMINI_MODEL` so hackathon experiments do
  not require code changes.
- Google’s official `google-genai` client is used directly for Python support.

## Product

The starter turns a short premise into a production-ready cinematic scene with
story beats, dialogue, camera direction, lighting, and sound notes.

## User preferences

- Keep the requested model name `gemini-1.5-flash` as the default for now.

## Gotchas

- The configured API account currently returns `404` for
  `gemini-1.5-flash`. The code preserves that requested model name and exposes
  `GEMINI_MODEL` for switching only when the user chooses an available model.

## Pointers

- See `README.md` for the first run and extension examples.
