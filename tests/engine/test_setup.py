import dataclasses

import pytest

from opaprikkie.engine import (
    CLASSIC,
    DiceOffRound,
    IllegalAction,
    Phase,
    choose_first_player,
    choose_target,
    name_players,
    new_game,
)


def test_new_game_starts_in_naming_with_every_peg_on_row_0():
    state, log = new_game(CLASSIC, "seed")

    assert log == ()
    assert state.phase is Phase.NAMING
    assert state.seed == "seed"
    assert state.roll_index == 0
    assert state.pegs == (dict.fromkeys(range(1, 13), 0),) * 2


def test_dice_off_winner_chooses_who_starts():
    state, _ = new_game(CLASSIC, "seed")

    state, log = name_players(state, ["Ada", "Bob"])

    assert state.names == ("Ada", "Bob")
    assert state.phase is Phase.CHOOSING_FIRST_PLAYER
    rounds = [entry for entry in log if isinstance(entry, DiceOffRound)]
    assert rounds == list(log)
    final = rounds[-1].rolls
    sums = {roll.player: sum(roll.dice) for roll in final}
    assert state.current_player == max(sums, key=lambda player: sums[player])
    assert sorted(sums.values())[-1] > sorted(sums.values())[-2]
    assert all(len(roll.dice) == 2 for entry in rounds for roll in entry.rolls)
    assert state.roll_index == sum(len(entry.rolls) for entry in rounds)


def test_only_players_tied_for_highest_roll_the_dice_off_again():
    three = dataclasses.replace(CLASSIC, name="three", players=3)
    for seed in range(200):
        state, _ = new_game(three, seed)
        _, log = name_players(state, ["A", "B", "C"])
        rounds = [entry for entry in log if isinstance(entry, DiceOffRound)]
        first = {roll.player: sum(roll.dice) for roll in rounds[0].rolls}
        high = max(first.values())
        tied = sorted(player for player, total in first.items() if total == high)
        if len(rounds) > 1 and len(tied) == 2:
            break
    else:
        pytest.fail("no seed with a two-way tie")

    assert sorted(roll.player for roll in rounds[1].rolls) == tied


def test_explicit_first_player_skips_the_dice_off_and_makes_the_opening_roll():
    state, _ = new_game(CLASSIC, "seed")

    state, log = name_players(state, ["Ada", "Bob"], first_player=1)

    assert log == ()
    assert state.phase is Phase.CHOOSING_TARGET
    assert state.current_player == 1
    assert state.turn == 1
    assert state.roll_index == 1
    assert len(state.opening_roll) == 6


def test_choose_first_player_makes_the_first_opening_roll():
    state, _ = new_game(CLASSIC, "seed")
    state, _ = name_players(state, ["Ada", "Bob"])
    rolls_so_far = state.roll_index

    state, _ = choose_first_player(state, 0)

    assert state.phase is Phase.CHOOSING_TARGET
    assert state.roll_index > rolls_so_far
    assert state.continuation == 0


@pytest.mark.parametrize(
    ("names", "rule"),
    [
        (["Ada"], "count"),
        (["Ada", "Bob", "Cy"], "count"),
        (["Ada", "  "], "blank"),
        (["Ada", " ada "], "duplicate"),
    ],
)
def test_invalid_names_are_rejected_with_the_failing_rule(names, rule):
    state, _ = new_game(CLASSIC, "seed")

    with pytest.raises(IllegalAction) as raised:
        name_players(state, names)

    assert raised.value.code == "invalid_names"
    assert raised.value.hints == {"rule": rule}


def test_names_are_stripped():
    state, _ = new_game(CLASSIC, "seed")

    state, _ = name_players(state, [" Ada ", "Bob"])

    assert state.names == ("Ada", "Bob")


@pytest.mark.parametrize("player", [-1, 2])
def test_unknown_first_player_is_rejected(player):
    state, _ = new_game(CLASSIC, "seed")
    named, _ = name_players(state, ["Ada", "Bob"])

    for action in (
        lambda: name_players(state, ["Ada", "Bob"], first_player=player),
        lambda: choose_first_player(named, player),
    ):
        with pytest.raises(IllegalAction) as raised:
            action()
        assert raised.value.code == "invalid_player"
        assert raised.value.hints == {"players": 2}


def test_actions_in_the_wrong_phase_are_rejected():
    state, _ = new_game(CLASSIC, "seed")
    named, _ = name_players(state, ["Ada", "Bob"])

    for action in (
        lambda: name_players(named, ["Ada", "Bob"]),
        lambda: choose_first_player(state, 0),
        lambda: choose_target(named, 1),
    ):
        with pytest.raises(IllegalAction) as raised:
            action()
        assert raised.value.code == "wrong_phase"
    assert raised.value.hints == {"phase": "choosing_first_player"}
    assert str(raised.value)
