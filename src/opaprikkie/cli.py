import secrets
from collections.abc import Callable

import click
import httpx2
import uvicorn

from opaprikkie import __version__
from opaprikkie.backend.app import create_app
from opaprikkie.backend.settings import Settings
from opaprikkie.engine import BUILTIN_STRATEGIES, CLASSIC
from opaprikkie.sim import (
    BackendError,
    BatchStats,
    GameDriver,
    HttpDriver,
    TournamentResult,
    run_batch,
    run_tournament,
)


@click.group()
@click.version_option(__version__, prog_name="opaprikkie")
def main() -> None:
    """Play and simulate Opa Prikkie."""


@main.command()
def serve() -> None:
    """Start the backend and the browser game."""
    settings = Settings()
    uvicorn.run(create_app(settings), host=settings.host, port=settings.port)


@main.command()
@click.argument("strategies", nargs=CLASSIC.players, type=click.Choice(sorted(BUILTIN_STRATEGIES)))
@click.option("-n", "--games", default=1000, show_default=True, type=click.IntRange(min=1))
@click.option("-s", "--seed", help="Batch seed; a random one is picked and printed if omitted.")
@click.option("--url", help="Play over HTTP against the backend at URL, in dev mode.")
def simulate(strategies: tuple[str, ...], games: int, seed: str | None, url: str | None) -> None:
    """Play STRATEGIES against each other, one per seat, and print a summary."""
    seed = seed or secrets.token_hex(4)
    if url is None:
        stats = run_batch(strategies, games, seed).stats
    else:
        stats = _over_http(url, strategies, games, seed)
    click.echo(f"{games} games of {' vs '.join(strategies)}, seed {seed}")
    click.echo(_summary(stats))


@main.command()
@click.argument(
    "strategies", nargs=-1, required=True, type=click.Choice(sorted(BUILTIN_STRATEGIES))
)
@click.option("-n", "--games", default=1000, show_default=True, type=click.IntRange(min=1))
@click.option(
    "-s", "--seed", help="Tournament seed; a random one is picked and printed if omitted."
)
@click.option("--url", help="Play over HTTP against the backend at URL, in dev mode.")
def tournament(strategies: tuple[str, ...], games: int, seed: str | None, url: str | None) -> None:
    """Play every pair of STRATEGIES head to head, and print the matrix and the ranking."""
    if len(strategies) < 2:
        raise click.UsageError("a tournament needs at least 2 strategies")
    if len(set(strategies)) != len(strategies):
        raise click.UsageError("a tournament needs each strategy once")
    seed = seed or secrets.token_hex(4)
    if url is None:
        result = run_tournament(strategies, games, seed)
    else:
        result = _with_backend(url, lambda driver: run_tournament(strategies, games, seed, driver))
    click.echo(f"{len(strategies)} strategies, {games} games per pair, seed {seed}")
    click.echo(_tournament_summary(result))


def _over_http(url: str, strategies: tuple[str, ...], games: int, seed: str) -> BatchStats:
    return _with_backend(url, lambda driver: run_batch(strategies, games, seed, driver).stats)


def _with_backend[T](url: str, play: Callable[[GameDriver], T]) -> T:
    try:
        with httpx2.Client(base_url=url) as client:
            return play(HttpDriver(client))
    except BackendError as error:
        raise click.ClickException(str(error)) from error
    except httpx2.TransportError as error:
        raise click.ClickException(f"can't reach the backend at {url}: {error}") from error


def _summary(stats: BatchStats) -> str:
    lines = [
        f"Seat {seat}  {s.strategy}  wins {s.wins} ({s.win_rate:.1%})"
        f"  continuations {s.continuations:.2f}/game  dead turns {s.dead_turns:.2f}/game"
        for seat, s in enumerate(stats.seats, start=1)
    ]
    lines.append(
        f"Turns per game (both players): mean {stats.mean_turns:.1f},"
        f" min {stats.min_turns}, max {stats.max_turns}"
    )
    return "\n".join(lines)


def _tournament_summary(result: TournamentResult) -> str:
    names = result.strategies
    width = max(len(name) for name in names)
    columns = {name: max(len(name), 6) for name in names}

    def row(label: str, cells: list[str]) -> str:
        shown = (f"{cell:>{columns[name]}}" for cell, name in zip(cells, names, strict=True))
        return f"{label:<{width}}  " + "  ".join(shown)

    lines = ["Win rate of row against column", row("", list(names))]
    for strategy in names:
        rates = [
            "-" if other == strategy else f"{result.win_rate(strategy, other):.1%}"
            for other in names
        ]
        lines.append(row(strategy, rates))
    lines += ["", "Ranking by overall win rate"]
    for place, standing in enumerate(result.ranking(), start=1):
        lines.append(
            f"{place}  {standing.strategy:<{width}}  {standing.win_rate:.1%}"
            f"  ({standing.wins}/{standing.games})"
        )
    return "\n".join(lines)
