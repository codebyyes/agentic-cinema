"""Scene-generation workflow for the first Agentic Cinema prototype."""

from .gemini import GeminiClient
from .prompts import SCENE_DIRECTOR_SYSTEM_PROMPT


def generate_scene(
    idea: str,
    *,
    client: GeminiClient | None = None,
) -> str:
    """Turn a short idea into a production-ready cinematic scene."""

    gemini = client or GeminiClient.from_environment()
    return gemini.generate_text(
        idea,
        system_instruction=SCENE_DIRECTOR_SYSTEM_PROMPT,
    )