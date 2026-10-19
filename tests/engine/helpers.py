import dataclasses
from types import MappingProxyType

from opaprikkie.engine import CLASSIC, GameState, Ruleset, name_players, new_game


def choosing_target(
    opening_roll: tuple[int, ...],
    rows: dict[int, int] | None = None,
    ruleset: Ruleset = CLASSIC,
    seed: int | str = "seed",
) -> GameState:
    """Player 0 about to choose a target, with the given opening roll and their pegs on `rows`."""
    state, _ = new_game(ruleset, seed)
    state, _ = name_players(state, ["Ada", "Bob"], first_player=0)
    board = dict.fromkeys(ruleset.targets, 0) | (rows or {})
    return dataclasses.replace(
        state,
        current_player=0,
        turn=1,
        continuation=0,
        opening_roll=opening_roll,
        pegs=(MappingProxyType(board), *state.pegs[1:]),
    )


def topped_except(target: int, row: int, ruleset: Ruleset = CLASSIC) -> dict[int, int]:
    return dict.fromkeys(ruleset.targets, ruleset.rows) | {target: row}
