import click
import uvicorn

from opaprikkie import __version__
from opaprikkie.backend.app import create_app
from opaprikkie.backend.settings import Settings


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
def simulate() -> None:
    """Run strategy matchups in batches."""
    raise click.ClickException("Simulations aren't available yet.")
