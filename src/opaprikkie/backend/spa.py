from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles


def mount_spa(app: FastAPI, static_dir: Path) -> None:
    """Serve the built SPA at `/` when it exists."""
    if static_dir.is_dir():
        app.mount("/", StaticFiles(directory=static_dir, html=True), name="spa")
