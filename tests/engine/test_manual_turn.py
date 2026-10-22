import dataclasses
from random import Random

import pytest

from opaprikkie.engine import (
    CLASSIC,
    DiceOffRound,
    GameState,
    IllegalAction,
    LegalTarget,
    Log,
    NoMove,
    Phase,
    Roll,
    RollSequence,
    SequenceInProgress,
    TakeOption,
    TakeOutcome,
    choose_target,
    name_players,
    new_game,
    observe,
    stop,
    take,
)

from .helpers import choosing_target, topped_except

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


def test_the_observation_lists_every_take_the_opening_roll_allows():
    state = choosing_target((6, 6, 1, 2, 3, 5), rows={6: 4, 1: 5})

    takes = observe(state).takes

    topped = TakeOutcome.TOPPED, 6
    assert [t for t in takes if t.target == 6] == [
        TakeOption(6, (0,), 1, 5, *topped),
        TakeOption(6, (1,), 1, 5, *topped),
        TakeOption(6, (0, 1), 2, 5, *topped),
    ]
    assert [t for t in takes if t.dice == (0, 1)] == [
        TakeOption(6, (0, 1), 2, 5, *topped),
        TakeOption(12, (0, 1), 1, 1, TakeOutcome.THROW, 4),
    ]
    assert TakeOption(7, (0, 2), 1, 1, TakeOutcome.THROW, 4) in takes
    assert not [t for t in takes if t.target == 7 and t.dice == (0, 1, 2, 5)]
    assert not [t for t in takes if t.target == 1]
    assert {t.target for t in takes} == {2, 3, 5, 6, 7, 8, 9, 11, 12}


def test_during_a_sequence_the_takes_are_for_its_target_from_its_row_so_far():
    _, after, sequence = in_sequence((6, 6, 1, 2, 3, 4), 6, (0, 1), rows={6: 1})
    sixes = [i for i, value in enumerate(sequence.dice) if value == 6]

    takes = observe(after).takes

    assert {t.target for t in takes} == {6}
    assert [t.dice for t in takes if t.matches == 1] == [(i,) for i in sixes]
    assert all(t.row == min(1 + 2 + t.matches, CLASSIC.rows) for t in takes)


def test_the_dice_off_winner_has_nothing_to_take():
    state = dataclasses.replace(choosing_target(()), phase=Phase.CHOOSING_FIRST_PLAYER)

    assert observe(state).takes == ()


def outcome(takes: tuple[TakeOption, ...], target: int, dice: tuple[int, ...]):
    found = next(t for t in takes if t.target == target and t.dice == dice)
    return found.outcome, found.next_dice


def test_each_take_says_what_it_leads_to_and_how_many_dice_are_thrown_next():
    takes = observe(choosing_target((6, 6, 1, 2, 3, 5), rows={6: 3})).takes

    assert outcome(takes, 6, (0,)) == (TakeOutcome.THROW, 5)
    assert outcome(takes, 6, (0, 1)) == (TakeOutcome.TOPPED, 6)
    every_die = observe(choosing_target((6, 1, 2, 5, 3, 4))).takes
    assert outcome(every_die, 7, (0, 1, 2, 3, 4, 5)) == (TakeOutcome.RESET, 6)


def test_topping_the_last_peg_wins():
    takes = observe(choosing_target((6, 6, 1, 2, 3, 5), rows=topped_except(6, 4))).takes

    assert outcome(takes, 6, (0,)) == (TakeOutcome.WINS, 0)


def test_too_few_dice_left_for_a_pair_ends_the_sequence():
    five_dice = dataclasses.replace(CLASSIC, name="five", dice_count=5)
    takes = observe(choosing_target((6, 1, 2, 5, 3), ruleset=five_dice)).takes

    assert outcome(takes, 7, (0, 1)) == (TakeOutcome.THROW, 3)
    assert outcome(takes, 7, (0, 1, 2, 3)) == (TakeOutcome.ENDS, 0)


def test_during_a_sequence_the_outcome_counts_the_matches_taken_so_far():
    _, after, sequence = in_sequence((6, 6, 1, 2, 3, 4), 6, (0, 1), rows={6: 2})
    six = sequence.dice.index(6)

    assert outcome(observe(after).takes, 6, (six,)) == (TakeOutcome.TOPPED, 6)


def test_every_take_option_leads_to_what_its_outcome_says():
    seen = set()
    for seed in range(40):
        rng = Random(seed)
        state, _ = new_game(CLASSIC, f"outcomes-{seed}")
        state, _ = name_players(state, ["Ada", "Bob"], first_player=0)
        while state.phase is not Phase.FINISHED:
            player = state.current_player
            assert player is not None
            option = rng.choice(observe(state).takes)
            after, log = take(state, option.target, option.dice)
            seen.add(option.outcome)
            match option.outcome:
                case TakeOutcome.THROW | TakeOutcome.RESET:
                    thrown = after.sequence or resolved(log).rolls[-1]
                    assert len(thrown.dice) == option.next_dice
                case TakeOutcome.TOPPED:
                    assert after.pegs[player][option.target] == CLASSIC.rows
                    following = log[1] if len(log) > 1 else after
                    assert isinstance(following, NoMove | GameState)
                    assert following.continuation == state.continuation + 1
                    assert len(after.opening_roll) == option.next_dice
                case TakeOutcome.WINS:
                    assert after.phase is Phase.FINISHED
            state = after

    assert seen == {TakeOutcome.THROW, TakeOutcome.RESET, TakeOutcome.TOPPED, TakeOutcome.WINS}


def test_a_game_played_by_hand_with_stops_counts_every_face_thrown():
    for seed in range(20):
        rng = Random(seed)
        state, _ = new_game(CLASSIC, f"counts-{seed}")
        state, entries = name_players(state, ["Ada", "Bob"], first_player=0)
        entries = list(entries)
        while state.phase is not Phase.FINISHED:
            if state.phase is Phase.CHOOSING_DICE and rng.random() < 0.3:
                state, log = stop(state)
            else:
                option = rng.choice(observe(state).takes)
                state, log = take(state, option.target, option.dice)
            entries += log

        expected = [[0] * 6, [0] * 6]
        for entry in entries:
            assert not isinstance(entry, DiceOffRound)
            throws = (
                [entry.opening_roll] if isinstance(entry, NoMove) else [r.dice for r in entry.rolls]
            )
            for die in (die for dice in throws for die in dice):
                expected[entry.player][die - 1] += 1
        assert [list(counts) for counts in state.dice_counts] == expected
