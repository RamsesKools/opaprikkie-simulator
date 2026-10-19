"""Check or bump the app version in pyproject.toml and frontend/package.json together."""

import json
import subprocess
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PARTS = ("major", "minor", "patch")


def versions(root: Path) -> tuple[str, str]:
    python = tomllib.loads((root / "pyproject.toml").read_text())["project"]["version"]
    frontend = json.loads((root / "frontend" / "package.json").read_text())["version"]
    return python, frontend


def check(root: Path) -> int:
    python, frontend = versions(root)
    if python == frontend:
        return 0
    print(f"Version mismatch: pyproject.toml has {python}, frontend/package.json has {frontend}.")
    return 1


def bump(root: Path, part: str) -> None:
    subprocess.run(["uv", "version", "--bump", part], cwd=root, check=True)
    version, _ = versions(root)
    subprocess.run(
        ["npm", "version", version, "--no-git-tag-version", "--allow-same-version"],
        cwd=root / "frontend",
        check=True,
    )


def main(args: list[str]) -> int:
    match args:
        case ["check"]:
            return check(ROOT)
        case ["bump", part] if part in PARTS:
            bump(ROOT, part)
            return 0
        case _:
            print(f"Usage: version.py check | bump {{{','.join(PARTS)}}}", file=sys.stderr)
            return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
