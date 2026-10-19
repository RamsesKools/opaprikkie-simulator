from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from opaprikkie import engine

_HTTP_CODES = {404: "not_found", 405: "method_not_allowed"}


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str, **hints: object) -> None:
        super().__init__(message)
        self.status = status
        self.body = {"code": code, "message": message, **hints}


def add_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def api_error(request: Request, error: ApiError) -> JSONResponse:
        return JSONResponse(error.body, status_code=error.status)

    @app.exception_handler(engine.IllegalAction)
    async def illegal_action(request: Request, error: engine.IllegalAction) -> JSONResponse:
        body = {"code": error.code.value, "message": error.message, **error.hints}
        return JSONResponse(jsonable_encoder(body), status_code=422)

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request: Request, error: RequestValidationError) -> JSONResponse:
        errors = [{"loc": e["loc"], "msg": e["msg"]} for e in error.errors()]
        body = {"code": "invalid_request", "message": "malformed request", "errors": errors}
        return JSONResponse(jsonable_encoder(body), status_code=422)

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, error: HTTPException) -> JSONResponse:
        body = {"code": _HTTP_CODES.get(error.status_code, "http_error"), "message": error.detail}
        return JSONResponse(body, status_code=error.status_code, headers=error.headers)

    @app.exception_handler(Exception)
    async def internal_error(request: Request, error: Exception) -> JSONResponse:
        body = {"code": "internal_error", "message": "something went wrong"}
        return JSONResponse(body, status_code=500)
