import time
from collections.abc import Callable

from fastapi import APIRouter, FastAPI
from pydantic import BaseModel

from opaprikkie import __version__, engine
from opaprikkie.backend.errors import add_error_handlers
from opaprikkie.backend.routes import game_routes
from opaprikkie.backend.settings import Settings
from opaprikkie.backend.spa import mount_spa


class Health(BaseModel):
    """The version handshake; `strategies` lists the built-ins in dev mode only."""

    version: str
    dev_mode: bool
    strategies: list[str] | None


def create_app(
    settings: Settings | None = None, clock: Callable[[], float] = time.monotonic
) -> FastAPI:
    settings = settings or Settings()
    app = FastAPI(
        title="Opa Prikkie",
        version=__version__,
        docs_url="/docs" if settings.dev_mode else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.dev_mode else None,
    )
    app.state.settings = settings
    add_error_handlers(app)
    api = APIRouter(prefix="/api")

    @api.get("/health")
    def health() -> Health:
        strategies = sorted(engine.BUILTIN_STRATEGIES) if settings.dev_mode else None
        return Health(version=__version__, dev_mode=settings.dev_mode, strategies=strategies)

    api.include_router(game_routes(settings, clock))
    app.include_router(api)
    # Keep last: the `/` mount shadows any route added after it.
    mount_spa(app, settings.static_dir)
    return app
