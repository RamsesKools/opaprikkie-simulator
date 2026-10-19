"""Run the backend with reload and Vite with its /api proxy; Ctrl+C stops both."""

import contextlib
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COMMANDS = [
    (
        [
            sys.executable,
            "-m",
            "uvicorn",
            "opaprikkie.backend.app:create_app",
            "--factory",
            "--reload",
        ],
        ROOT,
    ),
    (["npm", "run", "dev"], ROOT / "frontend"),
]


def main() -> int:
    signal.signal(signal.SIGTERM, signal.default_int_handler)
    processes = [
        subprocess.Popen(command, cwd=cwd, start_new_session=True) for command, cwd in COMMANDS
    ]
    try:
        while all(process.poll() is None for process in processes):
            time.sleep(0.2)
    except KeyboardInterrupt:
        return 0
    finally:
        # Signal whole process groups, so npm's Vite and uvicorn's worker stop too.
        for process in processes:
            with contextlib.suppress(ProcessLookupError):
                os.killpg(process.pid, signal.SIGTERM)
        for process in processes:
            process.wait()
    return 1


if __name__ == "__main__":
    sys.exit(main())
