from collections.abc import Mapping
from random import Random
from types import MappingProxyType
from typing import Protocol, runtime_checkable

from opaprikkie.engine.observation import Observation


@runtime_checkable
class Strategy(Protocol):
    """Chooses for a seat; pure, never touching the state or rolling game dice."""

    @property
    def name(self) -> str: ...

    def choose_first_player(self, observation: Observation) -> int: ...

    def choose_target(self, observation: Observation, rng: Random) -> int: ...


class RandomStrategy:
    name = "random"

    def choose_first_player(self, observation: Observation) -> int:
        return observation.seat

    def choose_target(self, observation: Observation, rng: Random) -> int:
        return rng.choice(observation.legal_targets).target


BUILTIN_STRATEGIES: Mapping[str, Strategy] = MappingProxyType(
    {strategy.name: strategy for strategy in (RandomStrategy(),)}
)
