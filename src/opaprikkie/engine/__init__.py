from opaprikkie.engine.dice import count_matches, set_aside
from opaprikkie.engine.errors import IllegalAction, Rejection
from opaprikkie.engine.game import choose_first_player, choose_target, name_players, new_game
from opaprikkie.engine.log import (
    DiceOffRoll,
    DiceOffRound,
    Log,
    LogEntry,
    NoMove,
    Roll,
    RollSequence,
)
from opaprikkie.engine.observation import LegalTarget, Observation, observe
from opaprikkie.engine.ruleset import CLASSIC, EndRule, Ruleset, StartRule
from opaprikkie.engine.state import GameState, Phase
from opaprikkie.engine.strategies import BUILTIN_STRATEGIES, RandomStrategy, Strategy

__all__ = [
    "BUILTIN_STRATEGIES",
    "CLASSIC",
    "DiceOffRoll",
    "DiceOffRound",
    "EndRule",
    "GameState",
    "IllegalAction",
    "LegalTarget",
    "Log",
    "LogEntry",
    "NoMove",
    "Observation",
    "Phase",
    "RandomStrategy",
    "Rejection",
    "Roll",
    "RollSequence",
    "Ruleset",
    "StartRule",
    "Strategy",
    "choose_first_player",
    "choose_target",
    "count_matches",
    "name_players",
    "new_game",
    "observe",
    "set_aside",
]
