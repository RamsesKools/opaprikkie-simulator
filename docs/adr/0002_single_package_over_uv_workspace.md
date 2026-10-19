---
status: accepted
---

# One Python package instead of a uv workspace

The Python code is one distribution, `opaprikkie`, with `engine`, `backend`, and `sim` subpackages under `src/opaprikkie/`, and one version.
`import-linter` contracts enforce the module boundaries.
We chose it in [#7](https://github.com/RamsesKools/opaprikkie-simulator/issues/7), replacing the earlier plan of separate uv workspace members.

## Considered options

- **One package with subpackages** (chosen): everything ships in one container from one repo with one version, so separate distributions only add `pyproject.toml` files, inter-member sources, and version bookkeeping.
- **uv workspace members** (`engine`, `backend`, `sim` as separate projects): explicit per-member dependencies, but a workspace installs every member into one shared `.venv`, so the engine could still import FastAPI during development without anything failing.
  Boundaries would need an import linter anyway.
- **Several top-level packages in one distribution** (`opaprikkie_engine/` and so on at the root): keeps a folder per module at the root, but it's a non-standard flat layout that PyPA advises against.

## Consequences

- Runtime dependencies (FastAPI, uvicorn, httpx, Click, pydantic-settings) are shared by all subpackages; the engine must not use them, which `import-linter` checks.
- The frontend version mirrors the Python version, so the image has a single tag (see [ADR 0005](0005_single_version_with_post_image_tags.md)).
- [Module dependencies](../architecture/module_dependencies.md) and the import contracts must change together.
