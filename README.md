# Opa Prikkie Simulator

[![CI](https://github.com/RamsesKools/opaprikkie-simulator/actions/workflows/ci.yml/badge.svg)](https://github.com/RamsesKools/opaprikkie-simulator/actions/workflows/ci.yml)
[![Check Pre-commit](https://github.com/RamsesKools/opaprikkie-simulator/actions/workflows/check-pre-commit.yml/badge.svg)](https://github.com/RamsesKools/opaprikkie-simulator/actions/workflows/check-pre-commit.yml)
[![Check versioning and changelog](https://github.com/RamsesKools/opaprikkie-simulator/actions/workflows/check-versioning.yml/badge.svg)](https://github.com/RamsesKools/opaprikkie-simulator/actions/workflows/check-versioning.yml)

A Python project to simulate and solve the famous Dutch game: Opa Prikkie.

## About Opa Prikkie

Opa Prikkie is a traditional Dutch dice game where players compete to move all their pegs (prikkies) to the top of their board first. The game involves:

- **2 wooden boards** (one per player)
- **26 pegs** (prikkies) - 12 per player
- **6 dice**

### Game Rules

1. **Setup**: Each player places 12 pegs on the bottom row of their board (one peg per number 1-12)
2. **Goal**: Move all pegs to the top of the board first
   - Each row is 5 spaces long. The top is reached after throwing that number 5 times.
3. **Gameplay**:
   - Roll all 6 dice
   - Choose a target number to save:
     - Numbers 1-6: Use single dice
     - Numbers 7-12: Use two dice combinations
   - Continue rolling remaining dice until no more matches with the target
   - Move the corresponding peg up by the number of successful matches
   - If all dice are used, roll all 6 again and continue for the same target
   - If a peg reaches the top, you can roll all dice again for a new target

## Installation

This project uses Poetry for dependency management. To install:

```bash
# Clone the repository
git clone https://github.com/RamsesKools/opaprikkie-simulator.git
cd opaprikkie-simulator

# Install dependencies
poetry install

# Optionally, activate the virtual environment
poetry shell

# Activate the pre-commit hooks
poetry run pre-commit install
```

## Usage

### Command Line Interface

The simulator includes a command-line interface for playing games:

```bash
# Interactive mode (default)
python -m opaprikkie_sim.cli

# Simulation mode
python -m opaprikkie_sim.cli --mode simulation --games 1000 --strategy1 greedy --strategy2 smart
```

### Python API

You can also use the simulator programmatically:

```python
from opaprikkie_sim import Game, RandomStrategy, GreedyStrategy

# Create a game with 2 players
game = Game(num_players=2)

# Set strategies
game.set_player_strategy(0, RandomStrategy(game.dice_roller))
game.set_player_strategy(1, GreedyStrategy(game.dice_roller))

# Play the game
winner = game.play_game()
print(f"{winner.name} wins!")
```

### Available Strategies

1. **RandomStrategy**: Chooses targets randomly from available options
2. **GreedyStrategy**: Always chooses the target that will move a peg the furthest
3. **SmartStrategy**: Considers multiple factors including completion bonuses and distance penalties

## Project Structure

```
src/opaprikkie_sim/
├── __init__.py          # Package initialization
├── board.py            # Board and peg representation
├── dice.py             # Dice rolling functionality
├── display.py          # Display system for game information
├── game.py             # Main game logic
├── strategy.py         # AI strategies
├── utilities.py        # Utility functions (including logging)
└── cli.py              # Command-line interface

tests/
├── test_basic_game.py  # Basic functionality tests
├── test_logging_display.py  # Logging and display tests
└── ...

examples/
└── basic_game.py       # Example usage
```

## Development

### Running Tests

```bash
# Run all tests
poetry run pytest

# Run with coverage
make pytest
```

### Code Quality

The project uses several tools for code quality:

- **Ruff**: Linting and formatting
- **MyPy**: Type checking
- **Pre-commit**: Git hooks for code quality

```bash
# Run linting
make check_ruff

# Run type checking
make check_mypy

# Format code
make format
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Game rules based on the official [Opa Prikkie website](https://opaprikkie.nl/spelregels/)
- Developed as a learning project for game simulation and AI strategy development
