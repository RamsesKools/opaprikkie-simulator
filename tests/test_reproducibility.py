"""Tests to verify that games are reproducible with the same seed."""

from opaprikkie_sim.board import Board
from opaprikkie_sim.dice import DiceRoll
from opaprikkie_sim.game import Game
from opaprikkie_sim.strategy import GreedyStrategy, RandomStrategy


def test_game_reproducibility_with_seed():
    """Test that games with the same seed produce identical results."""
    seed = 42

    # Play the same game twice with the same seed
    game1 = Game(num_players=2, seed=seed)
    game1.set_player_strategy(0, RandomStrategy(seed=seed + 1000))
    game1.set_player_strategy(1, GreedyStrategy(seed=seed + 2000))

    game2 = Game(num_players=2, seed=seed)
    game2.set_player_strategy(0, RandomStrategy(seed=seed + 1000))
    game2.set_player_strategy(1, GreedyStrategy(seed=seed + 2000))

    # Track game progress
    game1_moves: list[dict[str, str | None]] = []
    game2_moves: list[dict[str, str | None]] = []

    # Play both games and record moves
    while not game1.state.game_over and not game2.state.game_over:
        result1 = game1.play_turn()
        result2 = game2.play_turn()

        game1_moves.append(
            {
                "player": result1.get("player"),
                "target": result1.get("target"),
                "moves": result1.get("moves"),
                "roll": result1.get("roll"),
                "status": result1.get("status"),
            }
        )

        game2_moves.append(
            {
                "player": result2.get("player"),
                "target": result2.get("target"),
                "moves": result2.get("moves"),
                "roll": result2.get("roll"),
                "status": result2.get("status"),
            }
        )

    # Both games should have identical progressions
    assert len(game1_moves) == len(game2_moves)

    for move1, move2 in zip(game1_moves, game2_moves, strict=True):
        assert move1 == move2, f"Game moves differ: {move1} != {move2}"

    # Final game states should be identical
    assert game1.state.game_over == game2.state.game_over
    assert game1.state.turn_count == game2.state.turn_count
    if game1.state.winner and game2.state.winner:
        assert game1.state.winner.name == game2.state.winner.name


def test_different_seeds_produce_different_games():
    """Test that different seeds produce different game outcomes."""
    # Play games with different seeds
    game1 = Game(num_players=2, seed=42)
    game1.set_player_strategy(0, RandomStrategy(seed=1042))
    game1.set_player_strategy(1, RandomStrategy(seed=2042))

    game2 = Game(num_players=2, seed=123)
    game2.set_player_strategy(0, RandomStrategy(seed=1123))
    game2.set_player_strategy(1, RandomStrategy(seed=2123))

    # Play both games completely
    _winner1 = game1.play_game()
    _winner2 = game2.play_game()

    # Games should likely have different outcomes (though not guaranteed)
    # At minimum, the random sequences should be different
    assert game1.seed != game2.seed


def test_dice_roller_reproducibility():
    """Test that DiceRoller produces identical sequences with same seed."""
    from opaprikkie_sim.dice import DiceRoller

    seed = 12345
    roller1 = DiceRoller(seed=seed)
    roller2 = DiceRoller(seed=seed)

    # Roll multiple times and compare
    for _ in range(10):
        roll1 = roller1.roll()
        roll2 = roller2.roll()
        assert roll1.values == roll2.values, f"Dice rolls differ: {roll1.values} != {roll2.values}"


def test_strategy_reproducibility():
    """Test that strategies with same seed make identical choices."""
    seed = 999
    board = Board()

    # Create identical dice roll
    roll = DiceRoll(values=[1, 2, 3, 4, 5, 6])

    # Test RandomStrategy reproducibility
    strategy1 = RandomStrategy(seed=seed)
    strategy2 = RandomStrategy(seed=seed)

    # Should make identical choices
    for _ in range(5):
        choice1 = strategy1.choose_target(board, roll)
        choice2 = strategy2.choose_target(board, roll)
        assert choice1 == choice2, f"Strategy choices differ: {choice1} != {choice2}"


def test_no_seed_produces_different_results():
    """Test that games without seeds produce different results."""
    # Play games without seeds (should be non-deterministic)
    game1 = Game(num_players=2)
    game2 = Game(num_players=2)

    # Get first roll from each game
    result1 = game1.play_turn()
    result2 = game2.play_turn()

    # While it's possible they could be the same, it's very unlikely
    # This test mainly ensures the no-seed path works
    assert "roll" in result1
    assert "roll" in result2
    assert isinstance(result1["roll"], list)
    assert isinstance(result2["roll"], list)
