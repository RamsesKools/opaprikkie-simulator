import dataclasses

import pytest

from opaprikkie.engine import (
    CLASSIC,
    IllegalAction,
    NoMove,
    Phase,
    RollSequence,
    choose_target,
    count_matches,
)

from .helpers import choosing_target, topped_except

TALL = dataclasses.replace(CLASSIC, name="tall", rows=20)
FIVE_DICE = dataclasses.replace(CLASSIC, name="five_dice", dice_count=5)


def sequence_of(log) -> RollSequence:
    (sequence,) = [entry for entry in log if isinstance(entry, RollSequence)]
    return sequence


def test_opening_roll_matches_count_and_peg_moves_by_matches():
    state = choosing_target((3, 3, 1, 2, 4, 5))

    after, log = choose_target(state, 3)

    sequence = sequence_of(log)
    assert sequence.rolls[0].dice == (3, 3, 1, 2, 4, 5)
    assert sequence.rolls[0].set_aside == (0, 1)
    assert not sequence.rolls[0].reset
    assert [len(r.dice) for r in sequence.rolls[:2]] == [6, 4]
    assert sequence.movement == sequence.matches
    assert after.pegs[0][3] == sequence.movement >= 2


def test_all_six_dice_are_rolled_again_once_every_die_is_set_aside():
    state = choosing_target((1,) * 6, ruleset=TALL)

    _, log = choose_target(state, 1)

    second = sequence_of(log).rolls[1]
    assert len(second.dice) == 6
    assert second.reset
    assert sequence_of(log).matches >= 6


def test_sequence_ends_when_fewer_dice_remain_than_one_match_needs():
    state = choosing_target((1, 6, 2, 5, 3), ruleset=FIVE_DICE)
    roll_index = state.roll_index

    after, log = choose_target(state, 7)

    sequence = sequence_of(log)
    assert len(sequence.rolls) == 1
    assert sequence.matches == 2
    assert after.pegs[0][7] == 2
    assert after.roll_index == roll_index + 1


def test_sequence_stops_as_soon_as_the_peg_is_topped_and_extra_matches_are_lost():
    state = choosing_target((4, 4, 4, 1, 2, 3), rows={4: 4})

    _, log = choose_target(state, 4)

    sequence = sequence_of(log)
    assert len(sequence.rolls) == 1
    assert sequence.matches == 3
    assert sequence.movement == 1


def test_topping_a_peg_continues_the_turn_with_a_fresh_opening_roll():
    for seed in range(100):
        state = choosing_target((4, 1, 1, 1, 1, 1), rows={4: 4}, seed=seed)
        after, log = choose_target(state, 4)
        if after.current_player == 0:
            break
    else:
        pytest.fail("no seed with a legal continuation")

    assert after.phase is Phase.CHOOSING_TARGET
    assert after.turn == 1
    assert after.continuation == 1
    assert after.pegs[0][4] == CLASSIC.rows
    assert len(after.opening_roll) == 6
    assert log == (sequence_of(log),)


def test_continuation_without_a_legal_target_passes_the_turn():
    for seed in range(500):
        state = choosing_target((6, 6, 1, 1, 1, 1), rows=topped_except(12, 4) | {11: 0}, seed=seed)
        after, log = choose_target(state, 12)
        no_moves = [entry for entry in log if isinstance(entry, NoMove)]
        if no_moves and no_moves[0].player == 0:
            break
    else:
        pytest.fail("no seed with a continuation that has no legal target")

    assert no_moves[0].continuation == 1
    assert no_moves[0].turn == 1
    assert no_moves[0].opening_roll
    assert after.continuation == 0
    assert after.turn > 1


def test_otherwise_the_turn_passes_to_the_next_player():
    for seed in range(100):
        after, log = choose_target(choosing_target((5, 1, 1, 1, 1, 1), seed=seed), 5)
        if len(log) == 1:
            break
    else:
        pytest.fail("no seed where the next player has a legal target")

    assert after.phase is Phase.CHOOSING_TARGET
    assert after.current_player == 1
    assert after.turn == 2
    assert after.continuation == 0
    assert after.pegs[0][5] == sequence_of(log).movement


def test_dead_turns_are_resolved_and_logged_as_no_move():
    for seed in range(500):
        state = choosing_target((3, 1, 1, 1, 1, 1), seed=seed)
        bob = dict.fromkeys(CLASSIC.targets, CLASSIC.rows) | {12: 0}
        state = dataclasses.replace(state, pegs=(state.pegs[0], bob))
        after, log = choose_target(state, 3)
        if any(isinstance(entry, NoMove) for entry in log):
            break
    else:
        pytest.fail("no seed with a dead turn")

    dead = next(entry for entry in log if isinstance(entry, NoMove))
    assert dead.player == 1
    assert dead.turn == 2
    assert dead.continuation == 0
    assert count_matches(CLASSIC, 12, dead.opening_roll) == 0
    assert after.pegs[1][12] == 0
    assert after.current_player == 0
    assert after.turn == 3


def test_game_ends_the_moment_the_last_peg_is_topped():
    state = choosing_target((2, 2, 1, 1, 1, 1), rows=topped_except(2, 4))
    roll_index = state.roll_index

    after, log = choose_target(state, 2)

    assert after.phase is Phase.FINISHED
    assert after.winner == 0
    assert after.roll_index == roll_index
    assert log == (sequence_of(log),)
    with pytest.raises(IllegalAction):
        choose_target(after, 2)


@pytest.mark.parametrize(
    ("target", "reason"),
    [(13, "not_a_target"), (0, "not_a_target"), (4, "topped"), (5, "no_match")],
)
def test_illegal_targets_are_rejected_with_the_legal_ones_and_a_reason(target, reason):
    state = choosing_target((4, 6, 1, 1, 3, 3), rows={4: CLASSIC.rows})

    with pytest.raises(IllegalAction) as raised:
        choose_target(state, target)

    assert raised.value.code == "illegal_target"
    assert raised.value.hints == {"legal_targets": (1, 3, 6, 7, 9, 10), "reason": reason}
