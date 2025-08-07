import pytest

from opaprikkie_sim.constants import MAX_DICE_NUM, MAX_ROW_HEIGHT, MIN_DICE_NUM, NUMBER_OF_DICE
from opaprikkie_sim.dice import DiceRoll, DiceRoller


class DummyRandom:
    def __init__(self, values: list[int]):
        self.values = values
        self.index = 0

    def randint(self, _a: int, _b: int) -> int:
        val = self.values[self.index % len(self.values)]
        self.index += 1
        return val


def test_dice_roll_count_target():
    roll = DiceRoll([1, 2, 3, 2, 2])
    assert roll.count_target(2) == 3
    assert roll.count_target(4) == 0


def test_dice_roll_get_combinations_for_target_single():
    roll = DiceRoll([1, 2, 3, 2])
    assert roll.get_combinations_for_target(2) == [[2], [2]]
    assert roll.get_combinations_for_target(4) == []


@pytest.mark.parametrize(
    ("dice_values", "target", "expected"),
    [
        # Single dice match
        ([1, 2, 3, 4, 5, 6], 4, [[4]]),
        ([1, 1, 6, 6], 1, [[1], [1]]),
        ([1, 2, 3, 4], 2, [[2]]),  # Only single dice match
        ([1, 2, 3, 4], 6, []),  # No two-dice combos for 6
        # Two-dice combinations, unique pairs
        ([1, 6, 2, 5, 3, 4], 7, [[1, 6], [2, 5], [3, 4]]),
        ([1, 1, 6, 6], 7, [[1, 6], [1, 6]]),
        ([2, 2, 5, 5], 7, [[2, 5], [2, 5]]),
        ([6, 6, 6, 6, 6, 6], 12, [[6, 6], [6, 6], [6, 6]]),  # All same dice
    ],
)
def test_dice_roll_get_combinations_for_target_double(
    dice_values: list[int], target: int, expected: list[list[int]]
) -> None:
    roll = DiceRoll(dice_values)
    combos = roll.get_combinations_for_target(target)
    # For two-dice combos, sort inner lists for comparison
    if target > MAX_DICE_NUM:
        assert sorted([sorted(pair) for pair in combos]) == sorted(
            [sorted(pair) for pair in expected]
        )
    else:
        assert combos == expected


def test_dice_roller_roll(monkeypatch: pytest.MonkeyPatch) -> None:
    dummy = DummyRandom([2, 3, 4])
    monkeypatch.setattr("random.randint", dummy.randint)
    roller = DiceRoller(num_dice=3)
    roll = roller.roll()
    assert roll.values == [2, 3, 4]


def test_dice_roller_roll_remaining(monkeypatch: pytest.MonkeyPatch) -> None:
    dummy = DummyRandom([1, 6])
    monkeypatch.setattr("random.randint", dummy.randint)
    roller = DiceRoller(num_dice=2)
    roll = roller.roll_remaining(2)
    assert roll.values == [1, 6]


@pytest.mark.parametrize(
    ("dummy_values", "target", "expected"),
    [
        # First roll: 6x6 (3 pairs for 12), second roll: 6x1 (no pairs for 12)
        ([6, 6, 6, 6, 6, 6, 1, 1, 1, 1, 1, 1], 12, 3),
        # First roll: 6x2 (no 12s), second roll: 6x6 (3 pairs for 12)
        ([2, 2, 2, 2, 2, 2, 6, 6, 6, 6, 6, 6], 2, 6),
        # First roll: 6x5 (no 12s), second roll: 6x6 (3 pairs for 12)
        ([5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6], 10, 3),
        # First roll: 6x1 (no 12s), second roll: 6x2 (no 12s)
        ([1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2], 12, 0),
        # User requested: goal=7, roll: 3,4,5,2,1,6, count=3
        ([3, 4, 5, 2, 1, 6, 1, 1, 1, 1, 1, 1], 7, 3),
        # User requested: goal=8, roll: 5,3,6,2,4,4, count=3
        ([5, 3, 6, 2, 4, 4, 1, 1, 1, 1, 1, 1], 8, 3),
        # User requested: goal=9, roll: 6,3,5,4,1,1, count=2
        ([6, 3, 5, 4, 1, 1, 1, 1, 1, 1, 1, 1], 9, 2),
        # More: goal=5, roll: 1,2,3,4,5,6, count=1 (5)
        ([1, 2, 3, 4, 5, 6, 1, 1, 1, 1, 1, 1], 5, 1),
        # More: goal=11, roll: 6,5,4,3,2,1, count=1 (5+6)
        ([6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1], 11, 1),
        # More: goal=8, roll: 2,2,2,2,2,2, count=0 (no pairs sum to 8)
        ([2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1], 8, 0),
    ],
)
def test_dice_roller_simulate_turn(
    monkeypatch: pytest.MonkeyPatch, dummy_values: list[int], target: int, expected: int
) -> None:
    # num_dice is always 6
    assert MAX_ROW_HEIGHT == 5
    assert NUMBER_OF_DICE == 6
    assert MIN_DICE_NUM == 1
    assert MAX_DICE_NUM == 6
    assert len(dummy_values) == 12, "Dummy values should have 12 elements"
    dummy = DummyRandom(dummy_values)
    monkeypatch.setattr("random.randint", dummy.randint)
    roller = DiceRoller(num_dice=6)
    count = roller.simulate_turn(target)
    assert count == expected


def _sorted_dict(d: dict[int, int]) -> dict[int, int]:
    """Helper to sort dict for comparison."""
    return dict(sorted(d.items()))


@pytest.mark.parametrize(
    ("dice_values", "expected"),
    [
        # All singles
        ([1, 2, 3, 4, 5, 6], {1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 3, 8: 2, 9: 2, 10: 1, 11: 1}),
        # All the same
        ([2, 2, 2, 2, 2, 2], {2: 6}),
        # Three 5s
        ([5, 5, 5], {5: 3, 10: 1}),
        # Pairs
        ([1, 1, 6, 6], {1: 2, 6: 2, 7: 2, 12: 1}),
        # Mixed, some pairs
        ([1, 2, 2, 3], {1: 1, 2: 2, 3: 1}),
        # No pairs
        ([1, 3, 5, 6], {1: 1, 3: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 11: 1}),
        # 5s and 6s
        ([5, 5, 5, 6, 6, 6], {5: 3, 6: 3, 10: 1, 11: 3, 12: 1}),
        # 6s
        ([6, 6, 6, 6, 6, 6], {6: 6, 12: 3}),
        # Only one die
        ([4], {4: 1}),
        # two dice
        ([2, 5], {2: 1, 5: 1, 7: 1}),
        # three dice
        ([1, 2, 3], {1: 1, 2: 1, 3: 1}),
    ],
)
def test_dice_roll_get_available_targets(dice_values: list[int], expected: dict[int, int]) -> None:
    assert MIN_DICE_NUM == 1
    assert MAX_DICE_NUM == 6
    roll = DiceRoll(dice_values)
    result = roll.get_available_targets()
    assert _sorted_dict(result) == _sorted_dict(expected)
