import secrets

import click
import uvicorn

from opaprikkie import __version__
from opaprikkie.backend.app import create_app
from opaprikkie.backend.settings import Settings
from opaprikkie.engine import BUILTIN_STRATEGIES, CLASSIC
from opaprikkie.sim import BatchStats, run_batch


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
def simulate(strategies: tuple[str, ...], games: int, seed: str | None) -> None:
    """Play STRATEGIES against each other, one per seat, and print a summary."""
    seed = seed or secrets.token_hex(4)
    stats = run_batch(strategies, games, seed).stats
    click.echo(f"{games} games of {' vs '.join(strategies)}, seed {seed}")
    click.echo(_summary(stats))


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
