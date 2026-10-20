from collections.abc import Mapping
from dataclasses import dataclass

from opaprikkie.engine.dice import set_aside
from opaprikkie.engine.errors import IllegalAction, Rejection
from opaprikkie.engine.ruleset import Ruleset
from opaprikkie.engine.state import GameState, Phase


@dataclass(frozen=True)
class LegalTarget:
    target: int
    matches: int
    guaranteed_moves: int
    set_aside: tuple[int, ...]


def legal_targets(
    ruleset: Ruleset, pegs: Mapping[int, int], opening_roll: tuple[int, ...]
) -> tuple[LegalTarget, ...]:
    found = []
    for target, row in pegs.items():
        taken = set_aside(ruleset, target, opening_roll)
        matches = len(taken) // ruleset.targets[target]
        if row < ruleset.rows and matches:
            found.append(LegalTarget(target, matches, min(matches, ruleset.rows - row), taken))
    return tuple(found)


@dataclass(frozen=True)
class Observation:
    ruleset: Ruleset
    seat: int
    pegs: tuple[Mapping[int, int], ...]
    opening_roll: tuple[int, ...]
    legal_targets: tuple[LegalTarget, ...]
    turn: int
    continuation: int


def observe(state: GameState) -> Observation:
    """What the current seat sees at a choice point."""
    if state.phase not in (Phase.CHOOSING_FIRST_PLAYER, Phase.CHOOSING_TARGET):
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
        legal_targets=legal_targets(state.ruleset, state.pegs[seat], state.opening_roll),
        turn=state.turn,
        continuation=state.continuation,
    )
