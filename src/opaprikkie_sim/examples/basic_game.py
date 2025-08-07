"""Basic example of using the Opa Prikkie simulator."""

from opaprikkie_sim import Game, GreedyStrategy, RandomStrategy
from opaprikkie_sim.display import Display
from opaprikkie_sim.utilities import init_logger

logger = init_logger(__name__)
display = Display.get_instance()


def main() -> None:
    """Run a simple example game."""
    display.display_info("Opa Prikkie Simulator - Basic Example")
    display.display_separator()

    # Create a game with 2 players
    game = Game(num_players=2)
    logger.info("Created game with 2 players")

    # Set different strategies for the players
    game.set_player_strategy(0, RandomStrategy(game.dice_roller))
    game.set_player_strategy(1, GreedyStrategy(game.dice_roller))
    logger.info("Assigned strategies: Player 1 (Random), Player 2 (Greedy)")

    display.display_info("Player 1: Random Strategy")
    display.display_info("Player 2: Greedy Strategy")
    display.display_info("\nStarting game...")

    # Play the game
    winner = game.play_game()
    logger.info(f"Game completed. Winner: {winner.name}")

    display.display_winner(winner.name)
    display.display_info(f"Game completed in {game.state.turn_count} turns")

    # Display final board states
    display.display_info("\nFinal board states:")
    display.display_board(game.display_boards())


if __name__ == "__main__":
    main()
