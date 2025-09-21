"""Tests for enhanced game statistics functionality."""

from opaprikkie_sim.game import Game
from opaprikkie_sim.game_stats import GameStats, PlayerMove, PlayerStats
from opaprikkie_sim.strategy import GreedyStrategy, RandomStrategy


def test_player_stats_creation():
    """Test PlayerStats creation and basic functionality."""
    stats = PlayerStats(name="Player 1", strategy_name="RandomStrategy")

    assert stats.name == "Player 1"
    assert stats.strategy_name == "RandomStrategy"
    assert stats.total_moves == 0
    assert stats.total_turns_played == 0
    assert stats.turns_skipped == 0
    assert not stats.is_winner
    assert len(stats.moves) == 0


def test_player_move_tracking():
    """Test tracking individual player moves."""
    stats = PlayerStats(name="Player 1", strategy_name="RandomStrategy")

    # Add a regular move
    move1 = PlayerMove(
        turn_number=1,
        player_name="Player 1",
        dice_roll=[1, 2, 3, 4, 5, 6],
        target_chosen=7,
        moves_made=2,
        status="continue",
    )
    stats.add_move(move1)

    assert stats.total_turns_played == 1
    assert stats.total_moves == 2
    assert stats.turns_skipped == 0
    assert len(stats.moves) == 1

    # Add a skipped turn
    move2 = PlayerMove(
        turn_number=2,
        player_name="Player 1",
        dice_roll=[1, 1, 1, 1, 1, 1],
        target_chosen=None,
        moves_made=0,
        status="skipped",
        reason="no_valid_target",
    )
    stats.add_move(move2)

    assert stats.total_turns_played == 2
    assert stats.total_moves == 2  # No moves added for skipped turn
    assert stats.turns_skipped == 1
    assert len(stats.moves) == 2

    # Add a winning move
    move3 = PlayerMove(
        turn_number=3,
        player_name="Player 1",
        dice_roll=[6, 6, 6, 6, 6, 6],
        target_chosen=12,
        moves_made=1,
        status="winner",
    )
    stats.add_move(move3)

    assert stats.total_turns_played == 3
    assert stats.total_moves == 3
    assert stats.turns_skipped == 1
    assert stats.is_winner
    assert len(stats.moves) == 3


def test_game_stats_player_management():
    """Test GameStats player management functionality."""
    stats = GameStats(game_package_version="1.0.0", game_seed=42, number_of_players=2)

    # Add players
    stats.add_player("Player 1", "RandomStrategy")
    stats.add_player("Player 2", "GreedyStrategy")

    assert len(stats.player_stats) == 2
    assert "Player 1" in stats.player_stats
    assert "Player 2" in stats.player_stats
    assert stats.player_stats["Player 1"].strategy_name == "RandomStrategy"
    assert stats.player_stats["Player 2"].strategy_name == "GreedyStrategy"


def test_game_stats_move_tracking():
    """Test GameStats move tracking across multiple players."""
    stats = GameStats(game_package_version="1.0.0", game_seed=42, number_of_players=2)

    stats.add_player("Player 1", "RandomStrategy")
    stats.add_player("Player 2", "GreedyStrategy")

    # Add moves for both players
    move1 = PlayerMove(
        turn_number=1,
        player_name="Player 1",
        dice_roll=[1, 2, 3, 4, 5, 6],
        target_chosen=7,
        moves_made=2,
        status="continue",
    )
    stats.add_player_move(move1)

    move2 = PlayerMove(
        turn_number=1,
        player_name="Player 2",
        dice_roll=[6, 6, 6, 6, 6, 6],
        target_chosen=12,
        moves_made=3,
        status="winner",
    )
    stats.add_player_move(move2)

    # Set winner
    stats.set_winner("Player 2")

    assert stats.winner_name == "Player 2"
    assert stats.player_stats["Player 1"].total_moves == 2
    assert stats.player_stats["Player 2"].total_moves == 3
    assert stats.player_stats["Player 2"].is_winner
    assert not stats.player_stats["Player 1"].is_winner


def test_game_integration_with_enhanced_stats():
    """Test that Game class properly integrates with enhanced stats."""
    game = Game(num_players=2, seed=42)
    game.set_player_strategy(0, RandomStrategy(seed=100))
    game.set_player_strategy(1, GreedyStrategy(seed=200))

    # Verify initial stats setup
    assert len(game.stats.player_stats) == 2
    assert "Player 1" in game.stats.player_stats
    assert "Player 2" in game.stats.player_stats

    # Play a few turns
    game.play_turn()
    game.play_turn()

    # Check that moves are being tracked
    player1_stats = game.stats.player_stats["Player 1"]
    player2_stats = game.stats.player_stats["Player 2"]

    assert player1_stats.total_turns_played >= 1
    assert player2_stats.total_turns_played >= 1
    assert len(player1_stats.moves) >= 1
    assert len(player2_stats.moves) >= 1

    # Verify move data structure
    move = player1_stats.moves[0]
    assert isinstance(move.turn_number, int)
    assert move.player_name == "Player 1"
    assert isinstance(move.dice_roll, list)
    assert len(move.dice_roll) == 6
    assert move.status in ["continue", "winner", "skipped"]


def test_game_stats_summary():
    """Test GameStats summary generation."""
    stats = GameStats(game_package_version="1.0.0", game_seed=42, number_of_players=2)

    stats.add_player("Player 1", "RandomStrategy")
    stats.add_player("Player 2", "GreedyStrategy")

    # Add some test data
    move = PlayerMove(
        turn_number=1,
        player_name="Player 1",
        dice_roll=[1, 2, 3, 4, 5, 6],
        target_chosen=7,
        moves_made=2,
        status="continue",
    )
    stats.add_player_move(move)
    stats.set_winner("Player 2")
    stats.finalize_game(10)

    summary = stats.get_summary()

    assert "game_info" in summary
    assert "player_stats" in summary
    assert "dice_statistics" in summary

    game_info = summary["game_info"]
    assert game_info["version"] == "1.0.0"
    assert game_info["seed"] == 42
    assert game_info["players"] == 2
    assert game_info["total_turns"] == 10
    assert game_info["winner"] == "Player 2"

    player_stats = summary["player_stats"]
    assert "Player 1" in player_stats
    assert "Player 2" in player_stats
    assert player_stats["Player 1"]["strategy"] == "RandomStrategy"
    assert player_stats["Player 2"]["strategy"] == "GreedyStrategy"


def test_complete_game_with_stats():
    """Test complete game with statistics tracking."""
    game = Game(num_players=2, seed=12345)
    game.set_player_strategy(0, RandomStrategy(seed=100))
    game.set_player_strategy(1, GreedyStrategy(seed=200))

    # Play complete game
    winner = game.play_game()

    # Verify final stats
    assert game.stats.winner_name == winner.name
    assert game.stats.total_turns > 0

    # Get summary and verify structure
    summary = game.get_game_statistics()
    assert summary["game_info"]["winner"] == winner.name
    assert summary["game_info"]["total_turns"] > 0

    # Get detailed moves
    moves = game.get_detailed_move_history()
    assert "Player 1" in moves
    assert "Player 2" in moves
    assert len(moves["Player 1"]) > 0
    assert len(moves["Player 2"]) > 0

    # Verify move structure
    first_move = moves["Player 1"][0]
    assert "turn" in first_move
    assert "dice_roll" in first_move
    assert "target" in first_move
    assert "moves" in first_move
    assert "status" in first_move

    # Test display summary
    display_summary = game.display_game_summary()
    assert "GAME SUMMARY" in display_summary
    assert "PLAYER STATISTICS" in display_summary
    assert winner.name in display_summary
