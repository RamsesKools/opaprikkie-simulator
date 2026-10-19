import secrets
from collections.abc import Callable, Sequence
from dataclasses import dataclass, replace
from enum import StrEnum
from random import Random
from typing import cast

from opaprikkie import engine


class Controller(StrEnum):
    HUMAN = "human"
    AI = "ai"


@dataclass(frozen=True)
class Game:
    """A session's game: the engine state, who plays each seat, and the dev-only first player."""

    state: engine.GameState
    controllers: tuple[Controller, ...]
    strategy: str | None = None
    first_player: object = None


type _Action = Callable[[engine.GameState], tuple[engine.GameState, engine.Log]]


def new_game(
    controllers: tuple[Controller, ...],
    seed: int | str | None = None,
    strategy: str | None = None,
    first_player: object = None,
) -> Game:
    state, _ = engine.new_game(engine.CLASSIC, secrets.token_hex(8) if seed is None else seed)
    if Controller.AI in controllers and strategy is None:
        names = sorted(engine.BUILTIN_STRATEGIES)
        strategy = names[Random(f"{state.seed}:strategy").randrange(len(names))]
    return Game(state, controllers, strategy, first_player)


# The casts pass raw JSON on: the engine validates it and rejects anything else.


def name_players(game: Game, names: object) -> tuple[Game, engine.Log]:
    names, first_player = cast(Sequence[str], names), cast(int | None, game.first_player)
    return _act(game, lambda state: engine.name_players(state, names, first_player))


def choose_first_player(game: Game, player: object) -> tuple[Game, engine.Log]:
    return _act(game, lambda state: engine.choose_first_player(state, cast(int, player)))


def choose_target(game: Game, target: object) -> tuple[Game, engine.Log]:
    return _act(game, lambda state: engine.choose_target(state, cast(int, target)))


def _act(game: Game, action: _Action) -> tuple[Game, engine.Log]:
    """Applies the caller's action, then plays the AI seats until a human choice or the end."""
    state, log = action(game.state)
    while _ai_chooses(game, state):
        assert game.strategy is not None
        strategy = engine.BUILTIN_STRATEGIES[game.strategy]
        observation = engine.observe(state)
        if state.phase is engine.Phase.CHOOSING_FIRST_PLAYER:
            player = strategy.choose_first_player(observation)
            state, more = engine.choose_first_player(state, player)
        else:
            rng = Random(f"{state.seed}:strategy:{state.roll_index}")
            state, more = engine.choose_target(state, strategy.choose_target(observation, rng))
        log += more
    return replace(game, state=state), log


def _ai_chooses(game: Game, state: engine.GameState) -> bool:
    if state.phase not in (engine.Phase.CHOOSING_FIRST_PLAYER, engine.Phase.CHOOSING_TARGET):
        return False
    assert state.current_player is not None
    return game.controllers[state.current_player] is Controller.AI
