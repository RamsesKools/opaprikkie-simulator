import pytest

from opaprikkie_sim.constants import MAX_DICE_NUM
from opaprikkie_sim.dice import DiceRoll, DiceRoller


class DummyRandom:
    def __init__(self, values):
        self.values = values
        self.index = 0

    def randint(self, a, b):
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
):
    roll = DiceRoll(dice_values)
    combos = roll.get_combinations_for_target(target)
    # For two-dice combos, sort inner lists for comparison
    if target > MAX_DICE_NUM:
        assert sorted([sorted(pair) for pair in combos]) == sorted(
            [sorted(pair) for pair in expected]
        )
    else:
        assert combos == expected


def test_dice_roller_roll(monkeypatch):
    dummy = DummyRandom([2, 3, 4])
    monkeypatch.setattr("random.randint", dummy.randint)
    roller = DiceRoller(num_dice=3)
    roll = roller.roll()
    assert roll.values == [2, 3, 4]


def test_dice_roller_roll_remaining(monkeypatch):
    dummy = DummyRandom([1, 6])
    monkeypatch.setattr("random.randint", dummy.randint)
    roller = DiceRoller(num_dice=2)
    roll = roller.roll_remaining(2)
    assert roll.values == [1, 6]


def test_dice_roller_get_available_targets():
    roller = DiceRoller(num_dice=3)
    roll = DiceRoll([1, 2, 3])
    targets = roller.get_available_targets(roll)
    # singles: 1,2,3; doubles: 1+2=3, 1+3=4, 2+3=5
    assert set(targets) == {1, 2, 3, 4, 5}


def test_dice_roller_simulate_turn(monkeypatch):
    # Always roll [2,2,2]
    dummy = DummyRandom([2, 2, 2])
    monkeypatch.setattr("random.randint", dummy.randint)
    roller = DiceRoller(num_dice=3)
    # Target 2: should always get 3 per roll, then reset
    count = roller.simulate_turn(2)
    assert count > 0
    # Target 4: only possible as 2+2, so 3 dice -> 1 combo per roll
    count_double = roller.simulate_turn(4)
    assert count_double > 0
