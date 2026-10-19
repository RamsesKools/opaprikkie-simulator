import secrets
from collections import OrderedDict
from collections.abc import Callable
from dataclasses import dataclass

from opaprikkie.backend.games import Game


@dataclass
class Session:
    id: str
    last_used: float
    names: tuple[str, ...] | None = None
    game: Game | None = None


class SessionStore:
    """In memory, least recently used first; routes are async, so access is single-threaded."""

    def __init__(self, max_sessions: int, ttl_seconds: float, clock: Callable[[], float]) -> None:
        self._sessions: OrderedDict[str, Session] = OrderedDict()
        self._max_sessions = max_sessions
        self._ttl_seconds = ttl_seconds
        self._clock = clock

    def create(self) -> Session:
        self._drop_expired()
        while len(self._sessions) >= self._max_sessions:
            self._sessions.popitem(last=False)
        session = Session(secrets.token_urlsafe(32), self._clock())
        self._sessions[session.id] = session
        return session

    def get(self, session_id: str | None) -> Session | None:
        self._drop_expired()
        session = self._sessions.get(session_id) if session_id else None
        if session:
            session.last_used = self._clock()
            self._sessions.move_to_end(session.id)
        return session

    def _drop_expired(self) -> None:
        cutoff = self._clock() - self._ttl_seconds
        while self._sessions and next(iter(self._sessions.values())).last_used < cutoff:
            self._sessions.popitem(last=False)
