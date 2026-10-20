"""Run the frontend contract suite against a live backend in dev mode on a free port."""

import os
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SUITE = ["npm", "run", "test:contract"]
STARTUP_SECONDS = 30


def main() -> int:
    url = f"http://127.0.0.1:{free_port()}"
    env = {**os.environ, "OPAPRIKKIE_DEV_MODE": "true", "BACKEND_URL": url}
    backend = [
        *(sys.executable, "-m", "uvicorn", "opaprikkie.backend.app:create_app", "--factory"),
        *("--host", "127.0.0.1", "--port", url.rsplit(":", 1)[1], "--log-level", "warning"),
    ]
    server = subprocess.Popen(backend, cwd=ROOT, env=env)
    try:
        wait_until_up(f"{url}/api/health", server)
        return subprocess.run(SUITE, cwd=ROOT / "frontend", env=env, check=False).returncode
    finally:
        server.terminate()
        server.wait()


def free_port() -> int:
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        return probe.getsockname()[1]


def wait_until_up(url: str, server: subprocess.Popen[bytes]) -> None:
    deadline = time.monotonic() + STARTUP_SECONDS
    while True:
        try:
            urllib.request.urlopen(url, timeout=1)
            return
        except OSError:
            if server.poll() is not None or time.monotonic() > deadline:
                raise
            time.sleep(0.2)


if __name__ == "__main__":
    sys.exit(main())
