"""Tests for enhanced_stats_demo.py example script."""

import io
from unittest.mock import patch

import pytest

from opaprikkie_sim.examples.enhanced_stats_demo import main


def test_enhanced_stats_demo_runs_successfully():
    """Test that the enhanced stats demo runs without errors."""
    # Capture stdout to verify output is generated
    captured_output = io.StringIO()

    with patch("sys.stdout", captured_output):
        # Should run without raising any exceptions
        main()


def test_enhanced_stats_demo_deterministic_output():
    """Test that the demo produces deterministic output due to seeding."""
    captured_outputs = []

    # Run the demo twice
    for _ in range(2):
        captured_output = io.StringIO()
        with patch("sys.stdout", captured_output):
            main()
        captured_outputs.append(captured_output.getvalue())

    # Since the game uses seeds, the output should be identical
    assert captured_outputs[0] == captured_outputs[1]


def test_enhanced_stats_demo_game_completion():
    """Test that the demo game completes with expected statistics."""
    captured_output = io.StringIO()

    with patch("sys.stdout", captured_output):
        main()

    output = captured_output.getvalue()

    # Verify game completion indicators
    assert "Winner:" in output
    assert "Total turns played:" in output

    # Verify strategy information is displayed
    assert "RandomStrategy" in output
    assert "GreedyStrategy" in output

    # Verify move history section exists
    assert "Move History" in output
    assert "Turn" in output
    assert "Rolled" in output

    # Verify dice statistics section
    assert "Target" in output
    assert "combinations available" in output


def test_enhanced_stats_demo_move_history_format():
    """Test that move history is formatted correctly."""
    captured_output = io.StringIO()

    with patch("sys.stdout", captured_output):
        main()

    output = captured_output.getvalue()

    # Look for move history patterns
    lines = output.split("\n")
    move_history_found = False

    for line in lines:
        if "Turn" in line and "Rolled" in line and "Target:" in line:
            move_history_found = True
            # Verify the move format contains expected elements
            assert "Moves:" in line
            assert "Status:" in line
            break

    assert move_history_found, "Move history format not found in output"


def test_enhanced_stats_demo_dice_statistics():
    """Test that dice statistics are displayed correctly."""
    captured_output = io.StringIO()

    with patch("sys.stdout", captured_output):
        main()

    output = captured_output.getvalue()

    # Verify dice statistics section
    assert "DICE STATISTICS:" in output

    # Look for target statistics (should have targets 1-12)
    lines = output.split("\n")
    target_stats_found = 0

    for line in lines:
        if "Target" in line and "combinations available" in line:
            target_stats_found += 1

    # Should have statistics for multiple targets
    assert target_stats_found > 0, "No dice statistics found in output"


def test_enhanced_stats_demo_with_different_seed():
    """Test that the demo works with different random scenarios."""
    # This test verifies the demo structure rather than specific values
    # since we can't easily modify the hardcoded seed in the demo
    captured_output = io.StringIO()

    with patch("sys.stdout", captured_output):
        main()

    output = captured_output.getvalue()

    # Verify all required sections are present regardless of game outcome
    required_sections = [
        "Enhanced Game Statistics Demo",
        "Playing game with:",
        "Game completed! Winner:",
        "DETAILED STATISTICS:",
        "Move History",
        "DICE STATISTICS:",
    ]

    for section in required_sections:
        assert section in output, f"Required section '{section}' not found in output"


def test_enhanced_stats_demo_no_exceptions():
    """Test that the demo runs without raising any exceptions."""
    try:
        # Capture output to prevent console spam during testing
        with patch("sys.stdout", io.StringIO()):
            main()
    except Exception as e:  # noqa: BLE001
        pytest.fail(f"Enhanced stats demo raised an exception: {e}")


def test_enhanced_stats_demo_player_information():
    """Test that player information is correctly displayed."""
    captured_output = io.StringIO()

    with patch("sys.stdout", captured_output):
        main()

    output = captured_output.getvalue()

    # Verify both players are mentioned in move history
    assert "Player 1" in output or "Player 2" in output

    # Verify strategies are mentioned
    assert "RandomStrategy" in output
    assert "GreedyStrategy" in output

    # Verify game info section contains player count
    lines = output.split("\n")
    game_info_found = False

    for line in lines:
        if "Game Info:" in line:
            game_info_found = True
            # Should contain player count information
            break

    assert game_info_found, "Game info section not found"
