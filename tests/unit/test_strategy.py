import random

import pytest

from opaprikkie_sim.board import Board, Peg
from opaprikkie_sim.constants import MAX_ROW_HEIGHT
from opaprikkie_sim.dice import DiceRoll
from opaprikkie_sim.strategy import FinishPegsStrategy, GreedyStrategy, RandomStrategy


@pytest.mark.parametrize(
    ("possible_targets", "peg_states", "dice_values"),
    [
        # Only one peg and one valid target
        ([3], [Peg(number=3, position=0)], [1, 2, 3]),
        # Two pegs, only 4 is a valid target, but no 4 thrown.
        (
            [None],
            [
                Peg(number=2, position=MAX_ROW_HEIGHT),
                Peg(number=4, position=1),
            ],
            [1, 2, 3],
        ),
        # Only one invalid peg
        ([None], [Peg(number=5, position=MAX_ROW_HEIGHT)], [5, 5, 5]),
        # Four pegs, only 2,3 valid targets
        (
            [2, 3],
            [
                Peg(number=1, position=MAX_ROW_HEIGHT),
                Peg(number=2, position=1),
                Peg(number=3, position=1),
                Peg(number=4, position=1),
            ],
            [1, 2, 3],
        ),
    ],
)
def test_random_strategy_choose_target(
    possible_targets: list[int | None], peg_states: list[Peg], dice_values: list[int]
) -> None:
    random.seed(0)
    board = Board(peg_states)
    roll = DiceRoll(dice_values)
    strat = RandomStrategy()
    result = strat.choose_target(board, roll)
    assert result in possible_targets


def test_greedy_strategy_choose_target() -> None:
    pegs = [
        Peg(number=2, position=0),
        Peg(number=4, position=MAX_ROW_HEIGHT - 1),
        Peg(number=5, position=2),
    ]
    board = Board(pegs)
    # Roll: 2 appears twice, 4 once
    roll = DiceRoll([2, 4, 5, 2])
    strat = GreedyStrategy()
    # Should pick 2 (more moves, further from top)
    assert strat.choose_target(board, roll) == 2


def test_finish_pegs_strategy_choose_target() -> None:
    pegs = [
        Peg(number=2, position=0),
        Peg(number=4, position=MAX_ROW_HEIGHT - 1),
        Peg(number=5, position=2),
    ]
    board = Board(pegs)
    roll = DiceRoll([2, 4, 5, 2])
    strat = FinishPegsStrategy()
    # Should pick 4 (closest to completion, gets bonus)
    assert strat.choose_target(board, roll) == 4
