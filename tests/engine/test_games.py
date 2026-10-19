from random import Random

import pytest

from opaprikkie.engine import (
    BUILTIN_STRATEGIES,
    CLASSIC,
    DiceOffRound,
    GameState,
    LogEntry,
    NoMove,
    Phase,
    RollSequence,
    choose_first_player,
    choose_target,
    name_players,
    new_game,
    observe,
    set_aside,
)

SEEDS = range(40)


def play(seed: int | str) -> tuple[list[GameState], list[LogEntry]]:
    """Plays a whole game with the random strategy, keeping every state and log entry."""
    strategy = BUILTIN_STRATEGIES["random"]
    rng = Random(f"strategy:{seed}")
    state, log = new_game(CLASSIC, seed)
    state, log = name_players(state, ["Ada", "Bob"])
    states, entries = [state], list(log)
    state, log = choose_first_player(state, strategy.choose_first_player(observe(state)))
    states.append(state)
    entries += log
    while state.phase is not Phase.FINISHED:
        state, log = choose_target(state, strategy.choose_target(observe(state), rng))
        states.append(state)
        entries += log
    return states, entries


def rolls(entries: list[LogEntry]) -> list[tuple[int, ...]]:
    dice: list[tuple[int, ...]] = []
    for entry in entries:
        if isinstance(entry, DiceOffRound):
            dice += [roll.dice for roll in entry.rolls]
        elif isinstance(entry, NoMove):
            dice.append(entry.opening_roll)
        else:
            dice += [roll.dice for roll in entry.rolls]
    return dice


def test_a_seed_and_the_choices_replay_a_game_exactly():
    assert play("replay") == play("replay")
    assert play("replay")[1] != play("other")[1]


@pytest.mark.parametrize("seed", SEEDS)
def test_every_roll_comes_from_the_seed_and_a_counter(seed):
    states, entries = play(seed)

    logged = rolls(entries)
    expected = []
    for index, dice in enumerate(logged):
        rng = Random(f"{seed}:{index}")
        expected.append(tuple(rng.randint(1, 6) for _ in dice))
    assert logged == expected
    assert states[-1].roll_index == len(logged)


@pytest.mark.parametrize("seed", SEEDS)
def test_every_roll_sequence_follows_the_rules(seed):
    _, entries = play(seed)

    rows = {player: dict.fromkeys(CLASSIC.targets, 0) for player in range(2)}
    for sequence in (entry for entry in entries if isinstance(entry, RollSequence)):
        combo_size = CLASSIC.targets[sequence.target]
        distance = CLASSIC.rows - rows[sequence.player][sequence.target]
        assert len(sequence.rolls[0].dice) == CLASSIC.dice_count
        assert not sequence.rolls[0].reset
        matches = 0
        for index, roll in enumerate(sequence.rolls):
            assert roll.set_aside == set_aside(CLASSIC, sequence.target, roll.dice)
            matches += len(roll.set_aside) // combo_size
            left = len(roll.dice) - len(roll.set_aside) or CLASSIC.dice_count
            ends = not roll.set_aside or matches >= distance or left < combo_size
            assert ends == (index == len(sequence.rolls) - 1)
            if not ends:
                following = sequence.rolls[index + 1]
                assert len(following.dice) == left
                assert following.reset == (len(roll.dice) == len(roll.set_aside))
        assert sequence.matches == matches
        assert sequence.movement == min(matches, distance)
        rows[sequence.player][sequence.target] += sequence.movement


@pytest.mark.parametrize("seed", SEEDS)
def test_pegs_move_by_the_logged_movement_and_the_game_ends_with_one_winner(seed):
    states, entries = play(seed)

    final = states[-1]
    rows = {player: dict.fromkeys(CLASSIC.targets, 0) for player in range(2)}
    for sequence in (entry for entry in entries if isinstance(entry, RollSequence)):
        rows[sequence.player][sequence.target] += sequence.movement
    assert [rows[player] for player in range(2)] == [dict(pegs) for pegs in final.pegs]
    assert final.winner is not None
    assert set(final.pegs[final.winner].values()) == {CLASSIC.rows}
    assert (
        CLASSIC.rows not in set(final.pegs[1 - final.winner].values())
        or len(set(final.pegs[1 - final.winner].values())) > 1
    )
