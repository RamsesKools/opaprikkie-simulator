"""Classes and methods for tracking game statistics."""

from dataclasses import dataclass


@dataclass
class GameStats:
    """Class to track game statistics."""

    game_package_version: str
    game_seed: int
    total_turns: int = 0
    number_of_players: int = 0
