from collections.abc import Callable
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Response

from opaprikkie import engine
from opaprikkie.backend import games, models, sessions
from opaprikkie.backend.errors import ApiError
from opaprikkie.backend.settings import Settings

COOKIE = "opaprikkie_session"


def game_routes(settings: Settings, clock: Callable[[], float]) -> APIRouter:
    router = APIRouter(
        responses={status: {"model": models.Error} for status in (401, 403, 404, 422)}
    )
    ttl = timedelta(days=settings.session_ttl_days)
    store = sessions.SessionStore(settings.max_sessions, ttl.total_seconds(), clock)

    def set_cookie(response: Response, session: sessions.Session) -> None:
        response.set_cookie(
            COOKIE,
            session.id,
            max_age=int(ttl.total_seconds()),
            secure=settings.cookie_secure,
            httponly=True,
            samesite="lax",
        )

    async def current_session(
        response: Response,
        session_id: Annotated[str | None, Cookie(alias=COOKIE)] = None,
    ) -> sessions.Session:
        session = store.get(session_id)
        if session is None:
            raise ApiError(401, "no_session", "create a session first")
        set_cookie(response, session)
        return session

    type CurrentSession = Annotated[sessions.Session, Depends(current_session)]

    def current_game(session: sessions.Session) -> games.Game:
        if session.game is None:
            raise ApiError(404, "no_game", "start a game first")
        return session.game

    def update(session: sessions.Session, game: games.Game, log: engine.Log) -> models.GameUpdate:
        session.game = game
        return models.GameUpdate(
            game=models.Game.of(game, settings.dev_mode), logs=models.logs(log)
        )

    @router.post("/sessions", status_code=201)
    async def create_session(response: Response) -> models.Session:
        session = store.create()
        set_cookie(response, session)
        return models.Session.of(session, settings.dev_mode)

    @router.get("/session")
    async def read_session(session: CurrentSession) -> models.Session:
        return models.Session.of(session, settings.dev_mode)

    @router.post("/game", status_code=201)
    async def create_game(request: models.NewGame, session: CurrentSession) -> models.GameUpdate:
        if (fields := request.dev_only_fields()) and not settings.dev_mode:
            raise ApiError(403, "dev_mode_only", "only allowed in dev mode", fields=fields)
        if request.strategy is not None and request.strategy not in engine.BUILTIN_STRATEGIES:
            strategies = sorted(engine.BUILTIN_STRATEGIES)
            raise ApiError(422, "unknown_strategy", "no such strategy", strategies=strategies)
        game = games.new_game(
            tuple(request.controllers),
            request.seed,
            request.strategy,
            request.first_player,
            request.play_mode or games.PlayMode.AUTOMATIC,
        )
        return update(session, game, ())

    @router.post("/game/play_mode")
    async def set_play_mode(request: models.PlayMode, session: CurrentSession) -> models.GameUpdate:
        return update(session, games.set_play_mode(current_game(session), request.play_mode), ())

    @router.post("/game/names")
    async def name_players(request: models.Names, session: CurrentSession) -> models.GameUpdate:
        game, log = games.name_players(current_game(session), request.names)
        session.names = game.state.names
        return update(session, game, log)

    @router.post("/game/first_player")
    async def choose_first_player(
        request: models.FirstPlayer, session: CurrentSession
    ) -> models.GameUpdate:
        return update(session, *games.choose_first_player(current_game(session), request.player))

    @router.post("/game/target")
    async def choose_target(request: models.Target, session: CurrentSession) -> models.GameUpdate:
        return update(session, *games.choose_target(current_game(session), request.target))

    @router.post("/game/take")
    async def take(request: models.Take, session: CurrentSession) -> models.GameUpdate:
        return update(session, *games.take(current_game(session), request.target, request.dice))

    @router.post("/game/stop")
    async def stop(session: CurrentSession) -> models.GameUpdate:
        return update(session, *games.stop(current_game(session)))

    @router.get("/game")
    async def read_game(session: CurrentSession) -> models.Game:
        return models.Game.of(current_game(session), settings.dev_mode)

    return router
