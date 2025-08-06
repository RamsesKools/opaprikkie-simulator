"""Command-line interface for Opa Prikkie simulator."""

import argparse
import sys

from opaprikkie_sim.dice import DiceRoller
from opaprikkie_sim.display import Display
from opaprikkie_sim.game import Game
from opaprikkie_sim.strategy import GreedyStrategy, RandomStrategy, SmartStrategy, Strategy
from opaprikkie_sim.utilities import init_logger

# TODO fix noqas
# ruff: noqa: T201, BLE001, PLR2004, E501

logger = init_logger(__name__)
display = Display.get_instance()


def create_strategy(strategy_name: str, dice_roller: DiceRoller) -> Strategy:
    """Create a strategy based on the name."""
    strategies: dict[str, type[Strategy]] = {
        "random": RandomStrategy,
        "greedy": GreedyStrategy,
        "smart": SmartStrategy,
    }

    strategy_class = strategies.get(strategy_name.lower())
    if not strategy_class:
        raise ValueError(f"Unknown strategy: {strategy_name}")

    return strategy_class(dice_roller)


def play_interactive_game() -> None:  # noqa: PLR0912, C901, PLR0915
    """Play an interactive game with user input."""
    display.display_info("Welcome to Opa Prikkie Simulator!")
    display.display_separator()

    # Get number of players
    while True:
        try:
            num_players = int(input("Enter number of players (2-4): "))
            if 2 <= num_players <= 4:
                break
            display.display_warning("Please enter a number between 2 and 4.")
        except ValueError:
            display.display_error("Please enter a valid number.")

    # Create game
    game = Game(num_players=num_players)
    logger.info(f"Created game with {num_players} players")

    # Set strategies
    strategies = ["random", "greedy", "smart"]
    for i in range(num_players):
        display.display_info(f"\nChoose strategy for Player {i + 1}:")
        for j, strategy in enumerate(strategies, 1):
            display.display_info(f"{j}. {strategy.capitalize()}")

        while True:
            try:
                choice = int(input("Enter choice (1-3): "))
                if 1 <= choice <= 3:
                    strategy_obj = create_strategy(strategies[choice - 1], game.dice_roller)
                    game.set_player_strategy(i, strategy_obj)
                    logger.info(f"Player {i + 1} assigned {strategies[choice - 1]} strategy")
                    break
                display.display_warning("Please enter a number between 1 and 3.")
            except ValueError:
                display.display_error("Please enter a valid number.")

    # Play game
    display.display_info("\nStarting game...")
    display.display_separator()

    turn_count = 0
    while not game.state.game_over:
        turn_count += 1
        display.display_turn_info(turn_count, game.state.get_current_player().name)

        result = game.play_turn()

        if result["status"] == "winner":
            display.display_winner(result["player"])
            display.display_target_selection(result["target"], result["moves"])
            break
        if result["status"] == "skipped":
            display.display_warning(f"{result['player']} skipped turn ({result['reason']})")
        else:
            display.display_dice_roll(result["roll"])
            display.display_target_selection(result["target"], result["moves"])

        # Display boards
        display.display_board(game.display_boards())

        # Ask to continue
        if turn_count % 5 == 0:
            response = input("\nPress Enter to continue or 'q' to quit: ")
            if response.lower() == "q":
                display.display_info("Game stopped by user.")
                break

    display.display_info(f"\nGame finished after {turn_count} turns!")
    logger.info(f"Game completed in {turn_count} turns")


def run_simulation(
    num_games: int, num_players: int = 2, strategy1: str = "random", strategy2: str = "random"
) -> None:
    """Run multiple simulations and show statistics."""
    display.display_info(f"Running {num_games} simulations...")
    display.display_info(f"Players: {num_players}, Strategies: {strategy1} vs {strategy2}")
    display.display_separator(50)

    wins = [0] * num_players
    total_turns = 0

    for i in range(num_games):
        if (i + 1) % 100 == 0:
            logger.info(f"Completed {i + 1} games...")

        game = Game(num_players=num_players)

        # Set strategies
        dice_roller = game.dice_roller
        game.set_player_strategy(0, create_strategy(strategy1, dice_roller))
        if num_players > 1:
            game.set_player_strategy(1, create_strategy(strategy2, dice_roller))

        # Play game
        winner = game.play_game()
        winner_index = game.players.index(winner)
        wins[winner_index] += 1
        total_turns += game.state.turn_count

    # Display results
    display.display_info(f"\nResults after {num_games} games:")
    display.display_separator(30)
    for i, win_count in enumerate(wins):
        percentage = (win_count / num_games) * 100
        display.display_info(
            f"Player {i + 1} ({game.players[i].strategy.__class__.__name__}): {win_count} wins ({percentage:.1f}%)"
        )

    avg_turns = total_turns / num_games
    display.display_info(f"\nAverage turns per game: {avg_turns:.1f}")
    logger.info(f"Simulation completed: {num_games} games, avg turns: {avg_turns:.1f}")


def main() -> None:
    """Main entry point for the CLI."""
    parser = argparse.ArgumentParser(description="Opa Prikkie Simulator")
    parser.add_argument(
        "--mode",
        choices=["interactive", "simulation"],
        default="interactive",
        help="Game mode (default: interactive)",
    )
    parser.add_argument(
        "--games",
        type=int,
        default=1000,
        help="Number of games for simulation mode (default: 1000)",
    )
    parser.add_argument("--players", type=int, default=2, help="Number of players (default: 2)")
    parser.add_argument(
        "--strategy1",
        choices=["random", "greedy", "smart"],
        default="random",
        help="Strategy for player 1 (default: random)",
    )
    parser.add_argument(
        "--strategy2",
        choices=["random", "greedy", "smart"],
        default="random",
        help="Strategy for player 2 (default: random)",
    )

    args = parser.parse_args()

    try:
        if args.mode == "interactive":
            play_interactive_game()
        else:
            run_simulation(args.games, args.players, args.strategy1, args.strategy2)
    except KeyboardInterrupt:
        display.display_info("\nGame interrupted by user.")
        logger.info("Game interrupted by user")
        sys.exit(0)
    except Exception as e:
        display.display_error(f"Error: {e}")
        logger.exception("Unexpected error")
        sys.exit(1)


if __name__ == "__main__":
    main()
