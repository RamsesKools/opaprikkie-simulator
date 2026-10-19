from collections.abc import Callable
from dataclasses import dataclass
from typing import Protocol

from opaprikkie.engine import (
    CLASSIC,
    Log,
    Observation,
    Phase,
    Ruleset,
    choose_target,
    name_players,
    new_game,
    observe,
)

type Chooser = Callable[[Observation], int]


@dataclass(frozen=True)
class PlayedGame:
    winner: int
    log: Log


class GameDriver(Protocol):
    """Plays one game from `seed` with `first_player` starting, asking `choose` for every target."""

    @property
    def ruleset(self) -> Ruleset: ...

    def play(self, seed: str, first_player: int, choose: Chooser) -> PlayedGame: ...


class InProcessDriver:
    def __init__(self, ruleset: Ruleset = CLASSIC) -> None:
        self.ruleset = ruleset

    def play(self, seed: str, first_player: int, choose: Chooser) -> PlayedGame:
        names = [f"Seat {seat + 1}" for seat in range(self.ruleset.players)]
        state, log = new_game(self.ruleset, seed)
        state, entries = name_players(state, names, first_player)
        log += entries
        while state.phase is not Phase.FINISHED:
            state, entries = choose_target(state, choose(observe(state)))
            log += entries
        assert state.winner is not None
        return PlayedGame(state.winner, log)
