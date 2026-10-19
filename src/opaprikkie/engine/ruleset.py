from collections.abc import Mapping
from dataclasses import dataclass
from enum import StrEnum

from opaprikkie.engine.frozen_map import FrozenMap


class StartRule(StrEnum):
    DICE_OFF = "dice_off"


class EndRule(StrEnum):
    IMMEDIATE = "immediate"


SUPPORTED_COMBO_SIZES = (1, 2)


@dataclass(frozen=True)
class Ruleset:
    """Game dimensions; `targets` maps each target to its combo size."""

    name: str
    players: int
    dice_count: int
    dice_faces: int
    rows: int
    targets: Mapping[int, int]
    start_rule: StartRule
    end_rule: EndRule

    def __post_init__(self) -> None:
        object.__setattr__(self, "targets", FrozenMap(self.targets))
        _validate(self)


def _validate(ruleset: Ruleset) -> None:
    if not ruleset.name:
        raise ValueError("a ruleset needs a name")
    if ruleset.players < 2:
        raise ValueError("a game needs at least 2 players")
    if ruleset.dice_count < 1:
        raise ValueError("a game needs at least 1 die")
    if ruleset.dice_faces < 2:
        raise ValueError("dice need at least 2 faces")
    if ruleset.rows < 1:
        raise ValueError("a board needs at least 1 row")
    if not ruleset.targets:
        raise ValueError("a board needs at least 1 target")
    for target, combo_size in ruleset.targets.items():
        if combo_size not in SUPPORTED_COMBO_SIZES:
            raise ValueError(f"combo size {combo_size} is not supported")
        if combo_size > ruleset.dice_count:
            raise ValueError(f"target {target} needs more dice than the game has")
        if not combo_size <= target <= combo_size * ruleset.dice_faces:
            raise ValueError(f"target {target} can't be made from {combo_size} dice")
    if not isinstance(ruleset.start_rule, StartRule):
        raise ValueError(f"start rule {ruleset.start_rule} is not supported")
    if not isinstance(ruleset.end_rule, EndRule):
        raise ValueError(f"end rule {ruleset.end_rule} is not supported")


CLASSIC = Ruleset(
    name="classic",
    players=2,
    dice_count=6,
    dice_faces=6,
    rows=5,
    targets={target: 1 if target <= 6 else 2 for target in range(1, 13)},
    start_rule=StartRule.DICE_OFF,
    end_rule=EndRule.IMMEDIATE,
)
