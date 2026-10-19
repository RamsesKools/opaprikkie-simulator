from collections import Counter
from fractions import Fraction
from random import Random

import pytest

from opaprikkie.engine import (
    BUILTIN_STRATEGIES,
    CLASSIC,
    EndRule,
    GreedyStrategy,
    RandomStrategy,
    Ruleset,
    SmartStrategy,
    StartRule,
    Strategy,
    observe,
)

from .helpers import choosing_target


def test_builtins_are_registered_by_name():
    assert set(BUILTIN_STRATEGIES) == {"random", "greedy", "smart"}
    for name, strategy in BUILTIN_STRATEGIES.items():
        assert isinstance(strategy, Strategy)
        assert strategy.name == name


@pytest.mark.parametrize("name", ["random", "greedy", "smart"])
def test_builtins_choose_themselves_as_first_player(name):
    observation = observe(choosing_target((1, 2, 3, 4, 5, 6)))

    assert BUILTIN_STRATEGIES[name].choose_first_player(observation) == observation.seat


def test_random_picks_uniformly_among_legal_targets():
    observation = observe(choosing_target((1, 2, 3, 4, 5, 6), rows={1: 5}))
    rng = Random(0)

    picks = Counter(RandomStrategy().choose_target(observation, rng) for _ in range(6000))

    legal = {t.target for t in observation.legal_targets}
    assert set(picks) == legal
    assert all(500 < count < 700 for count in picks.values())


def only_open(rows: dict[int, int]) -> dict[int, int]:
    return dict.fromkeys(CLASSIC.targets, CLASSIC.rows) | rows


@pytest.mark.parametrize(
    ("opening_roll", "rows", "expected"),
    [
        pytest.param((3, 3, 3, 1, 2, 4), {}, 3, id="most guaranteed moves"),
        pytest.param((3, 3, 3, 1, 1, 6), {3: 4}, 1, id="guaranteed moves are clamped"),
        pytest.param((2, 5, 1, 1, 1, 1), only_open({2: 1, 5: 3}), 5, id="tie to closest to top"),
        pytest.param((2, 5, 1, 1, 1, 1), only_open({2: 3, 5: 3}), 2, id="then to lower number"),
    ],
)
def test_greedy_picks_the_most_guaranteed_moves(opening_roll, rows, expected):
    observation = observe(choosing_target(opening_roll, rows))

    assert GreedyStrategy().choose_target(observation, Random(0)) == expected


def tiny(dice_count: int, rows: int, targets: dict[int, int]) -> Ruleset:
    return Ruleset("tiny", 2, dice_count, 2, rows, targets, StartRule.DICE_OFF, EndRule.IMMEDIATE)


COIN = {1: 1, 2: 1}


@pytest.mark.parametrize(
    ("state", "target", "bonus", "expected"),
    [
        pytest.param(
            choosing_target((1,), ruleset=tiny(1, 2, COIN)),
            1,
            Fraction(0),
            Fraction(3, 2),
            id="clamped after rolling every die again",
        ),
        pytest.param(
            choosing_target((1,), ruleset=tiny(1, 3, COIN)),
            1,
            Fraction(0),
            Fraction(7, 4),
            id="over several rolls",
        ),
        pytest.param(
            choosing_target((1, 2, 1), ruleset=tiny(3, 5, {2: 1, 3: 2})),
            3,
            Fraction(1),
            Fraction(1),
            id="too few dice for another pair",
        ),
        pytest.param(
            choosing_target((1, 2, 2, 2, 2, 2), rows={1: 4}),
            1,
            Fraction(1),
            Fraction(2),
            id="topped by the opening roll",
        ),
        pytest.param(
            choosing_target((1, 2, 2, 2, 2, 2), rows={1: 3}),
            1,
            Fraction(1),
            1 + (1 - Fraction(5, 6) ** 5) * 2,
            id="one more single from five dice",
        ),
        pytest.param(
            choosing_target((6, 6, 1, 1, 1, 1), rows={12: 3}),
            12,
            Fraction(1),
            1 + Fraction(19, 144) * 2,
            id="one more pair from four dice",
        ),
    ],
)
def test_smart_knows_the_exact_expected_movement(state, target, bonus, expected):
    smart = SmartStrategy(topping_bonus=bonus)

    assert smart.expected_value(observe(state), target) == expected


def test_smart_adds_one_row_for_topping_out_by_default():
    observation = observe(choosing_target((1,), ruleset=tiny(1, 2, COIN)))

    assert SmartStrategy().expected_value(observation, 1) == 2


def test_smart_breaks_ties_to_the_lower_number():
    observation = observe(choosing_target((1, 2, 4, 4, 4, 4), only_open({1: 0, 2: 0})))

    assert SmartStrategy().choose_target(observation, Random(0)) == 1


def test_smart_values_the_six_dice_reset_that_greedy_ignores():
    observation = observe(choosing_target((6, 6, 6, 1, 1, 1)))

    assert GreedyStrategy().choose_target(observation, Random(0)) == 1
    assert SmartStrategy().choose_target(observation, Random(0)) == 7
