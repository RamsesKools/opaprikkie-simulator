from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from opaprikkie import engine


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
        body = {"code": "invalid_request", "message": "malformed request", "errors": error.errors()}
        return JSONResponse(jsonable_encoder(body), status_code=422)
