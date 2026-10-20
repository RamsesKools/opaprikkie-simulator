import dataclasses

import pytest

from opaprikkie.engine import (
    CLASSIC,
    GameState,
    IllegalAction,
    LegalTarget,
    Log,
    Phase,
    Roll,
    RollSequence,
    SequenceInProgress,
    choose_target,
    observe,
    stop,
    take,
)

from .helpers import choosing_target

TALL = dataclasses.replace(CLASSIC, name="tall", rows=20)


def in_sequence(
    opening_roll, target, dice, ruleset=CLASSIC, rows=None
) -> tuple[GameState, GameState, SequenceInProgress]:
    """The first seed where taking `dice` leaves the sequence waiting for the next choice."""
    for seed in range(200):
        state = choosing_target(opening_roll, rows=rows, ruleset=ruleset, seed=seed)
        after, _ = take(state, target, dice)
        if after.sequence is not None:
            return state, after, after.sequence
    pytest.fail("no seed where the sequence goes on")


def resolved(log: Log) -> RollSequence:
    return next(entry for entry in log if isinstance(entry, RollSequence))


def test_taking_fewer_matches_than_rolled_rerolls_the_rest_for_the_locked_target():
    state, after, sequence = in_sequence((6, 6, 1, 2, 3, 4), 6, (1,))

    assert after.phase is Phase.CHOOSING_DICE
    assert observe(after).sequence == sequence
    assert sequence.target == 6
    assert sequence.rolls == (Roll((6, 6, 1, 2, 3, 4), (1,), False, 1),)
    assert sequence.matches == 1
    assert len(sequence.dice) == 5
    assert not sequence.reset
    assert after.pegs == state.pegs
    assert after.roll_index == state.roll_index + 1


def test_a_sequence_in_progress_offers_only_its_target_for_the_throw_on_the_table():
    _, after, sequence = in_sequence((6, 6, 1, 2, 3, 4), 6, (0, 1), rows={6: 2})

    observation = observe(after)
    sixes = tuple(i for i, value in enumerate(sequence.dice) if value == 6)
    assert observation.opening_roll == (6, 6, 1, 2, 3, 4)
    assert observation.legal_targets == (LegalTarget(6, len(sixes), min(len(sixes), 1), sixes),)


def test_a_short_sequence_by_hand_moves_the_peg_by_the_matches_taken():
    _, waiting, progress = in_sequence((6, 6, 1, 2, 3, 4), 6, (0,))
    throw = progress.dice
    six = throw.index(6)

    after, log = take(waiting, 6, (six,))

    sequence = resolved(log)
    assert sequence.rolls[:2] == (
        Roll((6, 6, 1, 2, 3, 4), (0,), False, 1),
        Roll(throw, (six,), False, 1),
    )
    assert sequence.matches == sum(roll.matches for roll in sequence.rolls)
    assert after.pegs[0][6] == sequence.movement >= 2
    assert after.sequence is None


def test_stopping_moves_the_peg_by_the_matches_taken_so_far():
    _, waiting, progress = in_sequence((6, 6, 1, 2, 3, 4), 6, (0, 1))

    after, log = stop(waiting)

    assert resolved(log) == RollSequence(
        player=0,
        turn=1,
        continuation=0,
        target=6,
        rolls=(
            Roll((6, 6, 1, 2, 3, 4), (0, 1), False, 2),
            Roll(progress.dice, (), False, 0),
        ),
        matches=2,
        movement=2,
    )
    assert after.pegs[0][6] == 2
    assert after.phase is Phase.CHOOSING_TARGET
    assert after.current_player == 1


def test_a_turn_with_a_legal_target_cant_end_without_moving():
    state = choosing_target((6, 6, 1, 2, 3, 4))

    with pytest.raises(IllegalAction) as raised:
        stop(state)

    assert raised.value.code == "wrong_phase"
    assert raised.value.hints == {"phase": "choosing_target"}


def test_a_throw_without_a_match_ends_the_sequence():
    for seed in range(200):
        state = choosing_target((6, 6, 1, 2, 3, 4), seed=seed)
        after, log = take(state, 6, (0, 1))
        if log and resolved(log).rolls[-1].matches == 0:
            break
    else:
        pytest.fail("no seed where the second throw misses")

    sequence = resolved(log)
    assert len(sequence.rolls) == 2
    assert 6 not in sequence.rolls[1].dice
    assert sequence.rolls[1].set_aside == ()
    assert after.pegs[0][6] == 2


def test_taking_the_last_match_tops_the_peg_and_continues_the_turn():
    for seed in range(200):
        state = choosing_target((4, 4, 1, 2, 3, 5), rows={4: 4}, seed=seed)
        after, log = take(state, 4, (1,))
        if after.current_player == 0:
            break
    else:
        pytest.fail("no seed with a legal continuation")

    assert resolved(log).rolls == (Roll((4, 4, 1, 2, 3, 5), (1,), False, 1),)
    assert after.pegs[0][4] == CLASSIC.rows
    assert after.continuation == 1
    assert after.roll_index == state.roll_index + 1


def test_taking_every_die_rolls_all_six_again():
    _, _, sequence = in_sequence((1,) * 6, 1, tuple(range(6)), ruleset=TALL)

    assert sequence.reset
    assert len(sequence.dice) == 6


def test_taking_every_match_by_hand_plays_exactly_like_choose_target():
    for seed in range(30):
        state = choosing_target((3, 3, 4, 1, 3, 2), seed=seed)
        manual, log = take(state, 3, (0, 1, 4))
        while manual.phase is Phase.CHOOSING_DICE:
            manual, log = take(manual, 3, observe(manual).legal_targets[0].set_aside)

        assert (manual, log) == choose_target(state, 3)


@pytest.mark.parametrize(
    ("dice", "reason"),
    [
        ((), "empty"),
        ((6,), "not_dice"),
        ((-1,), "not_dice"),
        ((0, 0), "not_dice"),
        ((True,), "not_dice"),
        ("0", "not_dice"),
        (3, "not_dice"),
        ((0, 2), "no_match"),
    ],
)
def test_dice_that_arent_all_part_of_matches_are_rejected(dice, reason):
    state = choosing_target((6, 6, 1, 2, 3, 4))

    with pytest.raises(IllegalAction) as raised:
        take(state, 6, dice)

    assert raised.value.code == "illegal_dice"
    assert raised.value.hints == {"reason": reason}


def test_a_pair_target_takes_only_whole_pairs():
    state = choosing_target((6, 6, 1, 2, 3, 4))

    with pytest.raises(IllegalAction):
        take(state, 12, (0,))
    _, _, sequence = in_sequence((6, 6, 1, 2, 3, 4), 12, (0, 1))

    assert sequence.rolls[0].matches == 1


def test_the_target_is_checked_before_the_dice():
    state = choosing_target((6, 6, 1, 2, 3, 4))

    with pytest.raises(IllegalAction) as raised:
        take(state, 5, (0,))

    assert raised.value.code == "illegal_target"
    assert raised.value.hints["reason"] == "no_match"


def test_a_sequence_in_progress_is_locked_to_its_target():
    _, waiting, _ = in_sequence((6, 6, 1, 2, 3, 4), 6, (0,))

    with pytest.raises(IllegalAction) as raised:
        take(waiting, 12, (0, 1))

    assert raised.value.code == "illegal_target"
    assert raised.value.hints == {"legal_targets": (6,), "reason": "locked"}
    with pytest.raises(IllegalAction) as raised:
        choose_target(waiting, 6)
    assert raised.value.code == "wrong_phase"
