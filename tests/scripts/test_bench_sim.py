import subprocess
import sys

import pytest

STUBBORN = """
import signal, time
signal.signal(signal.SIGTERM, signal.SIG_IGN)
print(flush=True)
time.sleep(60)
"""


def test_prints_a_row_per_matchup_size_and_path_with_parity(bench_sim, capsys):
    assert bench_sim.main(["--games", "1", "2", "--repeats", "1"]) == 0

    rows = [line for line in capsys.readouterr().out.splitlines() if line.endswith("| same |")]
    assert len(rows) == len(bench_sim.MATCHUPS) * 2 * 2
    assert "| smart vs greedy | 2 | HTTP |" in rows[-1]


def test_fails_when_the_paths_disagree(bench_sim, monkeypatch, capsys):
    outputs = iter(["a", "b"])
    monkeypatch.setattr(bench_sim, "simulate", lambda *_: (1.0, next(outputs)))
    monkeypatch.setattr(bench_sim, "MATCHUPS", (("random", "random"),))

    assert bench_sim.main(["--games", "1", "--repeats", "1"]) == 1

    assert "| DIFFERS |" in capsys.readouterr().out


def test_fails_when_the_backend_doesnt_start(bench_sim, monkeypatch):
    monkeypatch.setattr(bench_sim, "CLI", "false")

    with pytest.raises(SystemExit, match="backend did not start"):
        bench_sim.main([])


def test_kills_a_server_that_ignores_sigterm(bench_sim, monkeypatch):
    monkeypatch.setattr(bench_sim, "GRACE_SECONDS", 0.2)
    server = subprocess.Popen([sys.executable, "-c", STUBBORN], stdout=subprocess.PIPE)
    assert server.stdout
    server.stdout.readline()

    bench_sim.stop(server)

    assert server.returncode == -9
