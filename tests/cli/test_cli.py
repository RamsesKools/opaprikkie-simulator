import pytest
from click.testing import CliRunner

from opaprikkie import __version__, cli


def test_serve_runs_the_app_on_the_configured_address(monkeypatch):
    calls = []
    monkeypatch.setenv("OPAPRIKKIE_PORT", "9001")
    monkeypatch.setattr(cli.uvicorn, "run", lambda app, host, port: calls.append((host, port)))

    result = CliRunner().invoke(cli.main, ["serve"])

    assert result.exit_code == 0
    assert calls == [("127.0.0.1", 9001)]


def test_simulate_prints_a_summary():
    result = CliRunner().invoke(cli.main, ["simulate", "random", "random", "-n", "10", "-s", "s"])

    assert result.exit_code == 0
    lines = result.output.splitlines()
    assert lines[0] == "10 games of random vs random, seed s"
    assert lines[1].startswith("Seat 1  random  ")
    assert lines[2].startswith("Seat 2  random  ")
    assert lines[3].startswith("Turns per game (both players): mean ")


def test_simulate_repeats_a_seeded_batch_exactly():
    args = ["simulate", "random", "random", "--games", "10", "--seed", "s"]

    assert CliRunner().invoke(cli.main, args).output == CliRunner().invoke(cli.main, args).output


def test_simulate_prints_the_seed_it_picked():
    result = CliRunner().invoke(cli.main, ["simulate", "random", "random", "-n", "1"])

    seed = result.output.splitlines()[0].split("seed ")[1]
    rerun = CliRunner().invoke(cli.main, ["simulate", "random", "random", "-n", "1", "-s", seed])
    assert rerun.output == result.output


def test_simulate_rejects_unknown_strategies():
    result = CliRunner().invoke(cli.main, ["simulate", "random", "nope"])

    assert result.exit_code == 2
    assert "Invalid value" in result.output


def test_version():
    assert __version__ in CliRunner().invoke(cli.main, ["--version"]).output


def test_simulate_needs_a_strategy_per_seat():
    result = CliRunner().invoke(cli.main, ["simulate", "random"])

    assert result.exit_code == 2
    assert "takes 2 values" in result.output


def test_tournament_prints_the_matrix_and_the_ranking():
    result = CliRunner().invoke(
        cli.main, ["tournament", "random", "greedy", "smart", "-n", "10", "-s", "s"]
    )

    assert result.exit_code == 0
    lines = result.output.splitlines()
    assert lines[0] == "3 strategies, 10 games per pair, seed s"
    matrix = lines[lines.index("Win rate of row against column") + 1 :][:4]
    assert matrix[0].split() == ["random", "greedy", "smart"]
    assert [row.split()[0] for row in matrix[1:]] == ["random", "greedy", "smart"]
    assert matrix[1].split()[1] == "-"
    ranking = lines[lines.index("Ranking by overall win rate") + 1 :]
    assert [row.split()[0] for row in ranking] == ["1", "2", "3"]
    assert {row.split()[1] for row in ranking} == {"random", "greedy", "smart"}


def test_tournament_repeats_a_seeded_run_exactly():
    args = ["tournament", "random", "highest", "sloppy", "--games", "10", "--seed", "s"]

    assert CliRunner().invoke(cli.main, args).output == CliRunner().invoke(cli.main, args).output


def test_tournament_prints_the_seed_it_picked():
    result = CliRunner().invoke(cli.main, ["tournament", "random", "greedy", "-n", "1"])

    seed = result.output.splitlines()[0].split("seed ")[1]
    rerun = CliRunner().invoke(cli.main, ["tournament", "random", "greedy", "-n", "1", "-s", seed])
    assert rerun.output == result.output


@pytest.mark.parametrize(
    ("strategies", "message"),
    [
        (["random"], "at least 2 strategies"),
        (["random", "random"], "each strategy once"),
        (["random", "nope"], "Invalid value"),
    ],
)
def test_tournament_needs_distinct_known_strategies(strategies, message):
    result = CliRunner().invoke(cli.main, ["tournament", *strategies])

    assert result.exit_code == 2
    assert message in result.output


def test_simulate_accepts_the_new_strategies():
    result = CliRunner().invoke(cli.main, ["simulate", "sloppy", "rarest", "-n", "5", "-s", "s"])

    assert result.exit_code == 0
    assert "5 games of sloppy vs rarest, seed s" in result.output
