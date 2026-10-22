from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt, TypeAdapter, WithJsonSchema

from opaprikkie import engine
from opaprikkie.backend import games, sessions


class LegalTarget(BaseModel):
    target: int
    matches: int
    guaranteed_moves: int
    set_aside: list[int]


class Roll(BaseModel):
    dice: list[int]
    set_aside: list[int]
    reset: bool
    matches: int


class TakeOption(BaseModel):
    """Dice that may be taken for `target`, by their place in the roll, the row reached, what the
    take leads to, and how many dice are thrown next."""

    target: int
    dice: list[int]
    matches: int
    row: int
    outcome: engine.TakeOutcome
    next_dice: int


class SequenceInProgress(BaseModel):
    """A roll sequence played by hand: the rolls taken so far and the throw on the table."""

    target: int
    rolls: list[Roll]
    matches: int
    dice: list[int]
    reset: bool


class Observation(BaseModel):
    ruleset: str
    seat: int
    pegs: list[dict[int, int]]
    opening_roll: list[int]
    legal_targets: list[LegalTarget]
    turn: int
    continuation: int
    sequence: SequenceInProgress | None
    takes: list[TakeOption]

    @classmethod
    def of(cls, observation: engine.Observation) -> "Observation":
        sequence = observation.sequence
        return cls(
            ruleset=observation.ruleset.name,
            seat=observation.seat,
            pegs=[dict(rows) for rows in observation.pegs],
            opening_roll=list(observation.opening_roll),
            legal_targets=[LegalTarget(**vars(t)) for t in observation.legal_targets],
            turn=observation.turn,
            continuation=observation.continuation,
            sequence=None
            if sequence is None
            else SequenceInProgress(
                target=sequence.target,
                rolls=[Roll(**vars(roll)) for roll in sequence.rolls],
                matches=sequence.matches,
                dice=list(sequence.dice),
                reset=sequence.reset,
            ),
            takes=[TakeOption(**vars(t)) for t in observation.takes],
        )


class DiceOffRoll(BaseModel):
    player: int
    dice: list[int]


class DiceOffRound(BaseModel):
    kind: Literal["dice_off"]
    rolls: list[DiceOffRoll]


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
    """The game state; `seed` and `strategy` are shown in dev mode only.

    `turns` counts the turns so far, dead ones included. `dice_counts[player][face - 1]` is how
    often that player threw `face`.
    """

    ruleset: str
    phase: engine.Phase
    names: list[str]
    controllers: list[games.Controller]
    pegs: list[dict[int, int]]
    turns: int
    dice_counts: list[list[int]]
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
            turns=state.turn,
            dice_counts=[list(counts) for counts in state.dice_counts],
            observation=_observation(state),
            winner=state.winner,
            seed=state.seed if dev_mode else None,
            strategy=game.strategy if dev_mode else None,
        )


def _observation(state: engine.GameState) -> Observation | None:
    resting = state.phase in (engine.Phase.NAMING, engine.Phase.FINISHED)
    return None if resting else Observation.of(engine.observe(state))


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
Integers = Annotated[Any, WithJsonSchema({"type": "array", "items": {"type": "integer"}})]


class NewGame(Request):
    controllers: Annotated[
        list[games.Controller],
        Field(min_length=engine.CLASSIC.players, max_length=engine.CLASSIC.players),
    ]
    seed: int | str | None = None
    first_player: Annotated[StrictInt, Field(ge=0, lt=engine.CLASSIC.players)] | None = None
    strategy: str | None = None
    play_mode: games.PlayMode | None = None

    def dev_only_fields(self) -> list[str]:
        return [
            name for name in ("seed", "first_player", "strategy") if getattr(self, name) is not None
        ]


class PlayMode(Request):
    play_mode: games.PlayMode


class Names(Request):
    names: Strings


class FirstPlayer(Request):
    player: Integer


class Target(Request):
    target: Integer


class Take(Request):
    """The dice to set aside for `target`, by their place in the throw."""

    target: Integer
    dice: Integers
