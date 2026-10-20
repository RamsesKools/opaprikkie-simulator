from collections.abc import Mapping
from dataclasses import dataclass

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
