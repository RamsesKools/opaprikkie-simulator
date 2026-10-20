"""Time `opaprikkie simulate` in-process and over HTTP on the same seeded batches."""

import argparse
import os
import platform
import socket
import statistics
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

from opaprikkie import __version__

ROOT = Path(__file__).resolve().parent.parent
CLI = Path(sys.executable).with_name("opaprikkie")
MATCHUPS = (("random", "random"), ("smart", "greedy"))
STARTUP_SECONDS = 30
GRACE_SECONDS = 5


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--games", type=int, nargs="+", default=[1, 50, 500])
    parser.add_argument("--repeats", type=int, default=3)
    parser.add_argument("--seed", default="bench")
    args = parser.parse_args(argv)

    port = free_port()
    url = f"http://127.0.0.1:{port}"
    env = {**os.environ, "OPAPRIKKIE_DEV_MODE": "true", "OPAPRIKKIE_PORT": str(port)}
    started = time.perf_counter()
    server = subprocess.Popen(
        [CLI, "serve"], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )
    try:
        wait_until_up(f"{url}/api/health", server)
        print(f"opaprikkie {__version__}, Python {platform.python_version()}")
        print(f"{platform.platform()}, server startup {time.perf_counter() - started:.2f} s\n")
        print("| Matchup | Games | Path | Median s | Games/s | Parity |")
        print("| -- | -- | -- | -- | -- | -- |")
        same = [
            bench(strategies, games, args.seed, args.repeats, url)
            for strategies in MATCHUPS
            for games in args.games
        ]
    finally:
        stop(server)
    return 0 if all(same) else 1


def bench(strategies: tuple[str, ...], games: int, seed: str, repeats: int, url: str) -> bool:
    """Prints a row per path and returns whether every run printed the same summary."""
    runs = {
        path: [simulate(strategies, games, seed, target) for _ in range(repeats)]
        for path, target in (("in-process", None), ("HTTP", url))
    }
    same = len({out for timed in runs.values() for _, out in timed}) == 1
    for path, timed in runs.items():
        seconds = statistics.median(s for s, _ in timed)
        print(
            f"| {' vs '.join(strategies)} | {games} | {path} | {seconds:.2f}"
            f" | {games / seconds:.1f} | {'same' if same else 'DIFFERS'} |"
        )
    return same


def simulate(
    strategies: tuple[str, ...], games: int, seed: str, url: str | None
) -> tuple[float, str]:
    command = [CLI, "simulate", *strategies, "-n", str(games), "-s", seed]
    if url:
        command += ["--url", url]
    started = time.perf_counter()
    out = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return time.perf_counter() - started, out


def stop(server: subprocess.Popen[bytes]) -> None:
    server.terminate()
    try:
        server.wait(timeout=GRACE_SECONDS)
    except subprocess.TimeoutExpired:
        server.kill()
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
                raise SystemExit("backend did not start") from None
            time.sleep(0.05)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
