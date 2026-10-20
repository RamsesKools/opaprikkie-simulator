"""Dump the backend's OpenAPI schema to frontend/openapi.json and its types to api.d.ts."""

import json
import subprocess
import sys
from pathlib import Path

from opaprikkie.backend.app import create_app
from opaprikkie.backend.settings import Settings

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    frontend = ROOT / "frontend"
    tool = frontend / "tools" / "api_types"
    schema = frontend / "openapi.json"
    schema.write_text(json.dumps(create_app(Settings()).openapi(), indent=2) + "\n")
    npm = ["npm", "--prefix", str(tool)]
    subprocess.run([*npm, "ci", "--prefer-offline", "--no-audit", "--no-fund"], check=True)
    output = frontend / "src" / "lib" / "api.d.ts"
    subprocess.run(
        [*npm, "exec", "--", "openapi-typescript", str(schema), "-o", str(output)], check=True
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
