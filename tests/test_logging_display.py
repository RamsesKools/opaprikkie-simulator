"""Tests for logging and display systems."""

from unittest.mock import patch

from opaprikkie_sim.display import Display, TerminalDisplay


def test_display_creation():
    """Test that display can be created and used."""
    display = Display().get_instance()
    assert isinstance(display.output, TerminalDisplay)


def test_display_methods():
    """Test that display methods work correctly."""
    display = Display()

    # Test basic display methods
    with patch("builtins.print") as mock_print:
        display.display_info("Test info")
        display.display_warning("Test warning")
        display.display_error("Test error")
        display.display_success("Test success")

        # Check that print was called with the expected messages
        mock_print.assert_any_call("Test info", flush=True)
        mock_print.assert_any_call("⚠️  Test warning", flush=True)
        mock_print.assert_any_call("❌ Test error", flush=True)
        mock_print.assert_any_call("✅ Test success", flush=True)


def test_display_game_methods():
    """Test that game-specific display methods work."""
    display = Display()

    with patch("builtins.print") as mock_print:
        display.display_dice_roll([1, 2, 3, 4, 5, 6])
        display.display_target_selection(7, 3)
        display.display_winner("Player 1")
        display.display_turn_info(5, "Player 2")
        display.display_separator(20)

        mock_print.assert_any_call("🎲 Roll: [1, 2, 3, 4, 5, 6]", flush=True)
        mock_print.assert_any_call("🎯 Target: 7, Moves: 3", flush=True)
        mock_print.assert_any_call("🎉 Player 1 wins!", flush=True)
        mock_print.assert_any_call("\n--- Turn 5 ---", flush=True)
        mock_print.assert_any_call("Current player: Player 2", flush=True)
        mock_print.assert_any_call("=" * 20, flush=True)
