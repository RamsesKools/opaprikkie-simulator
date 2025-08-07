"""Main game logic for Opa Prikkie."""

from dataclasses import dataclass, field
from typing import Any

from opaprikkie_sim.board import Board
from opaprikkie_sim.dice import DiceRoller
from opaprikkie_sim.strategy import RandomStrategy, Strategy
from opaprikkie_sim.utilities import init_logger

logger = init_logger(__name__)


@dataclass
class Player:
    """Represents a player in the game."""

    name: str
    board: Board = field(default_factory=Board)
    strategy: Strategy | None = None

    def is_winner(self) -> bool:
        """Check if this player has won the game."""
        return self.board.is_complete()


@dataclass
class GameState:
    """Represents the current state of the game."""

    players: list[Player]
    current_player_index: int = 0
    turn_count: int = 0
    game_over: bool = False
    winner: Player | None = None

    def get_current_player(self) -> Player:
        """Get the current player."""
        return self.players[self.current_player_index]

    def next_player(self) -> None:
        """Move to the next player."""
        self.current_player_index = (self.current_player_index + 1) % len(self.players)
        if self.current_player_index == 0:
            self.turn_count += 1


class Game:
    """Main game class that manages the Opa Prikkie game."""

    def __init__(self, num_players: int = 2, dice_roller: DiceRoller | None = None):
        self.dice_roller = dice_roller or DiceRoller()
        self.players = [Player(f"Player {i + 1}") for i in range(num_players)]
        self.state = GameState(players=self.players)

        # Assign random strategy to all players by default
        for player in self.players:
            player.strategy = RandomStrategy(self.dice_roller)

        logger.info(f"Game initialized with {num_players} players")

    def set_player_strategy(self, player_index: int, strategy: Strategy) -> None:
        """Set the strategy for a specific player."""
        if 0 <= player_index < len(self.players):
            self.players[player_index].strategy = strategy
            logger.debug(f"Player {player_index + 1} strategy set to {strategy.__class__.__name__}")

    def play_turn(self) -> dict[str, Any]:
        """Play a single turn for the current player."""
        if self.state.game_over:
            return {"status": "game_over", "winner": self.state.winner}

        current_player = self.state.get_current_player()
        roll = self.dice_roller.roll()
        logger.debug(f"Player {current_player.name} rolled: {roll.values}")

        # Choose target using player's strategy
        target = None
        if current_player.strategy:
            target = current_player.strategy.choose_target(current_player.board, roll)
            logger.debug(f"Player {current_player.name} chose target: {target}")

        if target is None:
            # No valid target found, skip turn
            logger.info(f"Player {current_player.name} skipped turn - no valid target")
            self.state.next_player()
            return {"status": "skipped", "player": current_player.name, "reason": "no_valid_target"}

        # Simulate the turn for the chosen target
        moves = self._simulate_turn_for_target(target)
        logger.debug(f"Player {current_player.name} made {moves} moves for target {target}")

        # Apply moves to the board
        if moves > 0:
            current_player.board.move_peg(target, moves)
            logger.info(f"Player {current_player.name} moved peg {target} by {moves} positions")

        # Check if player won
        if current_player.is_winner():
            self.state.game_over = True
            self.state.winner = current_player
            logger.info(f"Player {current_player.name} won the game!")
            return {
                "status": "winner",
                "player": current_player.name,
                "target": target,
                "moves": moves,
            }

        # Move to next player
        self.state.next_player()

        return {
            "status": "continue",
            "player": current_player.name,
            "target": target,
            "moves": moves,
            "roll": roll.values,
        }

    def _simulate_turn_for_target(self, target: int) -> int:
        """Simulate a complete turn for a given target number."""
        return self.dice_roller.simulate_turn(target)

    def play_game(self) -> Player:
        """Play the complete game until someone wins."""
        logger.info("Starting game...")
        while not self.state.game_over:
            result = self.play_turn()
            if result["status"] == "winner":
                break

        logger.info(f"Game completed in {self.state.turn_count} turns")
        return self.state.winner or self.players[0]

    def get_game_state(self) -> dict[str, Any]:
        """Get the current state of the game."""
        return {
            "turn_count": self.state.turn_count,
            "current_player": self.state.get_current_player().name,
            "game_over": self.state.game_over,
            "winner": self.state.winner.name if self.state.winner else None,
            "players": [
                {
                    "name": player.name,
                    "board_complete": player.board.is_complete(),
                    "peg_positions": player.board.get_peg_positions(),
                }
                for player in self.players
            ],
        }

    def display_boards(self) -> str:
        """Display all player boards."""
        lines: list[str] = []
        for player in self.players:
            lines.append(f"\n{player.name}'s Board:")
            lines.append("=" * 40)
            lines.append(player.board.display())
        return "\n".join(lines)

    def reset(self) -> None:
        """Reset the game to initial state."""
        for player in self.players:
            player.board = Board()
        self.state = GameState(players=self.players)
        logger.info("Game reset to initial state")
