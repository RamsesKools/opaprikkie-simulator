from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt, TypeAdapter, WithJsonSchema

from opaprikkie import engine
from opaprikkie.backend import games, sessions


class LegalTarget(BaseModel):
    target: int
    matches: int
    guaranteed_moves: int


class Observation(BaseModel):
    ruleset: str
    seat: int
    pegs: list[dict[int, int]]
    opening_roll: list[int]
    legal_targets: list[LegalTarget]
    turn: int
    continuation: int

    @classmethod
    def of(cls, observation: engine.Observation) -> "Observation":
        return cls(
            ruleset=observation.ruleset.name,
            seat=observation.seat,
            pegs=[dict(rows) for rows in observation.pegs],
            opening_roll=list(observation.opening_roll),
            legal_targets=[LegalTarget(**vars(t)) for t in observation.legal_targets],
            turn=observation.turn,
            continuation=observation.continuation,
        )


class DiceOffRoll(BaseModel):
    player: int
    dice: list[int]


class DiceOffRound(BaseModel):
    kind: Literal["dice_off"]
    rolls: list[DiceOffRoll]


class Roll(BaseModel):
    dice: list[int]
    set_aside: list[int]
    reset: bool


class RollSequence(BaseModel):
    kind: Literal["roll_sequence"]
    player: int
    turn: int
    continuation: int
    target: int
    rolls: list[Roll]
    matches: int
    movement: int


class NoMove(BaseModel):
    kind: Literal["no_move"]
    player: int
    turn: int
    continuation: int
    opening_roll: list[int]


type LogEntry = Annotated[DiceOffRound | RollSequence | NoMove, Field(discriminator="kind")]

_log = TypeAdapter(list[LogEntry])


def logs(log: engine.Log) -> list[LogEntry]:
    return _log.validate_python(log, from_attributes=True)


class Game(BaseModel):
    """The game state; `seed` and `strategy` are shown in dev mode only."""

    ruleset: str
    phase: engine.Phase
    names: list[str]
    controllers: list[games.Controller]
    pegs: list[dict[int, int]]
    observation: Observation | None
    winner: int | None
    seed: int | str | None
    strategy: str | None

    @classmethod
    def of(cls, game: games.Game, dev_mode: bool) -> "Game":
        state = game.state
        return cls(
            ruleset=state.ruleset.name,
            phase=state.phase,
            names=list(state.names),
            controllers=list(game.controllers),
            pegs=[dict(rows) for rows in state.pegs],
            observation=_observation(state),
            winner=state.winner,
            seed=state.seed if dev_mode else None,
            strategy=game.strategy if dev_mode else None,
        )


def _observation(state: engine.GameState) -> Observation | None:
    choosing = state.phase in (engine.Phase.CHOOSING_FIRST_PLAYER, engine.Phase.CHOOSING_TARGET)
    return Observation.of(engine.observe(state)) if choosing else None


class GameUpdate(BaseModel):
    """The game after an action, with every log entry it produced."""

    game: Game
    logs: list[LogEntry]


class Session(BaseModel):
    names: list[str] | None
    game: Game | None

    @classmethod
    def of(cls, session: sessions.Session, dev_mode: bool) -> "Session":
        return cls(
            names=list(session.names) if session.names else None,
            game=Game.of(session.game, dev_mode) if session.game else None,
        )


class Error(BaseModel):
    """Every error body: a `code`, a `message`, and hints that depend on the code."""

    model_config = ConfigDict(extra="allow")

    code: str
    message: str


class Request(BaseModel):
    model_config = ConfigDict(extra="forbid")


# Typed in the schema but passed on as sent: the engine is the only validator.
Integer = Annotated[Any, WithJsonSchema({"type": "integer"})]
Strings = Annotated[Any, WithJsonSchema({"type": "array", "items": {"type": "string"}})]


class NewGame(Request):
    controllers: Annotated[
        list[games.Controller],
        Field(min_length=engine.CLASSIC.players, max_length=engine.CLASSIC.players),
    ]
    seed: int | str | None = None
    first_player: Annotated[StrictInt, Field(ge=0, lt=engine.CLASSIC.players)] | None = None
    strategy: str | None = None

    def dev_only_fields(self) -> list[str]:
        return [
            name for name in ("seed", "first_player", "strategy") if getattr(self, name) is not None
        ]


class Names(Request):
    names: Strings


class FirstPlayer(Request):
    player: Integer


class Target(Request):
    target: Integer
