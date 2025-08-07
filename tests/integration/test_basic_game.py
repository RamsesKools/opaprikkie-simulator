import random

import pytest

from opaprikkie_sim.examples import basic_game


def test_basic_game_runs_and_has_winner(capsys: pytest.CaptureFixture[str]):
    # Seed randomness for reproducibility
    random.seed(42)
    # Run the main function
    basic_game.main()
    # Capture output
    out, err = capsys.readouterr()
    # Check for no errors in stderr
    assert err == ""
    # Check that a winner is mentioned in the output
    assert "player 1 wins!" in out.lower() or "player 2 wins!" in out.lower()
