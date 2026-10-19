from collections import Counter
from random import Random

from opaprikkie.engine import BUILTIN_STRATEGIES, RandomStrategy, Strategy, observe

from .helpers import choosing_target


def test_builtins_are_registered_by_name():
    assert set(BUILTIN_STRATEGIES) == {"random"}
    for name, strategy in BUILTIN_STRATEGIES.items():
        assert isinstance(strategy, Strategy)
        assert strategy.name == name


def test_random_chooses_itself_as_first_player():
    observation = observe(choosing_target((1, 2, 3, 4, 5, 6)))

    assert RandomStrategy().choose_first_player(observation) == observation.seat


def test_random_picks_uniformly_among_legal_targets():
    observation = observe(choosing_target((1, 2, 3, 4, 5, 6), rows={1: 5}))
    rng = Random(0)

    picks = Counter(RandomStrategy().choose_target(observation, rng) for _ in range(6000))

    legal = {t.target for t in observation.legal_targets}
    assert set(picks) == legal
    assert all(500 < count < 700 for count in picks.values())
