from collections import Counter
from fractions import Fraction
from random import Random

import pytest

from opaprikkie.engine import (
    BUILTIN_STRATEGIES,
    CLASSIC,
    BountyStrategy,
    EndRule,
    GreedyStrategy,
    HandStrategy,
    HighestStrategy,
    Phase,
    RandomStrategy,
    RarestStrategy,
    RollSequence,
    Ruleset,
    SloppyStrategy,
    SmartStrategy,
    StartRule,
    Strategy,
    SumStrategy,
    choose_first_player,
    choose_target,
    name_players,
    new_game,
    observe,
    set_aside,
    take,
)
from opaprikkie.engine.strategies import bounty_points

from .helpers import choosing_target


def test_builtins_are_registered_by_name():
    assert set(BUILTIN_STRATEGIES) == {
        "random",
        "greedy",
        "smart",
        "highest",
        "sum",
        "rarest",
        "bounty",
        "sloppy",
    }
    for name, strategy in BUILTIN_STRATEGIES.items():
        assert isinstance(strategy, Strategy)
        assert strategy.name == name


ALL = ["random", "greedy", "smart", "highest", "sum", "rarest", "bounty", "sloppy"]


@pytest.mark.parametrize("name", ALL)
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


def tiny(dice_count: int, rows: int, targets: dict[int, int], faces: int = 2) -> Ruleset:
    return Ruleset(
        "tiny", 2, dice_count, faces, rows, targets, StartRule.DICE_OFF, EndRule.IMMEDIATE
    )


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
            choosing_target((1,), ruleset=tiny(1, 2, COIN)),
            1,
            Fraction(1),
            Fraction(2),
            id="topping out earns the bonus",
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


def test_smart_has_no_topping_bonus_by_default():
    observation = observe(choosing_target((1,), ruleset=tiny(1, 2, COIN)))

    assert SmartStrategy().expected_value(observation, 1) == Fraction(3, 2)


@pytest.mark.parametrize(
    ("state", "expected"),
    [
        pytest.param(
            choosing_target((1, 2, 4, 4, 4, 4), only_open({1: 0, 2: 0})),
            1,
            id="same rows",
        ),
        pytest.param(
            choosing_target((1, 2, 4), {3: 0, 4: 4}, tiny(3, 5, {3: 2, 4: 1}, faces=4)),
            3,
            id="different rows",
        ),
    ],
)
def test_smart_breaks_ties_to_the_lower_number(state, expected):
    observation = observe(state)
    values = {
        t.target: SmartStrategy().expected_value(observation, t.target)
        for t in observation.legal_targets
    }

    assert len(set(values.values())) == 1
    assert SmartStrategy().choose_target(observation, Random(0)) == expected


def test_smart_picks_the_highest_expected_value():
    rng = Random("boards")
    smart = SmartStrategy()
    for _ in range(200):
        rows = {target: rng.randint(0, CLASSIC.rows - 1) for target in CLASSIC.targets}
        opening_roll = tuple(rng.randint(1, 6) for _ in range(CLASSIC.dice_count))
        observation = observe(choosing_target(opening_roll, rows))
        values = {
            t.target: smart.expected_value(observation, t.target) for t in observation.legal_targets
        }

        assert values[smart.choose_target(observation, rng)] == max(values.values())


def test_smart_values_the_six_dice_reset_that_greedy_ignores():
    observation = observe(choosing_target((6, 6, 6, 1, 1, 1)))

    assert GreedyStrategy().choose_target(observation, Random(0)) == 1
    assert SmartStrategy().choose_target(observation, Random(0)) == 7


@pytest.mark.parametrize("name", ALL)
def test_builtins_finish_a_classic_game_in_both_seats(name):
    strategy = BUILTIN_STRATEGIES[name]
    rng = Random(name)
    state, _ = new_game(CLASSIC, name)
    state, _ = name_players(state, ["Ada", "Bob"])
    state, _ = choose_first_player(state, strategy.choose_first_player(observe(state)))
    while state.phase is not Phase.FINISHED:
        state, _ = choose_target(state, strategy.choose_target(observe(state), rng))

    assert state.winner is not None


def play_by_hand(strategy: HandStrategy, seed: str):
    rng = Random(seed)
    state, _ = new_game(CLASSIC, seed)
    state, _ = name_players(state, ["Ada", "Bob"])
    state, _ = choose_first_player(state, strategy.choose_first_player(observe(state)))
    log = ()
    while state.phase is not Phase.FINISHED:
        choice = strategy.choose_take(observe(state), rng)
        state, entries = take(state, choice.target, choice.dice)
        log += entries
    return state, log


# Two 7s (1+6, 2+5), one 12 (6+6), three 6s, and single 1, 2 and 5.
DISAGREE = (1, 6, 2, 5, 6, 6)


@pytest.mark.parametrize(
    ("strategy", "rows", "expected"),
    [
        pytest.param(HighestStrategy(), {}, 12, id="highest takes the top number"),
        pytest.param(
            HighestStrategy(), only_open({1: 0, 5: 0, 6: 0}), 6, id="highest of what is legal"
        ),
        pytest.param(SumStrategy(), only_open({7: 0, 12: 0}), 7, id="2 x 7 beats 1 x 12"),
        pytest.param(SumStrategy(), {}, 6, id="3 x 6 beats 2 x 7"),
        pytest.param(RarestStrategy(), only_open({7: 0, 12: 0}), 12, id="1 x 12 ties 2 x 7"),
        pytest.param(RarestStrategy(), only_open({6: 0, 12: 0}), 6, id="3 x 6 is rarer than 12"),
        pytest.param(RarestStrategy(), {}, 6, id="rarest of all"),
    ],
)
def test_simple_strategies_pick_by_their_own_rule(strategy, rows, expected):
    observation = observe(choosing_target(DISAGREE, rows))

    assert strategy.choose_target(observation, Random(0)) == expected


def test_sum_breaks_ties_to_the_higher_number():
    # 2 x 6 = 12 and 1 x 12 = 12.
    observation = observe(choosing_target((6, 6, 3, 3, 4, 1), only_open({6: 0, 12: 0})))

    assert SumStrategy().choose_target(observation, Random(0)) == 12


def test_rarest_weighs_pair_odds_by_the_number_of_matches():
    # 2 x 8 is (5/36)^2 = 25/1296, rarer than 1 x 12 at 36/1296.
    observation = observe(choosing_target((2, 6, 3, 5, 6, 6), only_open({8: 0, 12: 0})))

    assert [t.matches for t in observation.legal_targets] == [2, 1]
    assert RarestStrategy().choose_target(observation, Random(0)) == 8


def test_sloppy_plays_by_hand_not_by_the_automatic_path():
    assert isinstance(SloppyStrategy(), HandStrategy)
    assert not any(isinstance(BUILTIN_STRATEGIES[n], HandStrategy) for n in ALL if n != "sloppy")


def test_sloppy_picks_uniformly_among_the_valid_takes():
    observation = observe(choosing_target((6, 6, 1, 2, 3, 4), only_open({6: 0})))
    rng = Random(0)

    picks = Counter(SloppyStrategy().choose_take(observation, rng) for _ in range(3000))

    assert set(picks) == set(observation.takes)
    assert len(observation.takes) == 3
    assert all(850 < count < 1150 for count in picks.values())


def test_sloppy_may_take_fewer_matches_than_it_could():
    observation = observe(choosing_target((6, 6, 1, 2, 3, 4), only_open({6: 0})))
    rng = Random(0)

    taken = {SloppyStrategy().choose_take(observation, rng).matches for _ in range(100)}

    assert taken == {1, 2}


def test_sloppy_as_a_target_chooser_names_the_target_of_a_take():
    observation = observe(choosing_target((6, 6, 1, 2, 3, 4), only_open({6: 0, 1: 0})))

    assert {SloppyStrategy().choose_target(observation, Random(n)) for n in range(50)} == {1, 6}


def test_sloppy_chooses_from_the_throw_on_the_table_in_a_sequence():
    for seed in range(200):
        state, _ = take(choosing_target((6, 6, 1, 2, 3, 4), seed=seed), 6, (0,))
        if state.phase is Phase.CHOOSING_DICE:
            break
    observation = observe(state)

    choice = SloppyStrategy().choose_take(observation, Random(0))

    assert choice in observation.takes
    assert choice.target == 6


@pytest.mark.parametrize("seed", ["a", "b", "c"])
def test_sloppy_finishes_a_classic_game_in_both_seats(seed):
    state, _ = play_by_hand(SloppyStrategy(), seed)

    assert state.winner is not None


@pytest.mark.parametrize("seed", ["a", "b", "c"])
def test_sloppy_never_stops_early(seed):
    _, log = play_by_hand(SloppyStrategy(), seed)

    rolls = [
        (entry.target, roll)
        for entry in log
        if isinstance(entry, RollSequence)
        for roll in entry.rolls
    ]
    assert rolls
    assert all(
        roll.set_aside or not set_aside(CLASSIC, target, roll.dice) for target, roll in rolls
    )


@pytest.mark.parametrize(
    ("opening_roll", "rows", "expected"),
    [
        pytest.param((1, 1, 1, 6, 6, 6), only_open({1: 0, 12: 0}), 12, id="1 x 12 is worth 6"),
        pytest.param((1, 1, 2, 6, 2, 6), only_open({1: 0, 8: 0}), 8, id="2 x 8 is worth 2.4"),
        pytest.param((1, 1, 1, 6, 6, 6), only_open({1: 0, 6: 0}), 6, id="3 points tie to higher"),
        pytest.param((4, 4, 4, 6, 6, 6), only_open({10: 0, 12: 0}), 12, id="6 points tie to 12"),
    ],
)
def test_bounty_picks_the_most_points(opening_roll, rows, expected):
    observation = observe(choosing_target(opening_roll, rows))

    assert BountyStrategy().choose_target(observation, Random(0)) == expected


@pytest.mark.parametrize(
    ("target", "points"),
    [(1, 1), (6, 1), (7, 1), (8, Fraction(6, 5)), (9, Fraction(3, 2)), (10, 2), (11, 3), (12, 6)],
)
def test_bounty_points_are_the_odds_of_one_die_over_the_odds_of_the_lane(target, points):
    assert bounty_points(CLASSIC, target) == points


@pytest.mark.parametrize("strategy", [SumStrategy(), RarestStrategy(), BountyStrategy()])
def test_value_strategies_count_raw_matches_on_a_clamped_peg(strategy):
    # 11 holds 3 matches but only 1 row is left, and 12 holds 1: clamped, 12 wins; raw, 11 does.
    state = choosing_target((5, 5, 5, 6, 6, 6), only_open({11: 4, 12: 0}))
    observation = observe(state)

    assert [(t.target, t.matches, t.guaranteed_moves) for t in observation.legal_targets] == [
        (11, 3, 1),
        (12, 1, 1),
    ]
    assert strategy.choose_target(observation, Random(0)) == 11
