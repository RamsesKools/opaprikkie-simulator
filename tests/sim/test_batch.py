from random import Random

import pytest

from opaprikkie.engine import IllegalAction, Observation, RandomStrategy, Rejection
from opaprikkie.sim import run_batch


class LowestTarget:
    name = "lowest"

    def choose_first_player(self, observation: Observation) -> int:
        return observation.seat

    def choose_target(self, observation: Observation, rng: Random) -> int:
        return min(t.target for t in observation.legal_targets)


class Cheater(LowestTarget):
    name = "cheater"

    def choose_target(self, observation: Observation, rng: Random) -> int:
        return 99


def test_the_same_batch_seed_gives_identical_results():
    first = run_batch(["random", "random"], games=20, seed="batch")

    assert first == run_batch(["random", "random"], games=20, seed="batch")
    assert first != run_batch(["random", "random"], games=20, seed="other")


def test_games_alternate_the_first_player_with_a_seed_each():
    batch = run_batch(["random", "random"], games=4, seed="batch")

    assert [game.first_player for game in batch.games] == [0, 1, 0, 1]
    assert len({game.seed for game in batch.games}) == 4


def test_strategies_go_by_name_or_as_objects():
    batch = run_batch([LowestTarget(), "random"], games=2, seed="batch")

    assert batch.strategies == ("lowest", "random")
    assert batch == run_batch([LowestTarget(), RandomStrategy()], games=2, seed="batch")


def test_an_unknown_strategy_name_is_rejected():
    with pytest.raises(ValueError, match="unknown strategy 'nope'"):
        run_batch(["random", "nope"], games=1, seed="batch")


def test_every_seat_needs_a_strategy():
    with pytest.raises(ValueError, match="expected 2 strategies"):
        run_batch(["random"], games=1, seed="batch")


def test_an_illegal_choice_fails_the_batch_fast():
    with pytest.raises(IllegalAction) as raised:
        run_batch(["random", Cheater()], games=3, seed="batch")

    assert raised.value.code is Rejection.ILLEGAL_TARGET
    assert "cheater" in str(raised.value.__notes__)
