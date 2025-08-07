import pytest

from opaprikkie_sim.board import Board, Peg
from opaprikkie_sim.constants import MAX_DICE_NUM, MAX_ROW_HEIGHT, MIN_DICE_NUM


# --- Peg class tests ---
def test_peg_is_at_top_false_and_true():
    peg = Peg(number=1, position=0, max_position=MAX_ROW_HEIGHT)
    assert not peg.is_at_top()
    peg.position = MAX_ROW_HEIGHT
    assert peg.is_at_top()
    peg.position += 1
    assert peg.is_at_top()


def test_peg_move_not_at_top():
    peg = Peg(number=1, position=0, max_position=MAX_ROW_HEIGHT)
    result = peg.move(2)
    assert peg.position == 2
    assert result is False


def test_peg_move_to_top():
    peg = Peg(number=1, position=MAX_ROW_HEIGHT - 2, max_position=MAX_ROW_HEIGHT)
    result = peg.move(2)
    assert peg.position == MAX_ROW_HEIGHT
    assert result is True


def test_peg_move_beyond_top():
    peg = Peg(number=1, position=4, max_position=MAX_ROW_HEIGHT)
    result = peg.move(3)
    assert peg.position == MAX_ROW_HEIGHT  # Should not exceed max_position
    assert result is True


# --- Board class tests ---
def test_board_initialization():
    board = Board()
    expected_peg_order = list(range(MIN_DICE_NUM, 2 * MAX_DICE_NUM + 1))
    actual_peg_order = [peg.number for peg in board.pegs]

    assert actual_peg_order == expected_peg_order

    for peg in board.pegs:
        assert isinstance(peg, Peg)
        assert peg.position == 0
        assert peg.max_position == board.row_height


def test_board_get_peg():
    board = Board()
    peg = board.get_peg(MIN_DICE_NUM)
    assert isinstance(peg, Peg)
    assert peg.number == MIN_DICE_NUM
    assert board.get_peg(999) is None  # Not present


def test_board_is_peg_movable():
    board = Board()
    peg = board.get_peg(MIN_DICE_NUM)
    assert peg is not None
    assert board.is_peg_movable(MIN_DICE_NUM)
    peg.position = peg.max_position
    assert not board.is_peg_movable(MIN_DICE_NUM)


def test_board_move_peg_normal():
    board = Board()
    peg = board.get_peg(MIN_DICE_NUM)
    assert peg is not None
    assert peg.position == 0
    result = board.move_peg(MIN_DICE_NUM, 3)
    assert peg.position == 3
    assert result is False


def test_board_move_peg_to_top():
    board = Board()
    peg = board.get_peg(MIN_DICE_NUM)
    assert peg is not None
    peg.position = 3
    result = board.move_peg(MIN_DICE_NUM, 2)
    assert peg.position == peg.max_position
    assert result is True


def test_board_move_peg_already_at_top():
    board = Board()
    peg = board.get_peg(MIN_DICE_NUM)
    assert peg is not None
    peg.position = peg.max_position
    with pytest.raises(AssertionError):
        board.move_peg(MIN_DICE_NUM, 1)


def test_board_is_complete_and_get_incomplete_pegs():
    board = Board()
    assert not board.is_complete()
    incomplete = board.get_incomplete_pegs()
    assert len(incomplete) == len(board.pegs)
    for peg in board.pegs:
        peg.position = peg.max_position
    assert board.is_complete()
    assert board.get_incomplete_pegs() == []


def test_board_get_peg_positions():
    board = Board()
    positions = board.get_peg_positions()
    assert isinstance(positions, dict)
    for v in positions.values():
        assert v == 0
    # Move a peg and check
    board.move_peg(MIN_DICE_NUM, 2)
    assert board.get_peg_positions()[MIN_DICE_NUM] == 2


def test_board_get_board_state_shape():
    """Board shape should be 1-12 columns by 1-5 rowheight"""
    assert MAX_DICE_NUM == 6
    assert MAX_ROW_HEIGHT == 5
    assert MIN_DICE_NUM == 1

    board = Board()
    state = board.get_board_state()
    assert isinstance(state, list)
    # get_board_state returns a list with MAX_ROW_HEIGHT rows
    assert len(state) == MAX_ROW_HEIGHT
    # Each row should have (2 * MAX_DICE_NUM) columns
    expected_cols = 2 * MAX_DICE_NUM
    assert all(len(row) == expected_cols for row in state)


def test_board_display_output():
    board = Board()
    output = board.display()
    assert isinstance(output, str)
    assert "Board" not in output  # Should be just the board, not class name
    assert "-" in output  # Should contain separator
