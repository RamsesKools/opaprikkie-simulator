"""Basic tests for the Opa Prikkie game."""

from opaprikkie_sim import Board, DiceRoller, Game, GreedyStrategy, RandomStrategy
from opaprikkie_sim.constants import MAX_DICE_NUM, MAX_ROW_HEIGHT, MIN_DICE_NUM


def test_board_initialization():
    """Test that a board is initialized correctly."""
    assert MIN_DICE_NUM == 1
    assert MAX_DICE_NUM == 6

    board = Board()
    assert len(board.pegs) == 12
    for i in range(1, 13):
        assert i in board.pegs
        assert board.pegs[i].position == 0
        assert not board.pegs[i].is_at_top()


def test_peg_movement():
    """Test that pegs can move correctly."""
    board = Board()
    peg = board.get_peg(1)
    assert peg is not None
    assert peg.position == 0

    # Move peg up
    board.move_peg(1, MAX_ROW_HEIGHT - 2)
    peg = board.get_peg(1)
    assert peg.position == MAX_ROW_HEIGHT - 2

    # Try to move beyond max position
    board.move_peg(1, MAX_ROW_HEIGHT)  # Would exceed max position
    peg = board.get_peg(1)
    assert peg.position == MAX_ROW_HEIGHT


def test_board_completion():
    """Test that board completion is detected correctly."""
    board = Board()
    assert not board.is_complete()

    # Move all pegs to the top
    for i in range(1, 13):
        board.move_peg(i, 10)

    assert board.is_complete()


def test_dice_roller():
    """Test that dice rolling works correctly."""
    roller = DiceRoller()
    roll = roller.roll()

    assert len(roll.values) == 6
    assert all(1 <= val <= 6 for val in roll.values)

    # Test available targets
    targets = roller.get_available_targets(roll)
    assert isinstance(targets, list)
    assert all(isinstance(t, int) for t in targets)


def test_game_creation():
    """Test that a game can be created correctly."""
    game = Game(num_players=2)
    assert len(game.players) == 2
    assert game.state.current_player_index == 0
    assert not game.state.game_over


def test_strategy_creation():
    """Test that strategies can be created and used."""
    roller = DiceRoller()
    random_strategy = RandomStrategy(roller)
    greedy_strategy = GreedyStrategy(roller)

    board = Board()
    roll = roller.roll()

    # Test that strategies can choose targets
    target1 = random_strategy.choose_target(board, roll)
    target2 = greedy_strategy.choose_target(board, roll)

    # Targets should be valid numbers (1-12) or None
    assert target1 is None or (1 <= target1 <= 12)
    assert target2 is None or (1 <= target2 <= 12)


def test_game_turn():
    """Test that a game turn can be played."""
    game = Game(num_players=1)
    result = game.play_turn()

    assert isinstance(result, dict)
    assert "status" in result
    assert result["status"] in ["continue", "winner", "skipped"]
