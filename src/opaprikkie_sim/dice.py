"""Dice rolling functionality for Opa Prikkie game."""

import random
from collections import Counter
from dataclasses import dataclass

from opaprikkie_sim.constants import MAX_DICE_NUM, MAX_ROW_HEIGHT, MIN_DICE_NUM, NUMBER_OF_DICE

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
        """Get all possible combinations that sum to the target number.
        Each die is used only once per combination and duplicate pairs are avoided.
        """
        if target <= MAX_DICE_NUM:
            # Single dice combinations
            return [[val] for val in self.values if val == target]
        else:
            combinations: list[list[int]] = []
            used_indices: set[int] = set()
            n = len(self.values)
            # To avoid duplicates, always use i < j
            for i in range(n):
                if i in used_indices:
                    continue
                for j in range(i + 1, n):
                    if j in used_indices:
                        continue
                    if self.values[i] + self.values[j] == target:
                        combinations.append([self.values[i], self.values[j]])
                        used_indices.add(i)
                        used_indices.add(j)
                        break  # move to next i after finding a pair
            return combinations

    def get_available_targets(self) -> dict[int, int]:
        """Get all possible target numbers and the max number of combinations for each target.
        Returns a dict[int, int]: {target: count}
        """
        result: dict[int, int] = {}
        # Single dice targets
        single_counts = Counter(self.values)
        result = dict(single_counts.items())

        # Double dice targets
        n = len(self.values)

        # keep track of if a dice is already been used for a specific target
        # each dice can only be used once for a specific target
        # dict: key is target, value is list of dice index
        used_for_target: dict[int, list[int]] = {}

        for i in range(n):
            for j in range(i + 1, n):
                total = self.values[i] + self.values[j]
                if not (MAX_DICE_NUM + 1 <= total <= MAX_DICE_NUM * 2):
                    continue

                # a dice can only be used once for a specific target
                # example: we have 6, 1, 1 --> only one 7 can be formed
                # example 2: we have 5, 5, 5 --> only one 10 can be formed
                dice_used_for_target = used_for_target.get(total, [])
                if i in dice_used_for_target or j in dice_used_for_target:
                    continue

                result[total] = result.get(total, 0) + 1
                if total not in used_for_target:
                    used_for_target[total] = [i, j]
                else:
                    used_for_target[total].extend([i, j])

        return result


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

            # break when we reach the maximum score
            total_count += count
            if total_count >= MAX_ROW_HEIGHT:
                break

            if target <= MAX_DICE_NUM:
                available_dice -= count
            else:
                available_dice -= count * 2

            # If we used all dice, we can roll again
            if available_dice == 0:
                available_dice = self.num_dice

        return total_count
