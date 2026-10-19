from collections import Counter
from collections.abc import Mapping
from fractions import Fraction
from functools import cache
from itertools import combinations_with_replacement
from math import factorial
from random import Random
from types import MappingProxyType
from typing import Protocol, runtime_checkable

from opaprikkie.engine.dice import count_matches
from opaprikkie.engine.observation import Observation
from opaprikkie.engine.ruleset import Ruleset


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


class GreedyStrategy:
    name = "greedy"

    def choose_first_player(self, observation: Observation) -> int:
        return observation.seat

    def choose_target(self, observation: Observation, rng: Random) -> int:
        rows = observation.pegs[observation.seat]
        best = max(
            observation.legal_targets,
            key=lambda t: (t.guaranteed_moves, rows[t.target], -t.target),
        )
        return best.target


class SmartStrategy:
    """Maximizes the exact expected movement of the roll sequence, plus a bonus for topping out."""

    name = "smart"

    def __init__(self, topping_bonus: Fraction = Fraction(1)) -> None:
        self.topping_bonus = topping_bonus

    def choose_first_player(self, observation: Observation) -> int:
        return observation.seat

    def choose_target(self, observation: Observation, rng: Random) -> int:
        best = max(
            observation.legal_targets,
            key=lambda t: (self.expected_value(observation, t.target), -t.target),
        )
        return best.target

    def expected_value(self, observation: Observation, target: int) -> Fraction:
        ruleset = observation.ruleset
        opening_roll = observation.opening_roll
        matches = count_matches(ruleset, target, opening_roll)
        remaining = len(opening_roll) - matches * ruleset.targets[target]
        distance = ruleset.rows - observation.pegs[observation.seat][target]
        return _after_roll(ruleset, target, matches, distance, remaining, self.topping_bonus)


def _after_roll(
    ruleset: Ruleset, target: int, matches: int, needed: int, remaining: int, bonus: Fraction
) -> Fraction:
    if matches >= needed:
        return needed + bonus
    dice = remaining or ruleset.dice_count
    if dice < ruleset.targets[target]:
        return Fraction(matches)
    return matches + _expected_rest(ruleset, target, needed - matches, dice, bonus)


@cache
def _expected_rest(
    ruleset: Ruleset, target: int, needed: int, dice: int, bonus: Fraction
) -> Fraction:
    combo_size = ruleset.targets[target]
    return sum(
        (
            chance
            * _after_roll(ruleset, target, matches, needed, dice - matches * combo_size, bonus)
            for matches, chance in _match_odds(ruleset, target, dice).items()
            if matches
        ),
        Fraction(0),
    )


@cache
def _match_odds(ruleset: Ruleset, target: int, dice: int) -> Mapping[int, Fraction]:
    ways: Counter[int] = Counter()
    for values in combinations_with_replacement(range(1, ruleset.dice_faces + 1), dice):
        ways[count_matches(ruleset, target, values)] += _orderings(values)
    outcomes = ruleset.dice_faces**dice
    return MappingProxyType({matches: Fraction(n, outcomes) for matches, n in ways.items()})


def _orderings(values: tuple[int, ...]) -> int:
    orderings = factorial(len(values))
    for count in Counter(values).values():
        orderings //= factorial(count)
    return orderings


BUILTIN_STRATEGIES: Mapping[str, Strategy] = MappingProxyType(
    {strategy.name: strategy for strategy in (RandomStrategy(), GreedyStrategy(), SmartStrategy())}
)
