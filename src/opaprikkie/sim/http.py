from typing import Any

import httpx2

from opaprikkie import __version__
from opaprikkie.engine import (
    CLASSIC,
    IllegalAction,
    LegalTarget,
    LogEntry,
    NoMove,
    Observation,
    Phase,
    Rejection,
    Roll,
    RollSequence,
    SequenceInProgress,
    TakeOption,
)
from opaprikkie.sim.driver import Chooser, PlayedGame

type _Json = dict[str, Any]


class BackendError(Exception):
    """The backend can't run simulations, or answered something other than a rejection."""


class HttpDriver:
    """Plays every game in one session on a dev-mode backend, with both seats `human`."""

    ruleset = CLASSIC

    def __init__(self, client: httpx2.Client) -> None:
        self.client = client
        health = self._send("GET", "/api/health")
        if health["version"] != __version__:
            raise BackendError(f"backend runs {health['version']}, the simulator {__version__}")
        if not health["dev_mode"]:
            raise BackendError("seeded games need a backend in dev mode (OPAPRIKKIE_DEV_MODE)")
        self._send("POST", "/api/sessions")

    def play(self, seed: str, first_player: int, choose: Chooser) -> PlayedGame:
        controllers = ["human"] * self.ruleset.players
        new_game = {"controllers": controllers, "seed": seed, "first_player": first_player}
        self._send("POST", "/api/game", new_game)
        names = [f"Seat {seat + 1}" for seat in range(self.ruleset.players)]
        update = self._send("POST", "/api/game/names", {"names": names})
        log: list[LogEntry] = []
        while True:
            log += map(_entry, update["logs"])
            game = update["game"]
            if game["phase"] == Phase.FINISHED:
                return PlayedGame(game["winner"], tuple(log))
            choice = choose(self._observation(game["observation"]))
            if isinstance(choice, TakeOption):
                body = {"target": choice.target, "dice": list(choice.dice)}
                update = self._send("POST", "/api/game/take", body)
            else:
                update = self._send("POST", "/api/game/target", {"target": choice})

    def _send(self, method: str, path: str, body: _Json | None = None) -> _Json:
        response = self.client.request(method, path, json=body)
        if response.is_success:
            return _json(response, method, path)
        if response.status_code == 422:
            error = _json(response, method, path)
            if error.get("code") in Rejection:
                code, message = Rejection(error.pop("code")), error.pop("message")
                raise IllegalAction(code, message, **error)
        raise BackendError(f"{method} {path} failed with {response.status_code}: {response.text}")

    def _observation(self, data: _Json) -> Observation:
        return Observation(
            ruleset=self.ruleset,
            seat=data["seat"],
            pegs=tuple({int(t): row for t, row in pegs.items()} for pegs in data["pegs"]),
            opening_roll=tuple(data["opening_roll"]),
            legal_targets=tuple(
                LegalTarget(t["target"], t["matches"], t["guaranteed_moves"], tuple(t["set_aside"]))
                for t in data["legal_targets"]
            ),
            turn=data["turn"],
            continuation=data["continuation"],
            sequence=_sequence(data["sequence"]),
        )


def _json(response: httpx2.Response, method: str, path: str) -> _Json:
    try:
        return response.json()
    except ValueError as error:
        raise BackendError(
            f"{method} {path} answered {response.status_code} without JSON"
        ) from error


def _roll(data: _Json) -> Roll:
    return Roll(tuple(data["dice"]), tuple(data["set_aside"]), data["reset"], data["matches"])


def _sequence(data: _Json | None) -> SequenceInProgress | None:
    if data is None:
        return None
    rolls = tuple(map(_roll, data["rolls"]))
    return SequenceInProgress(data["target"], rolls, tuple(data["dice"]), data["reset"])


def _entry(data: _Json) -> LogEntry:
    match data["kind"]:
        case "roll_sequence":
            rolls = tuple(map(_roll, data["rolls"]))
            return RollSequence(
                data["player"],
                data["turn"],
                data["continuation"],
                data["target"],
                rolls,
                data["matches"],
                data["movement"],
            )
        case "no_move":
            return NoMove(
                data["player"], data["turn"], data["continuation"], tuple(data["opening_roll"])
            )
        case kind:
            raise BackendError(f"unexpected log entry {kind!r}")
