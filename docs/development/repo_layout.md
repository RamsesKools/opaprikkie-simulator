# Repository layout

The target layout for the browser MVP.
How the modules relate lives in [module dependencies](../architecture/module_dependencies.md).

## Tree

```text
src/opaprikkie/
  engine/          rules, board, dice, state, turn resolution, built-in strategies
  backend/         FastAPI app, sessions, settings
  sim/             batch runner, HTTP client, aggregate stats
  cli.py           `opaprikkie serve`, `opaprikkie simulate`
frontend/          React SPA (Vite, TypeScript, npm)
  src/             app code, unit tests next to the source
  tests/contract/  contract suite against a live backend
tests/
  engine/          unit and integration tests per module
  backend/
  sim/
  cli/
  cross_module/    e.g. HTTP versus in-process parity
  container/       against the built image, marker `container`, skipped by default
docs/
  adr/             why: decisions and rejected alternatives
  architecture/    how the system fits together
  development/     layout and conventions (this folder)
  research/        cited research notes
  roadmap/         MVP plan
  game_rules.md      rules the engine implements
  design_choices.md  frontend design choices
notebooks/         exploration only, opt-in `notebook` dependency group
scripts/           Python helper scripts
.agents/           agent instructions and skills, see below
pyproject.toml  uv.lock  ruff.toml  .python-version
Dockerfile  compose.yaml  .env.example
AGENTS.md  CLAUDE.md  GLOSSARY.md  README.md
```

## Naming

- snake_case for everything we name: Python modules, TS files, folders, docs, scripts.
  Use `_` only where it helps readability (`opaprikkie`, not `opa_prikkie`).
- Ecosystem-fixed names keep their form: `README.md`, `AGENTS.md`, `Dockerfile`, `package.json`, config dotfiles.
- Python follows [PEP 8](https://peps.python.org/pep-0008/#package-and-module-names): short lowercase package and module names.
- oxlint's `unicorn/filename-case` enforces snake_case in `frontend/`.

## Python project

- One distribution, `opaprikkie`, in src layout with `uv_build` ([ADR 0002](../adr/0002_single_package_over_uv_workspace.md)).
- Python 3.13 floor and pin in `.python-version`.
- Dev tools live in dependency groups: `dev` for repo tooling, opt-in `notebook` for Jupyter.
- Add or remove dependencies with `uv add` and `uv remove`, never by editing `pyproject.toml`.

## Tests

- Python tests live in the root `tests/`, one folder per module plus cross-cutting folders.
- pytest runs with `--import-mode=importlib`, so test folders named like modules don't shadow them.
- Frontend tests stay in `frontend/`, because Node resolves `node_modules` upward from the test file.

## Agent files

- `AGENTS.md` holds agent instructions; `CLAUDE.md` is just `@AGENTS.md`.
- `.agents/` is the tool-agnostic home for agent assets:
  - `README.md` explains the folder.
  - `docs/` holds the issue tracker and domain-docs conventions.
  - `skills/` holds project skills, symlinked into `.claude/skills` and `.github/skills`.
- `.local/` is gitignored scratch space.
