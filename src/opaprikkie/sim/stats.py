from collections.abc import Sequence
from dataclasses import dataclass
from statistics import fmean

from opaprikkie.engine import Log, NoMove, RollSequence


@dataclass(frozen=True)
class GameResult:
    """One game's outcome; `turns` counts both players' turns, the others are per seat."""

    seed: str
    first_player: int
    winner: int
    turns: int
    continuations: tuple[int, ...]
    dead_turns: tuple[int, ...]


def game_result(seed: str, first_player: int, winner: int, log: Log, players: int) -> GameResult:
    choices = [entry for entry in log if isinstance(entry, RollSequence | NoMove)]
    if not choices:
        raise ValueError(f"game {seed!r} has no turns in its log")
    continuations = [0] * players
    dead_turns = [0] * players
    for entry in choices:
        if entry.continuation:
            continuations[entry.player] += 1
        elif isinstance(entry, NoMove):
            dead_turns[entry.player] += 1
    return GameResult(
        seed,
        first_player,
        winner,
        max(entry.turn for entry in choices),
        tuple(continuations),
        tuple(dead_turns),
    )


@dataclass(frozen=True)
class SeatStats:
    """`continuations` and `dead_turns` are means per game."""

    strategy: str
    wins: int
    win_rate: float
    continuations: float
    dead_turns: float


@dataclass(frozen=True)
class BatchStats:
    games: int
    seats: tuple[SeatStats, ...]
    mean_turns: float
    min_turns: int
    max_turns: int


def summarize(strategies: Sequence[str], games: Sequence[GameResult]) -> BatchStats:
    seats = []
    for seat, strategy in enumerate(strategies):
        wins = sum(game.winner == seat for game in games)
        seats.append(
            SeatStats(
                strategy,
                wins,
                wins / len(games),
                fmean(game.continuations[seat] for game in games),
                fmean(game.dead_turns[seat] for game in games),
            )
        )
    turns = [game.turns for game in games]
    return BatchStats(len(games), tuple(seats), fmean(turns), min(turns), max(turns))
