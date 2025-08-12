"""Command-line interface for Opa Prikkie simulator."""

import sys

import click

from opaprikkie_sim.constants import PVP_MAX_PLAYERS, PVP_MIN_PLAYERS
from opaprikkie_sim.display import Display
from opaprikkie_sim.game import Game
from opaprikkie_sim.strategy import STRATEGIES_NAME_MAPPING, Strategy
from opaprikkie_sim.utilities import get_version, init_logger

logger = init_logger(__name__)
display = Display.get_instance()


def create_strategy(strategy_name: str) -> Strategy:
    """Create a strategy based on the name."""
    strategy_class = STRATEGIES_NAME_MAPPING.get(strategy_name.lower())
    if not strategy_class:
        raise ValueError(f"Unknown strategy: {strategy_name}")

    return strategy_class()


def play_interactive_game(num_players: int) -> None:  # noqa: C901
    """Play an interactive game with user input."""
    display.display_info("Welcome to Opa Prikkie Simulator!")
    display.display_separator()

    if not (PVP_MIN_PLAYERS <= num_players <= PVP_MAX_PLAYERS):
        display.display_error(
            f"Number of players must be between {PVP_MIN_PLAYERS} and {PVP_MAX_PLAYERS}."
        )
        return

    # Create game
    game = Game(num_players=num_players)
    logger.info(f"Created game with {num_players} players")

    # Set strategies
    strategies = list(STRATEGIES_NAME_MAPPING.keys())
    for i in range(num_players):
        display.display_info(f"\nChoose strategy for Player {i + 1}:")
        for j, strategy in enumerate(strategies, 1):
            display.display_info(f"{j}. {strategy}")

        # Prompt user for strategy choice
        number_of_strategies = len(strategies)
        max_prompt_attempts = 3
        prompt_attempts = 0
        while True:
            choice: int = click.prompt(f"Enter choice (1-{number_of_strategies})", type=int)
            if 1 <= choice <= number_of_strategies:
                strategy_obj = create_strategy(strategies[choice - 1])
                game.set_player_strategy(i, strategy_obj)
                logger.info(f"Player {i + 1} assigned {strategies[choice - 1]} strategy")
                break
            display.display_warning(f"Please enter a number between 1 and {number_of_strategies}.")
            prompt_attempts += 1

            if prompt_attempts >= max_prompt_attempts:
                display.display_error("Too many invalid attempts. Exiting game setup.")
                return

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
            response = click.prompt(
                "\nPress Enter to continue or 'q' to quit", default="", show_default=False
            )
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
    player_strategy_names = [""] * num_players

    for i in range(num_games):
        if (i + 1) % 100 == 0:
            logger.info(f"Completed {i + 1} games...")

        game = Game(num_players=num_players)

        # Set strategies
        game.set_player_strategy(0, create_strategy(strategy1))
        if num_players > 1:
            game.set_player_strategy(1, create_strategy(strategy2))

        # Store strategy class names for display
        for idx, player in enumerate(game.players):
            player_strategy_names[idx] = player.strategy.__class__.__name__

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
            f"Player {i + 1} ({player_strategy_names[i]}): {win_count} wins ({percentage:.1f}%)"
        )

    avg_turns = total_turns / num_games
    display.display_info(f"\nAverage turns per game: {avg_turns:.1f}")
    logger.info(f"Simulation completed: {num_games} games, avg turns: {avg_turns:.1f}")


# Click CLI group and commands


@click.group()
@click.version_option(message="%(version)s")
def cli() -> None:
    """Opa Prikkie Simulator CLI."""
    pass


@cli.command()
@click.option(
    "--players",
    default=2,
    show_default=True,
    type=int,
    help=f"Number of players ({PVP_MIN_PLAYERS}-{PVP_MAX_PLAYERS})",
)
def interactive(players: int) -> None:
    """Play an interactive game with user input."""
    try:
        play_interactive_game(players)
    except KeyboardInterrupt:
        display.display_info("\nGame interrupted by user.")
        logger.info("Game interrupted by user")
        sys.exit(0)
    except Exception as e:
        display.display_error(f"Error: {e}")
        logger.exception("Unexpected error")
        sys.exit(1)


@cli.command()
@click.option(
    "--games", default=1000, show_default=True, type=int, help="Number of games for simulation mode"
)
@click.option("--players", default=2, show_default=True, type=int, help="Number of players")
@click.option(
    "--strategy1",
    default="random",
    show_default=True,
    type=click.Choice(["random", "greedy", "smart"]),
    help="Strategy for player 1",
)
@click.option(
    "--strategy2",
    default="random",
    show_default=True,
    type=click.Choice(["random", "greedy", "smart"]),
    help="Strategy for player 2",
)
def simulation(games: int, players: int, strategy1: str, strategy2: str) -> None:
    """Run multiple simulations and show statistics."""
    try:
        run_simulation(games, players, strategy1, strategy2)
    except KeyboardInterrupt:
        display.display_info("\nGame interrupted by user.")
        logger.info("Game interrupted by user")
        sys.exit(0)
    except Exception as e:
        display.display_error(f"Error: {e}")
        logger.exception("Unexpected error")
        sys.exit(1)


if __name__ == "__main__":
    cli(obj={"version": get_version()})
