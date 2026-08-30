"""Small, reusable wrapper around the Google Gen AI Python SDK."""

from __future__ import annotations

import os
from dataclasses import dataclass

from google import genai
from google.genai import types


class GeminiConfigurationError(RuntimeError):
    """Raised when the Gemini client cannot be configured."""


class GeminiResponseError(RuntimeError):
    """Raised when Gemini returns no usable text."""


@dataclass(slots=True)
class GeminiClient:
    """Generate text with a configured Gemini model.

    The API key is read at call time from the environment so this class never
    stores credentials in source code or in the repository. GOOGLE_API_KEY is
    preferred, with GEMINI_API_KEY retained as a compatibility fallback.
    """

    # Keep the model configurable so the hackathon can switch models without
    # changing application code. The full resource name is intentional.
    model: str = "models/gemini-1.5-flash"

    def __post_init__(self) -> None:
        """Ensure requests use Google's fully qualified model resource name."""

        if not self.model.startswith("models/"):
            self.model = f"models/{self.model}"

    @classmethod
    def from_environment(cls) -> "GeminiClient":
        """Build a client using project environment variables."""

        return cls(model=os.getenv("GEMINI_MODEL", "models/gemini-1.5-flash"))

    def generate_text(
        self,
        prompt: str,
        *,
        system_instruction: str | None = None,
        temperature: float = 0.8,
    ) -> str:
        """Send one prompt to Gemini and return the generated text."""

        api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise GeminiConfigurationError(
                "GOOGLE_API_KEY is missing. Add it as a Replit Secret or "
                "environment variable before running the project."
            )

        client = genai.Client(api_key=api_key)
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=temperature,
            max_output_tokens=8192,
        )
        response = client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=config,
        )
        text = response.text
        if not text:
            raise GeminiResponseError("Gemini returned an empty response.")
        return text.strip()