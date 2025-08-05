"""Basic example of using the Opa Prikkie simulator."""

from opaprikkie_sim import Game, GreedyStrategy, RandomStrategy

# TODO fix noqas
# ruff: noqa: T201


def main() -> None:
    """Run a simple example game."""
    print("Opa Prikkie Simulator - Basic Example")
    print("=" * 40)

    # Create a game with 2 players
    game = Game(num_players=2)

    # Set different strategies for the players
    game.set_player_strategy(0, RandomStrategy(game.dice_roller))
    game.set_player_strategy(1, GreedyStrategy(game.dice_roller))

    print("Player 1: Random Strategy")
    print("Player 2: Greedy Strategy")
    print("\nStarting game...")

    # Play the game
    winner = game.play_game()

    print(f"\n🎉 {winner.name} wins!")
    print(f"Game completed in {game.state.turn_count} turns")

    # Display final board states
    print("\nFinal board states:")
    print(game.display_boards())


if __name__ == "__main__":
    main()
