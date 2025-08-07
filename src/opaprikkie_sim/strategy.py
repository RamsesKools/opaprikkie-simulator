"""Strategy implementations for Opa Prikkie game."""

from __future__ import annotations

import random
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from opaprikkie_sim.board import Board, Peg
    from opaprikkie_sim.dice import DiceRoll


class Strategy(ABC):
    """Abstract base class for game strategies."""

    @abstractmethod
    def choose_target(self, board: Board, roll: DiceRoll) -> int | None:
        """Choose which target number to save for in this turn.

        Returns:
            int | None: The target number to save for in this turn.
            None if no target can be chosen.
        """
        pass


class RandomStrategy(Strategy):
    """Random strategy - chooses targets randomly from available options."""

    def choose_target(self, board: Board, roll: DiceRoll) -> int | None:
        """Choose a random target from available options."""
        available_targets = roll.get_available_targets()

        # Filter targets that have incomplete pegs
        valid_targets: list[int] = []
        for target in available_targets:
            peg = board.get_peg(target)
            if peg and not peg.is_at_top():
                valid_targets.append(target)

        if not valid_targets:
            return None

        return random.choice(valid_targets)  # noqa: S311


class GreedyStrategy(Strategy):
    """Greedy strategy - always chooses the target that will move a peg the furthest."""

    def choose_target(self, board: Board, roll: DiceRoll) -> int | None:
        """Choose the target that will move a peg the furthest."""
        available_targets = roll.get_available_targets()
        best_target = None
        best_score = -1

        for target in available_targets:
            peg = board.get_peg(target)
            if not peg or peg.is_at_top():
                continue

            potential_moves = available_targets[target]

            # Calculate score based on potential moves and current position
            score = potential_moves * (peg.max_position - peg.position)

            if score > best_score:
                best_score = score
                best_target = target

        return best_target


class FinishPegsStrategy(Strategy):
    """FinishPegsStrategy strategy - look at moving fast and finishing.
    This strategy prioritizes targets if they can be finished,
    otherwise it looks to move a peg the furthest.
    """

    def choose_target(self, board: Board, roll: DiceRoll) -> int | None:
        """Choose target based on multiple strategic factors."""
        available_targets = roll.get_available_targets()
        best_target = None
        best_score = -1.0

        for target in available_targets:
            peg = board.get_peg(target)
            if not peg or peg.is_at_top():
                continue

            potential_moves = available_targets[target]

            # Calculate score based on multiple factors
            score = self._calculate_score(board, target, potential_moves, peg)

            if score > best_score:
                best_score = score
                best_target = target

        return best_target

    def _calculate_score(
        self, _board: Board, _target: int, potential_moves: int, peg: Peg
    ) -> float:
        """Calculate a score for a target based on multiple factors."""
        # Base score: potential moves * remaining distance
        base_score = potential_moves

        # Bonus when a peg can be finished
        completion_bonus = 0
        if peg.position + potential_moves >= peg.max_position:
            completion_bonus = peg.max_position

        return base_score + completion_bonus


# available strategies: random, greedy, smart
STRATEGIES_NAME_MAPPING: dict[str, type[Strategy]] = {
    "random": RandomStrategy,
    "greedy": GreedyStrategy,
    "smart": FinishPegsStrategy,
}
