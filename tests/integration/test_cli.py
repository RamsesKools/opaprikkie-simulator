from click.testing import CliRunner

from opaprikkie_sim.cli import cli


def test_simulation_basic():
    runner = CliRunner()
    # fmt: off
    result = runner.invoke(
        cli,
        [
            "simulation",
            "--games", "5",
            "--players", "2",
            "--strategy1", "random",
            "--strategy2", "greedy",
        ],
    )
    # fmt: on
    assert result.exit_code == 0
    assert result.stderr == ""
    assert "Running 5 simulations..." in result.output
    assert "Players: 2, Strategies: random vs greedy" in result.output
    assert "Results after 5 games:" in result.output


def test_simulation_larger():
    runner = CliRunner()
    # fmt: off
    result = runner.invoke(
        cli,
        [
            "simulation",
            "--games", "50",
            "--players", "3",
            "--strategy1", "greedy",
            "--strategy2", "smart",
        ],
    )
    # fmt: on
    assert result.exit_code == 0
    assert result.stderr == ""
    assert "Running 50 simulations..." in result.output
    assert "Players: 3, Strategies: greedy vs smart" in result.output
    assert "Results after 50 games:" in result.output


def test_short_interactive_game() -> None:
    runner = CliRunner()
    # Simulate choosing strategy 1 for player 1, strategy 2 for player 2,
    # then 'q' to quit after a few turns
    user_input = "1\n2\nq\n"
    result = runner.invoke(
        cli,
        ["interactive", "--players", "2"],
        input=user_input,
    )
    assert result.exit_code == 0
    assert result.stderr == ""
    assert "Welcome to Opa Prikkie Simulator!" in result.output
    assert "Choose strategy for Player 1:" in result.output
    assert "Choose strategy for Player 2:" in result.output
    assert "Game stopped by user." in result.output or "Game finished after" in result.output


def test_interactive_invalid_players() -> None:
    runner = CliRunner()
    # Try with 1 player (invalid)
    result = runner.invoke(
        cli,
        ["interactive", "--players", "1"],
    )
    assert result.exit_code == 0
    assert "Number of players must be between 2 and 4." in result.output


def test_interactive_invalid_strategy_choice():
    runner = CliRunner()
    # Simulate invalid strategy (e.g., 5), then valid (1), then valid (2), then 'q' to quit
    user_input = "5\n1\n2\nq\n"
    result = runner.invoke(
        cli,
        ["interactive", "--players", "2"],
        input=user_input,
    )
    assert result.exit_code == 0
    assert result.stderr == ""
    assert "Please enter a number between 1 and 3." in result.output
    assert "Choose strategy for Player 1:" in result.output
    assert "Choose strategy for Player 2:" in result.output
    assert "Game stopped by user." in result.output or "Game finished after" in result.output
