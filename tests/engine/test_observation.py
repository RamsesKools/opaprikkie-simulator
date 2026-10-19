import pytest

from opaprikkie.engine import (
    CLASSIC,
    IllegalAction,
    LegalTarget,
    choose_first_player,
    choose_target,
    name_players,
    new_game,
    observe,
)

from .helpers import choosing_target, topped_except


def test_observation_shows_the_choice_point_to_the_current_seat():
    state = choosing_target((4, 6, 1, 1, 3, 3), rows={4: 5, 1: 4})

    observation = observe(state)

    assert observation.ruleset is CLASSIC
    assert observation.seat == 0
    assert observation.pegs == state.pegs
    assert observation.opening_roll == (4, 6, 1, 1, 3, 3)
    assert observation.legal_targets == (
        LegalTarget(target=1, matches=2, guaranteed_moves=1, set_aside=(2, 3)),
        LegalTarget(target=3, matches=2, guaranteed_moves=2, set_aside=(4, 5)),
        LegalTarget(target=6, matches=1, guaranteed_moves=1, set_aside=(1,)),
        LegalTarget(target=7, matches=2, guaranteed_moves=2, set_aside=(0, 1, 2, 4)),
        LegalTarget(target=9, matches=1, guaranteed_moves=1, set_aside=(1, 4)),
        LegalTarget(target=10, matches=1, guaranteed_moves=1, set_aside=(0, 1)),
    )
    assert observation.turn == 1
    assert observation.continuation == 0


def test_dice_off_winner_observes_before_any_opening_roll():
    state, _ = new_game(CLASSIC, "seed")
    state, _ = name_players(state, ["Ada", "Bob"])

    observation = observe(state)

    assert observation.seat == state.current_player
    assert observation.opening_roll == ()
    assert observation.legal_targets == ()
    choose_first_player(state, observation.seat)


def test_there_is_nothing_to_observe_outside_a_choice_point():
    naming, _ = new_game(CLASSIC, "seed")
    finished, _ = choose_target(choosing_target((2, 1, 1, 1, 1, 1), topped_except(2, 4)), 2)

    for state in (naming, finished):
        with pytest.raises(IllegalAction) as raised:
            observe(state)

        assert raised.value.code == "wrong_phase"
