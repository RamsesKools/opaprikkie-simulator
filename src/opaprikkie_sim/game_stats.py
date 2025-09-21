"""Classes and methods for tracking game statistics."""

from dataclasses import dataclass, field
from typing import Any

from opaprikkie_sim.dice import DiceRoll


@dataclass
class PlayerMove:
    """Represents a single move made by a player."""

    turn_number: int
    player_name: str
    dice_roll: list[int]
    target_chosen: int | None
    moves_made: int
    status: str  # "continue", "winner", "skipped"
    reason: str | None = None  # For skipped turns


@dataclass
class PlayerStats:
    """Statistics for an individual player."""

    name: str
    strategy_name: str
    moves: list[PlayerMove] = field(default_factory=list[PlayerMove])
    total_moves: int = 0
    total_turns_played: int = 0
    turns_skipped: int = 0
    pegs_completed: int = 0
    is_winner: bool = False

    def add_move(self, move: PlayerMove) -> None:
        """Add a move to this player's stats."""
        self.moves.append(move)
        self.total_turns_played += 1

        if move.status == "skipped":
            self.turns_skipped += 1
        elif move.moves_made > 0:
            self.total_moves += move.moves_made

        if move.status == "winner":
            self.is_winner = True


@dataclass
class GameStats:
    """Class to track comprehensive game statistics."""

    game_package_version: str
    game_seed: int
    number_of_players: int
    player_stats: dict[str, PlayerStats] = field(default_factory=dict[str, PlayerStats])
    dice_rolls: dict[int, int] = field(default_factory=dict[int, int])
    total_turns: int = 0
    winner_name: str | None = None

    def add_player(self, name: str, strategy_name: str) -> None:
        """Add a player to the game statistics."""
        self.player_stats[name] = PlayerStats(name=name, strategy_name=strategy_name)

    def add_dice_rolls(self, dice_roll: DiceRoll) -> None:
        """Add a dice roll to the statistics."""
        dice_combinations = dice_roll.get_available_targets()
        for roll, count in dice_combinations.items():
            if roll not in self.dice_rolls:
                self.dice_rolls[roll] = 0
            self.dice_rolls[roll] += count

    def add_player_move(self, move: PlayerMove) -> None:
        """Add a move to the appropriate player's statistics."""
        if move.player_name in self.player_stats:
            self.player_stats[move.player_name].add_move(move)

    def set_winner(self, winner_name: str) -> None:
        """Set the game winner."""
        self.winner_name = winner_name
        if winner_name in self.player_stats:
            self.player_stats[winner_name].is_winner = True

    def finalize_game(self, final_turn_count: int) -> None:
        """Finalize game statistics."""
        self.total_turns = final_turn_count

    def get_summary(self) -> dict[str, Any]:
        """Get a summary of game statistics."""
        return {
            "game_info": {
                "version": self.game_package_version,
                "seed": self.game_seed,
                "players": self.number_of_players,
                "total_turns": self.total_turns,
                "winner": self.winner_name,
            },
            "player_stats": {
                name: {
                    "strategy": stats.strategy_name,
                    "total_moves": stats.total_moves,
                    "turns_played": stats.total_turns_played,
                    "turns_skipped": stats.turns_skipped,
                    "is_winner": stats.is_winner,
                    "move_count": len(stats.moves),
                }
                for name, stats in self.player_stats.items()
            },
            "dice_statistics": self.dice_rolls,
        }

    def get_detailed_moves(self) -> dict[str, list[dict[str, Any]]]:
        """Get detailed move history for all players."""
        return {
            name: [
                {
                    "turn": move.turn_number,
                    "dice_roll": move.dice_roll,
                    "target": move.target_chosen,
                    "moves": move.moves_made,
                    "status": move.status,
                    "reason": move.reason,
                }
                for move in stats.moves
            ]
            for name, stats in self.player_stats.items()
        }
