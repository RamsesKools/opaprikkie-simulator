"""Dice rolling functionality for Opa Prikkie game."""

import random
from dataclasses import dataclass

from opaprikkie_sim.constants import MAX_DICE_NUM, MIN_DICE_NUM, NUMBER_OF_DICE

# Allow randomnumber generators in this context
# ruff: noqa: S311


@dataclass
class DiceRoll:
    """Represents a single dice roll result."""

    values: list[int]
    target_number: int | None = None

    def count_target(self, target: int) -> int:
        """Count how many times the target number appears in this roll."""
        return self.values.count(target)

    def get_combinations_for_target(self, target: int) -> list[list[int]]:
        """Get all possible combinations that sum to the target number."""
        if target <= MAX_DICE_NUM:
            # Single dice combinations
            return [[val] for val in self.values if val == target]
        else:
            # Two dice combinations
            combinations = []
            for i, val1 in enumerate(self.values):
                for j, val2 in enumerate(self.values):
                    if i != j and val1 + val2 == target:
                        combinations.append([val1, val2])
            return combinations


class DiceRoller:
    """Handles dice rolling for the Opa Prikkie game."""

    def __init__(self, num_dice: int = NUMBER_OF_DICE):
        self.num_dice = num_dice

    def roll(self) -> DiceRoll:
        """Roll all dice and return the result."""
        values = [random.randint(MIN_DICE_NUM, MAX_DICE_NUM) for _ in range(self.num_dice)]
        return DiceRoll(values=values)

    def roll_remaining(self, remaining_dice: int) -> DiceRoll:
        """Roll the remaining dice after some have been set aside."""
        values = [random.randint(MIN_DICE_NUM, MAX_DICE_NUM) for _ in range(remaining_dice)]
        return DiceRoll(values=values)

    def get_available_targets(self, roll: DiceRoll) -> list[int]:
        """Get all possible target numbers that can be saved from this roll."""
        targets = set()

        for value in roll.values:
            targets.add(value)

        for i, val1 in enumerate(roll.values):
            for j, val2 in enumerate(roll.values):
                if i != j:
                    total = val1 + val2
                    if MIN_DICE_NUM + 1 <= total <= MAX_DICE_NUM * 2:
                        targets.add(total)

        return sorted(targets)

    def simulate_turn(self, target: int) -> int:
        """Simulate a complete turn for a given target number."""
        total_count = 0
        available_dice = self.num_dice

        while available_dice > 0:
            roll = self.roll_remaining(available_dice)

            if target <= MAX_DICE_NUM:
                # Single dice target
                count = roll.count_target(target)
            else:
                # Two dice target
                combinations = roll.get_combinations_for_target(target)
                count = len(combinations)
                # Each combination uses 2 dice
                count = min(count, available_dice // 2)

            if count == 0:
                break

            total_count += count
            if target <= MAX_DICE_NUM:
                available_dice -= count
            else:
                available_dice -= count * 2

            # If we used all dice, we can roll again
            if available_dice == 0:
                available_dice = self.num_dice

        return total_count
