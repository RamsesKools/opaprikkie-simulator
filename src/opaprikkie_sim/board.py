"""Game board representation for Opa Prikkie."""

from dataclasses import dataclass, field

from opaprikkie_sim.constants import MAX_DICE_NUM, MAX_ROW_HEIGHT, MIN_DICE_NUM


@dataclass
class Peg:
    """Represents a single peg (prikkie) on the board."""

    number: int  # The number this peg belongs to (1-12)
    position: int = 0  # Current position (0 = bottom, max_position = top)
    max_position: int = MAX_ROW_HEIGHT  # Number of positions from bottom to top

    def is_at_top(self) -> bool:
        """Check if the peg has reached the top of the board."""
        return self.position >= self.max_position

    def move(self, steps: int) -> bool:
        """Move the peg up by the given number of steps. Returns True if Peg is at the top."""
        self.position += steps
        if self.is_at_top():
            # prevent overflow
            self.position = self.max_position
            return True
        return False


@dataclass
class Board:
    """Represents a player's game board."""

    pegs: dict[int, Peg] = field(default_factory=dict)
    row_height: int = MAX_ROW_HEIGHT

    def __post_init__(self) -> None:
        """Initialize the board.
        Game is played by combining taking the target of one or two dice.
        """
        if not self.pegs:
            for number in range(MIN_DICE_NUM, 2 * MAX_DICE_NUM + 1):
                self.pegs[number] = Peg(number=number, max_position=self.row_height)

    def get_peg(self, number: int) -> Peg:
        """Get the peg for a specific number."""
        peg = self.pegs.get(number)
        assert peg is not None, f"Peg {number} not found"

        return peg

    def is_peg_movable(self, number: int) -> bool:
        """Check if a peg is movable. A Peg can be moved up if it is not at the top."""
        peg = self.get_peg(number)
        return not peg.is_at_top()

    def move_peg(self, number: int, steps: int) -> bool:
        """Move a peg by the given number of steps. Returns True if Peg is moved to the top."""
        peg = self.get_peg(number)
        assert not peg.is_at_top(), f"Peg {number} is already at the top"
        peg_at_top = peg.move(steps)

        return peg_at_top

    def is_complete(self) -> bool:
        """Check if all pegs have reached the top of the board."""
        return all(peg.is_at_top() for peg in self.pegs.values())

    def get_incomplete_pegs(self) -> list[Peg]:
        """Get all pegs that haven't reached the top yet."""
        return [peg for peg in self.pegs.values() if not peg.is_at_top()]

    def get_peg_positions(self) -> dict[int, int]:
        """Get the current positions of all pegs."""
        return {number: peg.position for number, peg in self.pegs.items()}

    def get_board_state(self) -> list[list[int | None]]:
        """Get a 2D representation of the board state."""
        # Create a board with max_position + 1 rows (0 to max_position)
        # and 12 columns (one for each number)
        board: list[list[int | None]] = [[None for _ in range(12)] for _ in range(11)]

        for number, peg in self.pegs.items():
            if peg.position <= peg.max_position:
                board[peg.position][number - 1] = number

        return board

    def display(self) -> str:
        """Return a string representation of the board."""
        board_state = self.get_board_state()
        lines = []

        # Add header with numbers
        header = "   " + " ".join(f"{i:2d}" for i in range(MIN_DICE_NUM, MAX_DICE_NUM * 2 + 1))
        lines.append(header)
        lines.append("   " + "-" * 35)

        # Add board rows (from top to bottom)
        for i, row in enumerate(reversed(board_state)):
            row_str = f"{10 - i:2d} "
            for cell in row:
                if cell is not None:
                    row_str += f" {cell:2d}"
                else:
                    row_str += "  ."
            lines.append(row_str)

        return "\n".join(lines)
