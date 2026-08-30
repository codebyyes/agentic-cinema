# Agentic Cinema

A small Python starter for the Agentic Cinema hackathon. It provides a reusable
Gemini client and a first cinematic scene-generation workflow that you can
extend into story planning, shot design, dialogue, or production coordination
agents.

## 1. Run it

The project uses the `GEMINI_API_KEY` Replit Secret. It is already configured
for this project, so you do not need to put the key in a file.

```bash
uv run agentic-cinema "A detective finds a forgotten reel in an abandoned Taipei cinema."
```

You can also run the module directly:

```bash
uv run python -m agentic_cinema "A silent astronaut receives a message from Earth."
```

## 2. Try the example

With no prompt, the CLI uses a built-in cinematic prompt:

```bash
uv run agentic-cinema
```

The hackathon originally requested `gemini-1.5-pro`. Google currently reports
that model as unavailable for this API account, and also restricts
`gemini-2.5-pro` for new users, so the starter defaults to the supported
`gemini-3.1-pro-preview`. Override it without changing code if your account
exposes another model:

```bash
GEMINI_MODEL=gemini-3.1-pro-preview uv run agentic-cinema "Write a tense opening scene."
```

## Project layout

```text
agentic-cinema/
├── src/agentic_cinema/
│   ├── cli.py       # Command-line entry point
│   ├── gemini.py    # Gemini client wrapper
│   ├── prompts.py   # Reusable cinematic prompt templates
│   └── scene.py     # Scene-generation workflow
├── .env.example     # Optional local-environment reference
└── pyproject.toml   # Python package and dependencies
```

## Extending it

The `GeminiClient` wrapper keeps API-specific code in one place. Add new
workflows beside `scene.py` and reuse `client.generate_text(...)` for each
agent step. For a multi-agent system, keep each agent's system instruction
explicit and pass outputs between agents as regular Python values.

## Notes

- Never commit `GEMINI_API_KEY`; use Replit Secrets or another secure environment
  variable store.
- The Google Gen AI SDK is used directly so the requested Gemini 1.5 Pro model
  can be selected explicitly.
- If Google no longer serves `gemini-1.5-pro` for your account, set
  `GEMINI_MODEL` to an available model.