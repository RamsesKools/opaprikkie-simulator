from collections.abc import Sequence
from dataclasses import dataclass
from random import Random

from opaprikkie.engine import (
    BUILTIN_STRATEGIES,
    HandStrategy,
    IllegalAction,
    Observation,
    Strategy,
    TakeOption,
)
from opaprikkie.sim.driver import GameDriver, InProcessDriver
from opaprikkie.sim.stats import BatchStats, GameResult, game_result, summarize


@dataclass(frozen=True)
class BatchResult:
    strategies: tuple[str, ...]
    seed: str
    games: tuple[GameResult, ...]

    @property
    def stats(self) -> BatchStats:
        return summarize(self.strategies, self.games)


def run_batch(
    strategies: Sequence[str | Strategy],
    games: int,
    seed: str,
    driver: GameDriver | None = None,
) -> BatchResult:
    """Plays `games` seeded games, alternating the first player; an illegal choice fails fast."""
    if games < 1:
        raise ValueError("a batch needs at least 1 game")
    driver = driver or InProcessDriver()
    seats = tuple(_resolve(strategy) for strategy in strategies)
    if len(seats) != driver.ruleset.players:
        raise ValueError(f"expected {driver.ruleset.players} strategies, got {len(seats)}")
    results = []
    for index in range(games):
        game_seed = f"{seed}:{index}"
        first_player = index % len(seats)
        chooser = _Chooser(seats, game_seed)
        try:
            played = driver.play(game_seed, first_player, chooser)
        except IllegalAction as error:
            error.add_note(chooser.blame(game_seed))
            raise
        results.append(game_result(game_seed, first_player, played.winner, played.log, len(seats)))
    return BatchResult(tuple(s.name for s in seats), seed, tuple(results))


def _resolve(strategy: str | Strategy) -> Strategy:
    if not isinstance(strategy, str):
        return strategy
    if strategy not in BUILTIN_STRATEGIES:
        known = ", ".join(sorted(BUILTIN_STRATEGIES))
        raise ValueError(f"unknown strategy {strategy!r}, expected one of {known}")
    return BUILTIN_STRATEGIES[strategy]


class _Chooser:
    """Asks each seat's strategy, with an rng per seat derived from the game seed."""

    def __init__(self, seats: tuple[Strategy, ...], game_seed: str) -> None:
        self.seats = seats
        self.rngs = [Random(f"{game_seed}:strategy:{seat}") for seat in range(len(seats))]
        self.seat: int | None = None

    def __call__(self, observation: Observation) -> int | TakeOption:
        self.seat = observation.seat
        strategy, rng = self.seats[self.seat], self.rngs[self.seat]
        if isinstance(strategy, HandStrategy):
            return strategy.choose_take(observation, rng)
        return strategy.choose_target(observation, rng)

    def blame(self, game_seed: str) -> str:
        if self.seat is None:
            return f"game {game_seed!r}"
        return f"{self.seats[self.seat].name} in seat {self.seat} of game {game_seed!r}"
