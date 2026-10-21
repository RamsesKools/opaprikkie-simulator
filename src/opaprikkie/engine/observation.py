from collections.abc import Mapping
from dataclasses import dataclass
from enum import StrEnum
from functools import cached_property
from itertools import combinations

from opaprikkie.engine.dice import set_aside
from opaprikkie.engine.errors import IllegalAction, Rejection
from opaprikkie.engine.ruleset import Ruleset
from opaprikkie.engine.state import GameState, Phase, SequenceInProgress


@dataclass(frozen=True)
class LegalTarget:
    target: int
    matches: int
    guaranteed_moves: int
    set_aside: tuple[int, ...]


def legal_targets(
    ruleset: Ruleset, pegs: Mapping[int, int], opening_roll: tuple[int, ...]
) -> tuple[LegalTarget, ...]:
    found = (_legal_target(ruleset, target, row, opening_roll) for target, row in pegs.items())
    return tuple(target for target in found if target is not None)


def _legal_target(
    ruleset: Ruleset, target: int, row: int, dice: tuple[int, ...]
) -> LegalTarget | None:
    taken = set_aside(ruleset, target, dice)
    matches = len(taken) // ruleset.targets[target]
    if row >= ruleset.rows or not matches:
        return None
    return LegalTarget(target, matches, min(matches, ruleset.rows - row), taken)


class TakeOutcome(StrEnum):
    """What a take leads to: the rest are thrown, all dice are thrown again, the peg is topped,
    the sequence ends because too few dice are left, or the game is won."""

    THROW = "throw"
    RESET = "reset"
    TOPPED = "topped"
    ENDS = "ends"
    WINS = "wins"


def take_outcome(
    ruleset: Ruleset, pegs: Mapping[int, int], target: int, matches: int, remaining: int
) -> tuple[TakeOutcome, int]:
    """The outcome once `matches` are taken in the sequence so far with `remaining` dice left
    on the table, and how many dice are thrown next."""
    if matches >= ruleset.rows - pegs[target]:
        if all(row == ruleset.rows for other, row in pegs.items() if other != target):
            return TakeOutcome.WINS, 0
        return TakeOutcome.TOPPED, ruleset.dice_count
    if remaining == 0:
        return TakeOutcome.RESET, ruleset.dice_count
    if remaining < ruleset.targets[target]:
        return TakeOutcome.ENDS, 0
    return TakeOutcome.THROW, remaining


@dataclass(frozen=True)
class TakeOption:
    """Dice the player may take for `target`, as places in the roll on the table, the row the peg
    would then reach, what the take leads to, and how many dice are thrown next."""

    target: int
    dice: tuple[int, ...]
    matches: int
    row: int
    outcome: TakeOutcome
    next_dice: int


@dataclass(frozen=True)
class Observation:
    ruleset: Ruleset
    seat: int
    pegs: tuple[Mapping[int, int], ...]
    opening_roll: tuple[int, ...]
    legal_targets: tuple[LegalTarget, ...]
    turn: int
    continuation: int
    sequence: SequenceInProgress | None = None

    @cached_property
    def takes(self) -> tuple[TakeOption, ...]:
        """Every valid take for the roll on the table, by target, then by fewest dice.

        Computed on first use, so strategies, which only choose targets, don't pay for it.
        """
        sequence = self.sequence
        dice = self.opening_roll if sequence is None else sequence.dice
        taken = 0 if sequence is None else sequence.matches
        found = []
        for legal in self.legal_targets:
            combo_size = self.ruleset.targets[legal.target]
            pegs = self.pegs[self.seat]
            for count in range(combo_size, len(legal.set_aside) + 1, combo_size):
                total = taken + count // combo_size
                row = min(pegs[legal.target] + total, self.ruleset.rows)
                outcome = take_outcome(self.ruleset, pegs, legal.target, total, len(dice) - count)
                for chosen in combinations(range(len(dice)), count):
                    values = [dice[i] for i in chosen]
                    if len(set_aside(self.ruleset, legal.target, values)) == count:
                        found.append(
                            TakeOption(legal.target, chosen, count // combo_size, row, *outcome)
                        )
        return tuple(found)


def observe(state: GameState) -> Observation:
    """What the current seat sees at a choice point."""
    if state.phase not in (Phase.CHOOSING_FIRST_PLAYER, Phase.CHOOSING_TARGET, Phase.CHOOSING_DICE):
        raise IllegalAction(
            Rejection.WRONG_PHASE,
            f"nothing to observe while {state.phase}",
            phase=state.phase.value,
        )
    assert state.current_player is not None
    seat = state.current_player
    return Observation(
        ruleset=state.ruleset,
        seat=seat,
        pegs=state.pegs,
        opening_roll=state.opening_roll,
        legal_targets=_legal_now(state, seat),
        turn=state.turn,
        continuation=state.continuation,
        sequence=state.sequence,
    )


def _legal_now(state: GameState, seat: int) -> tuple[LegalTarget, ...]:
    """Legal targets for the opening roll, or during a sequence the locked one for its throw."""
    sequence = state.sequence
    if sequence is None:
        return legal_targets(state.ruleset, state.pegs[seat], state.opening_roll)
    row = state.pegs[seat][sequence.target] + sequence.matches
    found = _legal_target(state.ruleset, sequence.target, row, sequence.dice)
    return () if found is None else (found,)
