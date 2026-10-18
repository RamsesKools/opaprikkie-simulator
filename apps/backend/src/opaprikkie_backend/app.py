"""Sample game API for the #6 frontend comparison, wrapping opaprikkie_sim unchanged."""

import os
import uuid
from dataclasses import dataclass, field
from typing import Literal

import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from opaprikkie_sim.board import Board
from opaprikkie_sim.constants import MAX_ROW_HEIGHT
from opaprikkie_sim.dice import DiceRoll, DiceRoller
from opaprikkie_sim.strategy import STRATEGIES_NAME_MAPPING, Strategy

Opponent = Literal["human", "random", "greedy", "smart"]


class NewGameRequest(BaseModel):
    opponent: Opponent = "smart"
    seed: int | None = None


class MoveRequest(BaseModel):
    target: int


class Peg(BaseModel):
    target: int
    position: int


class PlayerView(BaseModel):
    name: str
    kind: Literal["human", "ai"]
    strategy: str | None
    pegs: list[Peg]


class LegalTarget(BaseModel):
    target: int
    count: int


class TurnEvent(BaseModel):
    turn: int
    player: int
    roll: list[int]
    target: int | None
    moves: int
    peg_after: int | None
    outcome: Literal["moved", "skipped", "won"]


class GameState(BaseModel):
    row_height: int
    turn: int
    status: Literal["awaiting_choice", "finished"]
    current_player: int
    winner: int | None
    roll: list[int]
    legal_targets: list[LegalTarget]
    players: list[PlayerView]
    history: list[TurnEvent]


class GameResponse(BaseModel):
    game_id: str
    state: GameState


@dataclass
class Seat:
    name: str
    strategy_name: str | None
    strategy: Strategy | None
    board: Board = field(default_factory=Board)


@dataclass
class Session:
    seats: list[Seat]
    roller: DiceRoller
    current: int = 0
    turn: int = 1
    roll: DiceRoll | None = None
    winner: int | None = None
    history: list[TurnEvent] = field(default_factory=list[TurnEvent])

    def legal_targets(self) -> dict[int, int]:
        if self.roll is None:
            return {}
        board = self.seats[self.current].board
        available = self.roll.get_available_targets()
        return {t: c for t, c in sorted(available.items()) if board.is_peg_movable(t)}

    def advance(self) -> None:
        """Roll for the current seat; auto-play AI and skip seats until a human must choose."""
        while self.winner is None:
            self.roll = self.roller.roll()
            legal = self.legal_targets()
            seat = self.seats[self.current]
            if not legal:
                self._record(None, 0, "skipped")
                self._next()
            elif seat.strategy is not None:
                self.resolve(seat.strategy.choose_target(seat.board, self.roll))
                return
            else:
                return

    def resolve(self, target: int | None) -> None:
        assert target is not None
        assert self.roll is not None
        seat = self.seats[self.current]
        moves = self.roller.simulate_turn(target)
        if moves > 0:
            seat.board.move_peg(target, moves)
        if seat.board.is_complete():
            self.winner = self.current
            self._record(target, moves, "won")
            self.roll = None
            return
        self._record(target, moves, "moved")
        self._next()
        self.advance()

    def _record(self, target: int | None, moves: int, outcome: str) -> None:
        assert self.roll is not None
        peg = self.seats[self.current].board.get_peg(target) if target else None
        self.history.append(
            TurnEvent(
                turn=self.turn,
                player=self.current,
                roll=self.roll.values,
                target=target,
                moves=moves,
                peg_after=peg.position if peg else None,
                outcome=outcome,  # type: ignore[arg-type]
            )
        )

    def _next(self) -> None:
        self.current = (self.current + 1) % len(self.seats)
        if self.current == 0:
            self.turn += 1

    def view(self) -> GameState:
        return GameState(
            row_height=MAX_ROW_HEIGHT,
            turn=self.turn,
            status="finished" if self.winner is not None else "awaiting_choice",
            current_player=self.current,
            winner=self.winner,
            roll=self.roll.values if self.roll else [],
            legal_targets=[LegalTarget(target=t, count=c) for t, c in self.legal_targets().items()],
            players=[
                PlayerView(
                    name=s.name,
                    kind="ai" if s.strategy else "human",
                    strategy=s.strategy_name,
                    pegs=[Peg(target=p.number, position=p.position) for p in s.board.pegs],
                )
                for s in self.seats
            ],
            history=self.history,
        )


app = FastAPI(title="Opa Prikkie backend")
games: dict[str, Session] = {}


def _get(game_id: str) -> Session:
    if game_id not in games:
        raise HTTPException(404, "game not found")
    return games[game_id]


@app.post("/games")
def new_game(req: NewGameRequest) -> GameResponse:
    seed = req.seed
    if req.opponent == "human":
        second = Seat("Player 2", None, None)
    else:
        strategy = STRATEGIES_NAME_MAPPING[req.opponent](seed=None if seed is None else seed + 1)
        second = Seat(f"AI ({req.opponent})", req.opponent, strategy)
    session = Session(seats=[Seat("Player 1", None, None), second], roller=DiceRoller(seed=seed))
    session.advance()
    game_id = uuid.uuid4().hex[:8]
    games[game_id] = session
    return GameResponse(game_id=game_id, state=session.view())


@app.get("/games/{game_id}")
def get_game(game_id: str) -> GameResponse:
    return GameResponse(game_id=game_id, state=_get(game_id).view())


@app.post("/games/{game_id}/moves")
def move(game_id: str, req: MoveRequest) -> GameResponse:
    session = _get(game_id)
    if session.winner is not None:
        raise HTTPException(409, "game is finished")
    if req.target not in session.legal_targets():
        raise HTTPException(422, f"target {req.target} is not legal for this roll")
    session.resolve(req.target)
    return GameResponse(game_id=game_id, state=session.view())


def main() -> None:
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("BACKEND_PORT", "8000")))
