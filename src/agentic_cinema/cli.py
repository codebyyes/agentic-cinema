"""Command-line interface for the Agentic Cinema starter."""

from __future__ import annotations

import argparse
import sys

from .gemini import GeminiConfigurationError, GeminiResponseError
from .prompts import DEFAULT_SCENE_PROMPT
from .scene import generate_scene


def build_parser() -> argparse.ArgumentParser:
    """Create the CLI argument parser."""

    parser = argparse.ArgumentParser(
        prog="agentic-cinema",
        description="Generate a cinematic scene with Gemini.",
    )
    parser.add_argument(
        "idea",
        nargs="?",
        default=DEFAULT_SCENE_PROMPT,
        help="A short premise or scene idea.",
    )
    return parser


def main() -> None:
    """Run the scene-generation command."""

    args = build_parser().parse_args()
    try:
        scene = generate_scene(args.idea)
    except (GeminiConfigurationError, GeminiResponseError) as error:
        print(f"Error: {error}", file=sys.stderr)
        raise SystemExit(1) from error
    except Exception as error:
        print(f"Gemini request failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error

    print(scene)