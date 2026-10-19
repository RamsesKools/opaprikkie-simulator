from dataclasses import dataclass, field
from typing import Literal


@dataclass(frozen=True)
class DiceOffRoll:
    player: int
    dice: tuple[int, ...]


@dataclass(frozen=True)
class DiceOffRound:
    rolls: tuple[DiceOffRoll, ...]
    kind: Literal["dice_off"] = field(default="dice_off", init=False)


@dataclass(frozen=True)
class Roll:
    dice: tuple[int, ...]
    set_aside: tuple[int, ...]
    reset: bool


@dataclass(frozen=True)
class RollSequence:
    player: int
    turn: int
    continuation: int
    target: int
    rolls: tuple[Roll, ...]
    matches: int
    movement: int
    kind: Literal["roll_sequence"] = field(default="roll_sequence", init=False)


@dataclass(frozen=True)
class NoMove:
    """An opening roll without a legal target; on continuation 0 it's a dead turn."""

    player: int
    turn: int
    continuation: int
    opening_roll: tuple[int, ...]
    kind: Literal["no_move"] = field(default="no_move", init=False)


type LogEntry = DiceOffRound | RollSequence | NoMove
type Log = tuple[LogEntry, ...]
