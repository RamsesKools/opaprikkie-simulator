"""Display system for Opa Prikkie simulator game information."""

from __future__ import annotations

from abc import ABC, abstractmethod


class DisplayOutput(ABC):
    """Abstract base class for display outputs."""

    @abstractmethod
    def display(self, message: str) -> None:
        """Display a message."""
        pass


class TerminalDisplay(DisplayOutput):
    """Terminal-based display output."""

    def display(self, message: str) -> None:
        """Display a message to the terminal."""
        print(message, flush=True)  # noqa: T201


class Display:
    """Main display class for game information output."""

    _instance: Display | None = None

    @staticmethod
    def get_instance() -> Display:
        if Display._instance is None:
            return Display.configure_instance()

        return Display._instance

    @staticmethod
    def configure_instance(output: DisplayOutput | None = None) -> Display:
        if Display._instance is not None:
            assert False, "Singleton Display can only be configured once."

        Display._instance = Display(output)
        return Display._instance

    def __init__(self, output: DisplayOutput | None = None):
        """Initialize the display with an output method.

        Args:
            output: Display output implementation (default: TerminalDisplay)
        """
        self.output = output or TerminalDisplay()

    def display_info(self, message: str) -> None:
        """Display informational message to the user.

        Args:
            message: Message to display
        """
        self.output.display(message)

    def display_warning(self, message: str) -> None:
        """Display warning message to the user.

        Args:
            message: Warning message to display
        """
        self.output.display(f"⚠️  {message}")

    def display_error(self, message: str) -> None:
        """Display error message to the user.

        Args:
            message: Error message to display
        """
        self.output.display(f"❌ {message}")

    def display_success(self, message: str) -> None:
        """Display success message to the user.

        Args:
            message: Success message to display
        """
        self.output.display(f"✅ {message}")

    def display_game_info(self, message: str) -> None:
        """Display game-specific information.

        Args:
            message: Game information message to display
        """
        self.output.display(f"🎮 {message}")

    def display_dice_roll(self, roll: list[int]) -> None:
        """Display dice roll information.

        Args:
            roll: List of dice values
        """
        self.output.display(f"🎲 Roll: {roll}")

    def display_target_selection(self, target: int, moves: int) -> None:
        """Display target selection information.

        Args:
            target: Selected target number
            moves: Number of moves made
        """
        self.output.display(f"🎯 Target: {target}, Moves: {moves}")

    def display_winner(self, player_name: str) -> None:
        """Display winner information.

        Args:
            player_name: Name of the winning player
        """
        self.output.display(f"🎉 {player_name} wins!")

    def display_turn_info(self, turn_count: int, player_name: str) -> None:
        """Display turn information.

        Args:
            turn_count: Current turn number
            player_name: Name of the current player
        """
        self.output.display(f"\n--- Turn {turn_count} ---")
        self.output.display(f"Current player: {player_name}")

    def display_board(self, board_display: str) -> None:
        """Display board information.

        Args:
            board_display: Board display string
        """
        self.output.display(board_display)

    def display_separator(self, length: int = 40) -> None:
        """Display a separator line.

        Args:
            length: Length of the separator (default: 40)
        """
        self.output.display("=" * length)
