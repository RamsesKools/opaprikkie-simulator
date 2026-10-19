"""Dump the backend's OpenAPI schema to frontend/openapi.json."""

import json
import sys
from pathlib import Path

from opaprikkie.backend.app import create_app
from opaprikkie.backend.settings import Settings

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    schema = create_app(Settings()).openapi()
    (ROOT / "frontend" / "openapi.json").write_text(json.dumps(schema, indent=2) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
