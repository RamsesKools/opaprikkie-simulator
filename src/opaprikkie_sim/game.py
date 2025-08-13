"""Main game logic for Opa Prikkie."""

from dataclasses import dataclass, field
from typing import Any

from opaprikkie_sim.board import Board
from opaprikkie_sim.dice import DiceRoller
from opaprikkie_sim.game_stats import GameStats, PlayerMove
from opaprikkie_sim.strategy import RandomStrategy, Strategy
from opaprikkie_sim.utilities import get_version, init_logger

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

    def __init__(
        self, num_players: int = 2, dice_roller: DiceRoller | None = None, seed: int | None = None
    ):
        self.seed = seed
        self.dice_roller = dice_roller or DiceRoller(seed=seed)
        self.players = [Player(f"Player {i + 1}") for i in range(num_players)]
        self.state = GameState(players=self.players)

        # Assign random strategy to all players by default with different seeds
        for i, player in enumerate(self.players):
            # Use different seeds for each player to avoid identical behavior
            player_seed = None if seed is None else seed + i + 1000
            player.strategy = RandomStrategy(seed=player_seed)

        # GameStats object
        self.stats = GameStats(
            game_package_version=get_version(),
            game_seed=seed or 0,
            number_of_players=num_players,
        )

        # Add players to stats tracking
        for player in self.players:
            strategy_name = player.strategy.__class__.__name__ if player.strategy else "None"
            self.stats.add_player(player.name, strategy_name)

        logger.info(f"Game initialized with {num_players} players")

    def set_player_strategy(self, player_index: int, strategy: Strategy) -> None:
        """Set the strategy for a specific player."""
        if 0 <= player_index < len(self.players):
            self.players[player_index].strategy = strategy
            # Update stats with new strategy name
            player_name = self.players[player_index].name
            strategy_name = strategy.__class__.__name__
            if player_name in self.stats.player_stats:
                self.stats.player_stats[player_name].strategy_name = strategy_name
            logger.debug(f"Player {player_index + 1} strategy set to {strategy_name}")

    def play_turn(self) -> dict[str, Any]:
        """Play a single turn for the current player."""
        if self.state.game_over:
            return {"status": "game_over", "winner": self.state.winner}

        current_player = self.state.get_current_player()
        roll = self.dice_roller.roll()
        logger.debug(f"Player {current_player.name} rolled: {roll.values}")

        self.stats.add_dice_rolls(roll)

        # Choose target using player's strategy
        target = None
        if current_player.strategy:
            target = current_player.strategy.choose_target(current_player.board, roll)
            logger.debug(f"Player {current_player.name} chose target: {target}")

        if target is None:
            # No valid target found, skip turn
            logger.info(f"Player {current_player.name} skipped turn - no valid target")

            # Record the skipped turn
            move = PlayerMove(
                turn_number=self.state.turn_count,
                player_name=current_player.name,
                dice_roll=roll.values,
                target_chosen=None,
                moves_made=0,
                status="skipped",
                reason="no_valid_target",
            )
            self.stats.add_player_move(move)

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
            self.stats.set_winner(current_player.name)

            # Record the winning move
            move = PlayerMove(
                turn_number=self.state.turn_count,
                player_name=current_player.name,
                dice_roll=roll.values,
                target_chosen=target,
                moves_made=moves,
                status="winner",
            )
            self.stats.add_player_move(move)

            logger.info(f"Player {current_player.name} won the game!")
            return {
                "status": "winner",
                "player": current_player.name,
                "target": target,
                "moves": moves,
            }

        # Record the regular move
        move = PlayerMove(
            turn_number=self.state.turn_count,
            player_name=current_player.name,
            dice_roll=roll.values,
            target_chosen=target,
            moves_made=moves,
            status="continue",
        )
        self.stats.add_player_move(move)

        # Move to next player
        self.state.next_player()
        # Update stats
        self.stats.total_turns = self.state.turn_count

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

        # Finalize game statistics
        self.stats.finalize_game(self.state.turn_count)

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

    def get_game_statistics(self) -> dict[str, Any]:
        """Get comprehensive game statistics."""
        return self.stats.get_summary()

    def get_detailed_move_history(self) -> dict[str, list[dict[str, Any]]]:
        """Get detailed move history for all players."""
        return self.stats.get_detailed_moves()

    def display_game_summary(self) -> str:
        """Display a formatted summary of the game statistics."""
        summary = self.stats.get_summary()
        lines: list[str] = []

        lines.append("=" * 50)
        lines.append("GAME SUMMARY")
        lines.append("=" * 50)
        lines.append(f"Version: {summary['game_info']['version']}")
        lines.append(f"Seed: {summary['game_info']['seed']}")
        lines.append(f"Total Turns: {summary['game_info']['total_turns']}")
        lines.append(f"Winner: {summary['game_info']['winner']}")
        lines.append("")

        lines.append("PLAYER STATISTICS:")
        lines.append("-" * 30)
        for name, stats in summary["player_stats"].items():
            lines.append(f"{name} ({stats['strategy']}):")
            lines.append(f"  Total Moves: {stats['total_moves']}")
            lines.append(f"  Turns Played: {stats['turns_played']}")
            lines.append(f"  Turns Skipped: {stats['turns_skipped']}")
            lines.append(f"  Winner: {'Yes' if stats['is_winner'] else 'No'}")
            lines.append("")

        return "\n".join(lines)

    def reset(self) -> None:
        """Reset the game to initial state."""
        for player in self.players:
            player.board = Board()
        self.state = GameState(players=self.players)
        self.dice_stats = dict.fromkeys(range(1, 7), 0)

        # Reset stats
        self.stats = GameStats(
            game_package_version=self.stats.game_package_version,
            game_seed=self.stats.game_seed,
            number_of_players=self.stats.number_of_players,
        )

        # Re-add players to stats tracking
        for player in self.players:
            strategy_name = player.strategy.__class__.__name__ if player.strategy else "None"
            self.stats.add_player(player.name, strategy_name)

        logger.info("Game reset to initial state")
