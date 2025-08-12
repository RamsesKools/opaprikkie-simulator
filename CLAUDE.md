# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Opa Prikkie simulator - a Python implementation of a traditional Dutch dice game. The project simulates game mechanics, implements AI strategies, and provides both CLI and programmatic interfaces for playing and analyzing games.

## Development Commands

### Core Development
```bash
# Install dependencies
poetry install

# Run all tests with coverage
make pytest
# OR: poetry run pytest --cov=opaprikkie_sim --cov-branch --junitxml=python_test_report.xml

# Format code
make format
# OR: poetry run ruff format src/opaprikkie_sim tests

# Check linting and formatting
make check_ruff
# OR: poetry run ruff check src/opaprikkie_sim tests

# Type checking
make check_mypy
# OR: poetry run mypy src/opaprikkie_sim tests --pretty --install-types --non-interactive

# Run all checks and tests
make all_check_test

# Clean temporary files
make clean
```

### Running the Game
```bash
# Interactive mode
python -m opaprikkie_sim.cli interactive

# Simulation mode
python -m opaprikkie_sim.cli simulation --games 1000 --strategy1 greedy --strategy2 smart

# Show version
python -m opaprikkie_sim.cli --version
```

## Code Architecture

### Core Game Components

- **`game.py`**: Main game orchestration with `Game` class, `Player` dataclass, and `GameState` management
- **`board.py`**: Game board representation with `Board` and `Peg` classes handling piece positions
- **`dice.py`**: Dice rolling mechanics and target calculation logic
- **`strategy.py`**: AI strategy implementations (`RandomStrategy`, `GreedyStrategy`, `FinishPegsStrategy`)
- **`display.py`**: Game state visualization and output formatting
- **`game_stats.py`**: Game statistics tracking and analysis
- **`cli.py`**: Command-line interface using Click framework

### Game Rules Implementation

The game simulates traditional Opa Prikkie rules:
- 12 pegs per player (numbers 1-12)
- 6 dice rolled per turn
- Target numbers 1-6 use single dice, 7-12 use two-dice combinations
- Pegs move up 5 positions to reach the top
- First player to move all pegs to top wins

### Strategy System

Strategies implement the `Strategy` ABC:
- `choose_target(board: Board, roll: DiceRoll) -> int | None`
- Available strategies: Random, Greedy, FinishPegs
- Easy to extend with new AI approaches

### Testing Structure

- **Unit tests**: `tests/unit/` - Individual component testing
- **Integration tests**: `tests/integration/` - End-to-end game scenarios
- **Coverage target**: 90% minimum (configured in pyproject.toml)

## Code Quality Standards

- **Linting**: Ruff with strict configuration (line length 100, Python 3.12+)
- **Type checking**: MyPy in strict mode
- **Pre-commit hooks**: Automated code quality checks
- **Import organization**: Combined imports, no trailing commas in isort

## Key Development Notes

- Uses Poetry for dependency management
- Python 3.12+ required
- Click framework for CLI interface
- Hypothesis for property-based testing
- Jupyter notebook support for analysis (`notebooks/test_game.ipynb`)
