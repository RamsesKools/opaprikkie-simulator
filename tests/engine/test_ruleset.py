import dataclasses

import pytest

from opaprikkie.engine import CLASSIC, EndRule, StartRule


def test_classic_matches_the_game_rules():
    assert CLASSIC.name == "classic"
    assert CLASSIC.players == 2
    assert CLASSIC.dice_count == 6
    assert CLASSIC.dice_faces == 6
    assert CLASSIC.rows == 5
    assert dict(CLASSIC.targets) == {t: 1 if t <= 6 else 2 for t in range(1, 13)}
    assert CLASSIC.start_rule is StartRule.DICE_OFF
    assert CLASSIC.end_rule is EndRule.IMMEDIATE


def test_ruleset_is_frozen():
    with pytest.raises(dataclasses.FrozenInstanceError):
        CLASSIC.rows = 6  # ty: ignore[invalid-assignment]
    with pytest.raises(TypeError):
        CLASSIC.targets[1] = 2  # ty: ignore[invalid-assignment]


def test_targets_are_copied_from_the_caller():
    targets = {1: 1, 7: 2}
    ruleset = dataclasses.replace(CLASSIC, name="small", targets=targets)
    targets[2] = 1

    assert dict(ruleset.targets) == {1: 1, 7: 2}


@pytest.mark.parametrize(
    "changes",
    [
        {"name": ""},
        {"players": 1},
        {"dice_count": 1},
        {"dice_faces": 1},
        {"rows": 0},
        {"targets": {}},
        {"targets": {9: 3}},
        {"targets": {7: 1}},
        {"targets": {0: 1}},
        {"targets": {13: 2}},
        {"targets": {1: 2}},
        {"start_rule": "equal_dice"},
        {"end_rule": "equal_turns"},
    ],
)
def test_validation_rejects_values_the_engine_cannot_play(changes):
    with pytest.raises(ValueError, match=r"\w"):
        dataclasses.replace(CLASSIC, **changes)
