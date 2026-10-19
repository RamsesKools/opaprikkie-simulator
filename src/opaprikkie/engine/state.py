from collections.abc import Mapping
from dataclasses import dataclass
from enum import StrEnum

from opaprikkie.engine.ruleset import Ruleset


class Phase(StrEnum):
    NAMING = "naming"
    CHOOSING_FIRST_PLAYER = "choosing_first_player"
    CHOOSING_TARGET = "choosing_target"
    FINISHED = "finished"


@dataclass(frozen=True)
class GameState:
    """`pegs` holds each player's row per target; `current_player` is whoever chooses next."""

    ruleset: Ruleset
    seed: int | str
    phase: Phase
    pegs: tuple[Mapping[int, int], ...]
    roll_index: int = 0
    names: tuple[str, ...] = ()
    current_player: int | None = None
    turn: int = 0
    continuation: int = 0
    opening_roll: tuple[int, ...] = ()
    winner: int | None = None
