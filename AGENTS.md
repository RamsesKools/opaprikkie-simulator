# Repository guidance

## Project

This repository is a Python package and CLI for simulating the two-player Dutch dice game Opa Prikkie. Package code lives in `src/opaprikkie_sim/`; tests live in `tests/`, `tests/unit/`, and `tests/integration/`.

## Commands

- Install dependencies: `poetry install`
- Format Python: `make format`
- Lint: `make check_ruff`
- Type check: `make check_mypy`
- Run tests with coverage: `make pytest`
- Run all checks and tests: `make all_check_test`
- Start an interactive game: `poetry run python -m opaprikkie_sim.cli interactive`
- Run simulations: `poetry run python -m opaprikkie_sim.cli simulation --games 1000 --strategy1 greedy --strategy2 smart`

Ruff uses a 100-character line limit and targets Python 3.12. The package supports Python 3.11 and later. MyPy is configured in strict mode, and coverage is configured to require 90%.

## Architecture

- `game.py` coordinates players, turns, strategy selection, and game statistics.
- `board.py` models the board and peg positions.
- `dice.py` implements dice rolls, target combinations, and turn simulation.
- `strategy.py` defines the strategy interface and built-in strategies.
- `game_stats.py` records game and player statistics.
- `display.py` formats game output; `cli.py` provides the Click command-line interface.
- `constants.py` holds game dimensions and player-count limits. Use these constants instead of duplicating game-rule values, and keep relevant behavior configurable where practical.

## Game model

The default game has two players, six dice, and pegs for targets 1 through 12. Targets 1 through 6 use single dice; targets 7 through 12 use pairs. A peg advances up to the configured row height, currently five positions. The CLI exposes `random`, `greedy`, and `smart` strategies.

## Implementation guidance

- Keep type annotations consistent with the existing code and strict MyPy configuration.
- Add or update tests alongside behavior changes, following the existing test layout.
- Keep formatting and lint rules in `pyproject.toml` authoritative; use Ruff rather than introducing another formatter or linter.
- Keep package implementation under `src/opaprikkie_sim/` and preserve the existing Poetry project layout.
