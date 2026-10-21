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


class PlayMode(StrEnum):
    """How the human plays: by hand without or with hints, or automatically."""

    WITHOUT_HINTS = "without_hints"
    WITH_HINTS = "with_hints"
    AUTOMATIC = "automatic"


@dataclass(frozen=True)
class Game:
    """A session's game: the engine state, who plays each seat, and the dev-only first player.

    `drawn` says the AI's strategy was drawn, not picked; a drawn one that plays by hand stands
    in as `random` while the human plays automatically.
    """

    state: engine.GameState
    controllers: tuple[Controller, ...]
    strategy: str | None = None
    first_player: int | None = None
    play_mode: PlayMode = PlayMode.AUTOMATIC
    drawn: bool = False


type _Action = Callable[[engine.GameState], tuple[engine.GameState, engine.Log]]


def new_game(
    controllers: tuple[Controller, ...],
    seed: int | str | None = None,
    strategy: str | None = None,
    first_player: int | None = None,
    play_mode: PlayMode = PlayMode.AUTOMATIC,
) -> Game:
    state, _ = engine.new_game(engine.CLASSIC, secrets.token_hex(8) if seed is None else seed)
    drawn = Controller.AI in controllers and strategy is None
    if drawn:
        names = sorted(engine.BUILTIN_STRATEGIES)
        strategy = names[Random(f"{state.seed}:strategy").randrange(len(names))]
    return Game(state, controllers, strategy, first_player, play_mode, drawn)


def set_play_mode(game: Game, play_mode: PlayMode) -> Game:
    return replace(game, play_mode=play_mode)


# The casts pass raw JSON on: the engine validates it and rejects anything else.


def name_players(game: Game, names: object) -> tuple[Game, engine.Log]:
    names = cast(Sequence[str], names)
    return _act(game, lambda state: engine.name_players(state, names, game.first_player))


def choose_first_player(game: Game, player: object) -> tuple[Game, engine.Log]:
    return _act(game, lambda state: engine.choose_first_player(state, cast(int, player)))


def choose_target(game: Game, target: object) -> tuple[Game, engine.Log]:
    return _act(game, lambda state: engine.choose_target(state, cast(int, target)))


def take(game: Game, target: object, dice: object) -> tuple[Game, engine.Log]:
    dice = cast(Sequence[int], dice)
    return _act(game, lambda state: engine.take(state, cast(int, target), dice))


def stop(game: Game) -> tuple[Game, engine.Log]:
    return _act(game, engine.stop)


def _act(game: Game, action: _Action) -> tuple[Game, engine.Log]:
    """Applies the caller's action, then plays the AI seats until a human choice or the end."""
    state, log = action(game.state)
    while _ai_chooses(game, state):
        strategy = _playing(game)
        observation = engine.observe(state)
        rng = Random(f"{state.seed}:strategy:{state.roll_index}")
        if state.phase is engine.Phase.CHOOSING_FIRST_PLAYER:
            player = strategy.choose_first_player(observation)
            state, more = engine.choose_first_player(state, player)
        elif isinstance(strategy, engine.HandStrategy):
            choice = strategy.choose_take(observation, rng)
            state, more = engine.take(state, choice.target, choice.dice)
        else:
            state, more = engine.choose_target(state, strategy.choose_target(observation, rng))
        log += more
    return replace(game, state=state), log


def _playing(game: Game) -> engine.Strategy:
    assert game.strategy is not None
    strategy = engine.BUILTIN_STRATEGIES[game.strategy]
    if (
        game.drawn
        and game.play_mode is PlayMode.AUTOMATIC
        and isinstance(strategy, engine.HandStrategy)
    ):
        return engine.BUILTIN_STRATEGIES["random"]
    return strategy


def _ai_chooses(game: Game, state: engine.GameState) -> bool:
    choosing = (
        engine.Phase.CHOOSING_FIRST_PLAYER,
        engine.Phase.CHOOSING_TARGET,
        engine.Phase.CHOOSING_DICE,
    )
    if state.phase not in choosing:
        return False
    assert state.current_player is not None
    return game.controllers[state.current_player] is Controller.AI
