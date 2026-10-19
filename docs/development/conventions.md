# Development conventions

How we build, check, version, and ship the app.
Where things live is in [repository layout](repo_layout.md).

## Stack

- Frontend: React SPA with Vite and TypeScript, started from the [#22 prototype](https://github.com/RamsesKools/opaprikkie-simulator/pull/22) ([ADR 0001](../adr/0001_react_spa_frontend.md)).
- API client: `openapi-typescript` types with `openapi-fetch`. No router, state library, or CSS framework until one is needed.
- API: FastAPI and uvicorn, with Pydantic models as the HTTP contract.
- Move the frontend to TypeScript 7 once Vite, React types, and tsgolint support it.

## Commands

taskipy is the single command surface for Python and frontend: `uv run task <name>`, list them with `uv run task --list`.

| Task | Does |
| --- | --- |
| `format` | Ruff format and oxfmt |
| `lint` | Ruff check and oxlint |
| `typecheck` | ty and `tsc -b` |
| `lint_imports` | `import-linter` module contracts |
| `test` | pytest with the 90% coverage gate, and Vitest |
| `test_contract` | starts uvicorn and runs the frontend contract suite |
| `check` | everything above except `format` |
| `dev` | uvicorn `--reload` and Vite with its `/api` proxy |
| `gen_api` | dumps the OpenAPI schema and regenerates `frontend/src/lib/api.d.ts` |
| `bump <part>` | sets the version in `pyproject.toml` and `frontend/package.json` |
| `wayfinder_pull` | refreshes the `.plan/` cache of the planning map |
| `image_build`, `image_build_multiarch` | local Docker builds |

## Linting and type checking

- Ruff with a minimal explicit rule set; extend it when a real need shows up:

  ```toml
  line-length = 100
  target-version = "py313"

  [lint]
  select = ["E", "W", "F", "I", "N", "UP", "B", "C4", "SIM", "PT", "RUF", "ANN"]

  [lint.per-file-ignores]
  "tests/**" = ["ANN"]
  ```

- Avoid `select = ["ALL"]` with long ignore lists: every Ruff upgrade silently enables new rules.
- ty is the Python type checker.
- Frontend: oxlint with type-aware rules (`oxlint-tsgolint`), React Compiler rules, and snake_case filenames; oxfmt formats; `tsc -b` type-checks separately from the build ([research](../research/frontend_lint_format.md)).
- Pin exact versions of `oxlint`, `oxfmt`, and `oxlint-tsgolint`; oxfmt is still beta.

## Testing

- Python: pytest, one combined 90% coverage gate over `opaprikkie`.
- A parity test plays the same seeded game via FastAPI's TestClient and in-process and compares the logs.
- Container tests (marker `container`) run against the built image and are skipped by default.
- Frontend: Vitest, React Testing Library, and jsdom, 90% v8 coverage excluding generated types and `main.tsx`.
- Contract suite: `frontend/tests/contract/` drives the real API client against a live backend through every flow the UI relies on (create session, start game, choose target, game end, rejected target, cookie resume).
- Drift check: `task gen_api` writes `frontend/openapi.json` and `api.d.ts` without a server; both are committed, and CI fails when regenerating them changes anything.

## Pre-commit

- pre-commit-hooks: large files, merge conflicts, TOML and YAML, end of file, line endings, whitespace, `debug-statements`, `check-ast`, shebang checks, and `no-commit-to-branch` on `main`.
- `uv-lock`, `validate-pyproject`, mdformat (gfm, frontmatter, tables), and Ruff format and check.
- Local frontend hooks scoped to `^frontend/`: oxfmt, oxlint, `tsc`, and `vitest related --run`.
- A version-sync check between `pyproject.toml` and `frontend/package.json`.
- Not on commit: ty (CI and `task check` only). Not yet: gitleaks, and shellcheck (helper scripts are Python).

## CI

- One workflow on pull requests, no path filters:
  - `pre-commit`
  - `python`: setup-uv with cache, then `task check` and tests
  - `web`: Node 24 LTS from `.nvmrc`, npm cache, `npm ci`, `npm run check`
  - `contract`: drift check and contract suite
  - `docker`: amd64 build check without pushing
- On `main`, a publish job pushes the image to GHCR.

## Versioning and images

- One app version in `pyproject.toml`, mirrored in `frontend/package.json` ([ADR 0005](../adr/0005_single_version_with_post_image_tags.md)).
  No changelog, and no forced bump per PR.
- Image tag `<version>`, then `<version>.postN` when the same version rebuilds to a different digest, plus `latest`.
  Version and commit are image `LABEL`s.
- CI builds amd64 only.
  The Dockerfile must also build on arm64, so a Mac builds natively with `docker compose up --build`.
  This split isn't fixed yet and may change once deployment is clearer.

## Docker

- One multi-stage `Dockerfile`, with a layer order that keeps rebuilds cheap:
  1. Node stage on `$BUILDPLATFORM`: copy `package.json` and the lockfile, `npm ci`, then copy the source and build.
  2. Python builder: copy `pyproject.toml`, `uv.lock`, and `.python-version`, run `uv sync --frozen --no-dev --no-install-project`, then copy `src/` and sync again.
  3. Runtime `python:3.13-slim`: copy only the venv and the built SPA (`/app/static`), run as a non-root user, `CMD ["opaprikkie", "serve"]`.
- BuildKit cache mounts for npm and uv, and GHA layer cache in CI.
- FastAPI serves the SPA at `/` and the API at `/api`, so everything is same origin with no CORS.
- `compose.yaml` has one service with `image: ghcr.io/ramseskools/opaprikkie:latest` and `build: .`, port `${PORT:-8000}:8000`, optional `.env`, `restart: unless-stopped`, and a Python healthcheck on `/api/health`.
  - Laptop: `docker compose up --build`.
  - Homeserver: `docker compose pull && docker compose up -d`.
- The dev loop is native `task dev`, not Compose. Keep it loose until we've used it.

## Settings

- Read by a pydantic-settings model with the `OPAPRIKKIE_` prefix and documented in `.env.example`:
  - `PORT` (8000)
  - `DEV_MODE` (false; enables `/docs` and `/openapi.json`)
  - `MAX_SESSIONS` (50)
  - `SESSION_TTL_DAYS` (7)
  - `COOKIE_SECURE` (false; turn on behind HTTPS)
  - `STATIC_DIR` (`frontend/dist` natively, `/app/static` in the image)
- Keep runtime and environment values in the settings model, not in module-level constants.
  `constants.py`-style values are for game rules only.

## Docs

- `README.md`: what the repo is and how to run it now.
- `docs/adr/`: why a decision was made.
  Never rewrite an accepted ADR; add a new one that supersedes it and note the supersession in the old one.
- `docs/architecture/` and `docs/development/`: how things are now; update them when structure changes.
- `docs/game_rules.md`: the single source for game rules; rule decisions update it.
- `docs/design_choices.md`: every frontend design choice.
- Markdown: one sentence per line, `#` sections for structure, lists for enumerations, no horizontal rules.
