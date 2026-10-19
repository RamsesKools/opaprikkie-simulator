"""Run the backend with reload and Vite with its /api proxy; Ctrl+C stops both."""

import contextlib
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

from opaprikkie.backend.settings import Settings

ROOT = Path(__file__).resolve().parent.parent
GRACE_SECONDS = 5


def main() -> int:
    settings = Settings()
    backend = [
        *(sys.executable, "-m", "uvicorn", "opaprikkie.backend.app:create_app", "--factory"),
        *("--reload", "--host", settings.host, "--port", str(settings.port)),
    ]
    env = {**os.environ, "BACKEND_URL": f"http://{settings.host}:{settings.port}"}
    signal.signal(signal.SIGTERM, signal.default_int_handler)
    processes: list[subprocess.Popen[bytes]] = []
    try:
        for command, cwd in [(backend, ROOT), (["npm", "run", "dev"], ROOT / "frontend")]:
            processes.append(subprocess.Popen(command, cwd=cwd, env=env, start_new_session=True))
        while all(process.poll() is None for process in processes):
            time.sleep(0.2)
    except KeyboardInterrupt:
        return 0
    finally:
        stop(processes)
    return 1


def stop(processes: list[subprocess.Popen[bytes]]) -> None:
    signal.signal(signal.SIGINT, signal.SIG_IGN)
    signal.signal(signal.SIGTERM, signal.SIG_IGN)
    for process in processes:
        signal_group(process, signal.SIGTERM)
    deadline = time.monotonic() + GRACE_SECONDS
    for process in processes:
        with contextlib.suppress(subprocess.TimeoutExpired):
            process.wait(timeout=max(deadline - time.monotonic(), 0))
        signal_group(process, signal.SIGKILL)
        process.wait()


def signal_group(process: subprocess.Popen[bytes], signum: int) -> None:
    # Whole groups, so npm's Vite and uvicorn's worker stop too.
    with contextlib.suppress(ProcessLookupError):
        os.killpg(process.pid, signum)


if __name__ == "__main__":
    sys.exit(main())
