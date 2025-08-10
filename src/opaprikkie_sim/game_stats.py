"""Classes and methods for tracking game statistics."""

from dataclasses import dataclass

from opaprikkie_sim.dice import DiceRoll


@dataclass
class GameStats:
    """Class to track game statistics."""

    game_package_version: str
    game_seed: int
    dice_rolls: dict[int, int]
    total_turns: int = 0
    number_of_players: int = 0

    def add_dice_rolls(self, dice_roll: DiceRoll) -> None:
        """Add a dice roll to the statistics."""
        dice_combinations = dice_roll.get_available_targets()
        for roll, count in dice_combinations.items():
            if roll not in self.dice_rolls:
                self.dice_rolls[roll] = 0
            self.dice_rolls[roll] += count
