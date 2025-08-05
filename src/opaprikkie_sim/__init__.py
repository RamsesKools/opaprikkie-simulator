"""Opa Prikkie Simulator - A Python implementation of the Dutch dice game."""

from opaprikkie_sim.board import Board, Peg
from opaprikkie_sim.cli import main as cli_main
from opaprikkie_sim.dice import DiceRoll, DiceRoller
from opaprikkie_sim.game import Game, Player
from opaprikkie_sim.strategy import GreedyStrategy, RandomStrategy, SmartStrategy, Strategy

# Single-sourcing the version number with poetry:
# https://github.com/python-poetry/poetry/pull/2366#issuecomment-652418094
__version__ = __import__("importlib.metadata").metadata.version(
    __package__.replace(".", "-")  # canonicalize any namespaced module
)
__all__ = [
    "Board",
    "DiceRoll",
    "DiceRoller",
    "Game",
    "GreedyStrategy",
    "Peg",
    "Player",
    "RandomStrategy",
    "SmartStrategy",
    "Strategy",
    "cli_main",
]
