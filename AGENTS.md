# Repository guidance

## Project

Opa Prikkie, the Dutch dice game, as a browser game with an authoritative Python backend and a simulator for strategies.
The browser MVP is being built; see [the roadmap](docs/roadmap/monorepo_mvp.md) and the implementation parts under issue #30.

- `src/opaprikkie/`: one distribution with the `engine`, `backend`, and `sim` subpackages, plus `cli.py`.
- `frontend/`: the React SPA; until the API is connected it plays a fixture game.
- `tests/`: one folder per module, plus `cross_module/` and `container/`.

## Commands

- Install: `uv sync`, `npm --prefix frontend ci` with Node 24 from `.nvmrc`, then `uv run pre-commit install`.
- List tasks: `uv run task --list`.
- Format: `uv run task format`.
- Run every check (lint, types, module boundaries, tests with the 90% coverage gate): `uv run task check`.
- Run the backend and Vite with reload: `uv run task dev`.
- Bump the app version: `uv run task bump <major|minor|patch>`.
- Serve: `uv run opaprikkie serve`.
- Add or remove dependencies with `uv add` and `uv remove`, never by editing `pyproject.toml`.

## Read first

- [GLOSSARY.md](GLOSSARY.md) for the vocabulary and [docs/game_rules.md](docs/game_rules.md) for the rules.
- [Module dependencies](docs/architecture/module_dependencies.md) and the [strategy contract](docs/architecture/strategy_contract.md) for how the parts fit.
- [Repository layout](docs/development/repo_layout.md) and [conventions](docs/development/conventions.md) for where things go and how they're checked.
- [Design choices](docs/design_choices.md) for anything in the browser.
- [ADRs](docs/adr/) for why.
- [.agents/](.agents/README.md) for the issue tracker and domain-docs conventions.

## Implementation guidance

- The engine is the only place for game rules; it's pure, immutable, and uses the standard library only.
- `import-linter` enforces the module boundaries; change the contracts and the module dependencies doc together.
- Keep runtime settings in the backend settings model, and game dimensions in the ruleset.
- Add or update tests with every behavior change.
- Update the docs in the same PR when behavior or structure changes.

## Wayfinder planning

The browser MVP map lives in GitHub: map issue #14, with its tickets as sub-issues.
Read and write the map there with `gh`, following the GitHub mapping in the global wayfinder docs.
`.plan/` is a gitignored, read-only cache for `wayfinder-maps status`, `lint`, and the viewer; never hand-edit it.
Refresh it after every map change with `uv run task wayfinder_pull`.
