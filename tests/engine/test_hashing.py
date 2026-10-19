import dataclasses

from opaprikkie.engine import CLASSIC, observe

from .helpers import choosing_target


def test_rulesets_states_and_observations_are_hashable():
    state = choosing_target((1, 2, 3, 4, 5, 6))
    same = choosing_target((1, 2, 3, 4, 5, 6))

    assert hash(CLASSIC) == hash(dataclasses.replace(CLASSIC))
    assert hash(state) == hash(same)
    assert hash(observe(state)) == hash(observe(same))
    assert hash(state) != hash(dataclasses.replace(state, opening_roll=(1,) * 6))


def test_frozen_mappings_read_like_dicts():
    state = choosing_target((1, 2, 3, 4, 5, 6))

    assert state.pegs[0] == dict.fromkeys(range(1, 13), 0)
    assert repr(CLASSIC.targets).startswith("FrozenMap({1: 1, ")
