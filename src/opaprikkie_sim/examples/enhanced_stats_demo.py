"""Demo script showing enhanced game statistics functionality."""

from opaprikkie_sim import Game
from opaprikkie_sim.display import Display
from opaprikkie_sim.strategy import GreedyStrategy, RandomStrategy
from opaprikkie_sim.utilities import init_logger

logger = init_logger(__name__)
display = Display.get_instance()


def main() -> None:
    """Demonstrate enhanced game statistics."""
    display.display_info("=== Enhanced Game Statistics Demo ===\n")

    # Create a game with seed for reproducibility
    seed = 42
    game = Game(num_players=2, seed=seed)

    # Set different strategies
    game.set_player_strategy(0, RandomStrategy(seed=100))
    game.set_player_strategy(1, GreedyStrategy(seed=200))

    display.display_info("Playing game with:")
    display.display_info("- Player 1: RandomStrategy")
    display.display_info("- Player 2: GreedyStrategy")
    display.display_info(f"- Seed: {seed}")

    # Play the game
    winner = game.play_game()
    display.display_info(f"Game completed! Winner: {winner.name}")
    display.display_info(f"Total turns played: {game.state.turn_count}\n")

    # Display comprehensive game summary
    display.display_info(game.display_game_summary())

    # Get detailed statistics
    stats = game.get_game_statistics()
    display.display_info("DETAILED STATISTICS:")
    display.display_info("-" * 40)
    display.display_info(f"Game Info: {stats['game_info']}")
    display.display_info("")

    # Show move history for each player (first 5 moves)
    first_x_moves = 5
    moves = game.get_detailed_move_history()
    for player_name, player_moves in moves.items():
        display.display_info(f"{player_name} Move History (first {first_x_moves} moves):")
        for _i, move in enumerate(player_moves[:first_x_moves]):
            display.display_info(
                f"  Turn {move['turn']}: Rolled {move['dice_roll']}, "
                f"Target: {move['target']}, Moves: {move['moves']}, "
                f"Status: {move['status']}"
            )
        if len(player_moves) > first_x_moves:
            display.display_info(f"  ... and {len(player_moves) - first_x_moves} more moves")
        display.display_info("")

    # Show dice statistics
    display.display_info("DICE STATISTICS:")
    display.display_info("-" * 20)
    for target, count in sorted(stats["dice_statistics"].items()):
        display.display_info(f"Target {target}: {count} combinations available")


if __name__ == "__main__":
    main()
