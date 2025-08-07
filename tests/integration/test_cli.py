from click.testing import CliRunner

from opaprikkie_sim.cli import cli


def test_simulation_basic():
    runner = CliRunner()
    # fmt: off
    result = runner.invoke(
        cli,
        [
            "simulation",
            "--games",
            "5",
            "--players",
            "2",
            "--strategy1",
            "random",
            "--strategy2",
            "greedy",
        ],
    )
    # fmt: on
    assert result.exit_code == 0
    assert "Running 5 simulations..." in result.output
    assert "Players: 2, Strategies: random vs greedy" in result.output
    assert "Results after 5 games:" in result.output
