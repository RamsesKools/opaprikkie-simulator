from collections import Counter
from collections.abc import Mapping
from fractions import Fraction
from functools import cache
from itertools import combinations_with_replacement, product
from math import factorial
from random import Random
from types import MappingProxyType
from typing import Protocol, runtime_checkable

from opaprikkie.engine.dice import count_matches
from opaprikkie.engine.observation import Observation, TakeOption
from opaprikkie.engine.ruleset import Ruleset


@runtime_checkable
class Strategy(Protocol):
    """Chooses for a seat; pure, never touching the state or rolling game dice."""

    @property
    def name(self) -> str: ...

    def choose_first_player(self, observation: Observation) -> int: ...

    def choose_target(self, observation: Observation, rng: Random) -> int: ...


@runtime_checkable
class HandStrategy(Strategy, Protocol):
    """A strategy that plays its sequences by hand, take by take, instead of the automatic path."""

    def choose_take(self, observation: Observation, rng: Random) -> TakeOption: ...


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


class HighestStrategy:
    name = "highest"

    def choose_first_player(self, observation: Observation) -> int:
        return observation.seat

    def choose_target(self, observation: Observation, rng: Random) -> int:
        return max(t.target for t in observation.legal_targets)


class SumStrategy:
    name = "sum"

    def choose_first_player(self, observation: Observation) -> int:
        return observation.seat

    def choose_target(self, observation: Observation, rng: Random) -> int:
        best = max(observation.legal_targets, key=lambda t: (t.matches * t.target, t.target))
        return best.target


class RarestStrategy:
    """Picks the combination least likely to be thrown again."""

    name = "rarest"

    def choose_first_player(self, observation: Observation) -> int:
        return observation.seat

    def choose_target(self, observation: Observation, rng: Random) -> int:
        ruleset = observation.ruleset
        best = max(
            observation.legal_targets,
            key=lambda t: (-(_match_odds_of(ruleset, t.target) ** t.matches), t.target),
        )
        return best.target


class SloppyStrategy:
    """Plays its sequences by hand, taking uniformly among the valid takes and never stopping."""

    name = "sloppy"

    def choose_first_player(self, observation: Observation) -> int:
        return observation.seat

    def choose_target(self, observation: Observation, rng: Random) -> int:
        return self.choose_take(observation, rng).target

    def choose_take(self, observation: Observation, rng: Random) -> TakeOption:
        return rng.choice(observation.takes)


class SmartStrategy:
    """Maximizes the exact expected movement of the roll sequence, plus a bonus for topping out."""

    name = "smart"

    def __init__(self, topping_bonus: Fraction = Fraction(0)) -> None:
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
        rows, topping = _after_roll(ruleset, target, matches, distance, remaining)
        return rows + self.topping_bonus * topping


@cache
def _match_odds_of(ruleset: Ruleset, target: int) -> Fraction:
    """The chance that one combo of dice makes `target`."""
    combo_size = ruleset.targets[target]
    faces = range(1, ruleset.dice_faces + 1)
    ways = sum(sum(combo) == target for combo in product(faces, repeat=combo_size))
    return Fraction(ways, ruleset.dice_faces**combo_size)


def _after_roll(
    ruleset: Ruleset, target: int, matches: int, needed: int, remaining: int
) -> tuple[Fraction, Fraction]:
    """Expected rows moved and chance of topping out, once a roll found `matches`."""
    if matches >= needed:
        return Fraction(needed), Fraction(1)
    dice = remaining or ruleset.dice_count
    if dice < ruleset.targets[target]:
        return Fraction(matches), Fraction(0)
    rows, topping = _expected_rest(ruleset, target, needed - matches, dice)
    return matches + rows, topping


@cache
def _expected_rest(
    ruleset: Ruleset, target: int, needed: int, dice: int
) -> tuple[Fraction, Fraction]:
    combo_size = ruleset.targets[target]
    rows, topping = Fraction(0), Fraction(0)
    for matches, chance in _match_odds(ruleset, target, dice).items():
        if matches:
            more_rows, more_topping = _after_roll(
                ruleset, target, matches, needed, dice - matches * combo_size
            )
            rows += chance * more_rows
            topping += chance * more_topping
    return rows, topping


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
    {
        strategy.name: strategy
        for strategy in (
            RandomStrategy(),
            GreedyStrategy(),
            SmartStrategy(),
            HighestStrategy(),
            SumStrategy(),
            RarestStrategy(),
            SloppyStrategy(),
        )
    }
)
