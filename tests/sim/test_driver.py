import pytest

from opaprikkie.engine import (
    CLASSIC,
    DiceOffRound,
    Observation,
    RollSequence,
    TakeOption,
    set_aside,
)
from opaprikkie.sim import InProcessDriver


def lowest(observation: Observation) -> int:
    return min(t.target for t in observation.legal_targets)


@pytest.mark.parametrize("first_player", [0, 1])
def test_the_given_first_player_starts_without_a_dice_off(first_player):
    played = InProcessDriver().play("seed", first_player, lowest)

    first = played.log[0]
    assert not any(isinstance(entry, DiceOffRound) for entry in played.log)
    assert not isinstance(first, DiceOffRound)
    assert first.player == first_player


def test_the_game_runs_until_a_player_has_topped_every_peg():
    played = InProcessDriver().play("seed", 0, lowest)

    moved = [entry for entry in played.log if isinstance(entry, RollSequence)]
    winner_moves = sum(entry.movement for entry in moved if entry.player == played.winner)
    assert winner_moves == CLASSIC.rows * len(CLASSIC.targets)
    assert moved[-1].player == played.winner


def first_take(observation: Observation) -> TakeOption:
    return observation.takes[0]


def test_a_chooser_may_play_takes_by_hand():
    played = InProcessDriver().play("seed", 0, first_take)

    sequences = [entry for entry in played.log if isinstance(entry, RollSequence)]
    assert played.winner in (0, 1)
    assert any(
        len(roll.set_aside) < len(set_aside(CLASSIC, entry.target, roll.dice))
        for entry in sequences
        for roll in entry.rolls
    )
