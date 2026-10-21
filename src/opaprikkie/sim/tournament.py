from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from itertools import combinations
from types import MappingProxyType

from opaprikkie.sim.batch import run_batch
from opaprikkie.sim.driver import GameDriver


@dataclass(frozen=True)
class Standing:
    strategy: str
    wins: int
    games: int

    @property
    def win_rate(self) -> float:
        return self.wins / self.games


@dataclass(frozen=True)
class TournamentResult:
    """`wins[a, b]` counts the games `a` won against `b`, out of `games` per pair."""

    strategies: tuple[str, ...]
    games: int
    seed: str
    wins: Mapping[tuple[str, str], int]

    def win_rate(self, strategy: str, opponent: str) -> float:
        return self.wins[strategy, opponent] / self.games

    def overall(self, strategy: str) -> Standing:
        opponents = [other for other in self.strategies if other != strategy]
        won = sum(self.wins[strategy, other] for other in opponents)
        return Standing(strategy, won, self.games * len(opponents))

    def ranking(self) -> tuple[Standing, ...]:
        """Best overall win rate first; ties keep the given order."""
        standings = (self.overall(strategy) for strategy in self.strategies)
        return tuple(sorted(standings, key=lambda standing: -standing.win_rate))


def run_tournament(
    strategies: Sequence[str],
    games: int,
    seed: str,
    driver: GameDriver | None = None,
) -> TournamentResult:
    """A round robin of head-to-head batches, one per pair, each seeded from `seed` and the pair."""
    if len(strategies) < 2:
        raise ValueError("a tournament needs at least 2 strategies")
    if len(set(strategies)) != len(strategies):
        raise ValueError("a tournament needs each strategy once")
    wins: dict[tuple[str, str], int] = {}
    for first, second in combinations(strategies, 2):
        batch = run_batch([first, second], games, f"{seed}:{first}:{second}", driver)
        wins[first, second], wins[second, first] = (seat.wins for seat in batch.stats.seats)
    return TournamentResult(tuple(strategies), games, seed, MappingProxyType(wins))
