from collections.abc import Mapping
from enum import StrEnum
from types import MappingProxyType


class Rejection(StrEnum):
    WRONG_PHASE = "wrong_phase"
    ILLEGAL_TARGET = "illegal_target"
    ILLEGAL_DICE = "illegal_dice"
    INVALID_NAMES = "invalid_names"
    INVALID_PLAYER = "invalid_player"


class IllegalAction(Exception):  # noqa: N818
    """An action the state doesn't allow; the state is unchanged."""

    def __init__(self, code: Rejection, message: str, **hints: object) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.hints: Mapping[str, object] = MappingProxyType(hints)
