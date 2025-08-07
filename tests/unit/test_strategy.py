import random

import pytest

from opaprikkie_sim.board import Board, Peg
from opaprikkie_sim.constants import MAX_ROW_HEIGHT
from opaprikkie_sim.dice import DiceRoll, DiceRoller
from opaprikkie_sim.strategy import FinishPegsStrategy, GreedyStrategy, RandomStrategy


class DummyDiceRoller(DiceRoller):
    def __init__(self, available_targets: list[int]):
        self._available_targets = available_targets

    def get_available_targets(self, roll: DiceRoll) -> list[int]:
        return self._available_targets


@pytest.mark.parametrize(
    ("targets", "peg_states", "expected"),
    [
        # Only one peg and one valid target
        ([3], [Peg(number=3, position=0, max_position=MAX_ROW_HEIGHT)], 3),
        # Two pegs, only one valid targets
        (
            [2, 4],
            [
                Peg(number=2, position=MAX_ROW_HEIGHT, max_position=MAX_ROW_HEIGHT),
                Peg(number=4, position=1, max_position=MAX_ROW_HEIGHT),
            ],
            4,
        ),
        # Only one peg and no valid target
        ([5], [Peg(number=5, position=MAX_ROW_HEIGHT, max_position=MAX_ROW_HEIGHT)], None),
    ],
)
def test_random_strategy_choose_target(
    targets: list[int], peg_states: list[Peg], expected: int | None
) -> None:
    random.seed(0)
    roller = DummyDiceRoller(targets)
    board = Board(peg_states)
    roll = DiceRoll([1, 2, 3])
    strat = RandomStrategy(roller)
    result = strat.choose_target(board, roll)
    if expected is not None:
        assert result in targets
    else:
        assert result is None


def test_greedy_strategy_choose_target() -> None:
    roller = DummyDiceRoller([2, 4, 5, 2])
    pegs = [
        Peg(number=2, position=0, max_position=MAX_ROW_HEIGHT),
        Peg(number=4, position=MAX_ROW_HEIGHT - 1, max_position=MAX_ROW_HEIGHT),
        Peg(number=5, position=2, max_position=MAX_ROW_HEIGHT),
    ]
    board = Board(pegs)
    # Roll: 2 appears twice, 4 once
    roll = DiceRoll([2, 4, 5, 2])
    strat = GreedyStrategy(roller)
    # Should pick 2 (more moves, further from top)
    assert strat.choose_target(board, roll) == 2


def test_finish_pegs_strategy_choose_target() -> None:
    roller = DummyDiceRoller([2, 4, 5, 2])
    pegs = [
        Peg(number=2, position=0, max_position=MAX_ROW_HEIGHT),
        Peg(number=4, position=MAX_ROW_HEIGHT - 1, max_position=MAX_ROW_HEIGHT),
        Peg(number=5, position=2, max_position=MAX_ROW_HEIGHT),
    ]
    board = Board(pegs)
    roll = DiceRoll([2, 4, 5, 2])
    strat = FinishPegsStrategy(roller)
    # Should pick 4 (closest to completion, gets bonus)
    assert strat.choose_target(board, roll) == 4
