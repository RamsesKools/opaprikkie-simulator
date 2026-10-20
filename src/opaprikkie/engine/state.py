from collections.abc import Mapping
from dataclasses import dataclass
from enum import StrEnum

from opaprikkie.engine.frozen_map import FrozenMap
from opaprikkie.engine.log import Roll
from opaprikkie.engine.ruleset import Ruleset


class Phase(StrEnum):
    NAMING = "naming"
    CHOOSING_FIRST_PLAYER = "choosing_first_player"
    CHOOSING_TARGET = "choosing_target"
    CHOOSING_DICE = "choosing_dice"
    FINISHED = "finished"


@dataclass(frozen=True)
class SequenceInProgress:
    """A roll sequence played by hand: the rolls taken so far and the throw on the table."""

    target: int
    rolls: tuple[Roll, ...]
    dice: tuple[int, ...]
    reset: bool

    @property
    def matches(self) -> int:
        return sum(roll.matches for roll in self.rolls)


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
    sequence: SequenceInProgress | None = None
    winner: int | None = None

    def __post_init__(self) -> None:
        pegs = tuple(rows if isinstance(rows, FrozenMap) else FrozenMap(rows) for rows in self.pegs)
        object.__setattr__(self, "pegs", pegs)
