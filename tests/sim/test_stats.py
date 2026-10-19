import pytest

from opaprikkie.engine import CLASSIC, Log, NoMove, RollSequence
from opaprikkie.sim import BatchStats, Chooser, PlayedGame, SeatStats, run_batch


def moved(player: int, turn: int, continuation: int = 0) -> RollSequence:
    return RollSequence(player, turn, continuation, 1, (), 1, 1)


def dead(player: int, turn: int, continuation: int = 0) -> NoMove:
    return NoMove(player, turn, continuation, (2, 2, 2, 2, 2, 2))


GAMES: dict[int, tuple[int, Log]] = {
    0: (
        0,
        (
            moved(0, 1),
            dead(1, 2),
            moved(0, 3),
            moved(0, 3, 1),
            dead(0, 3, 2),
            moved(1, 4),
            moved(0, 5),
        ),
    ),
    1: (1, (moved(1, 1), dead(0, 2), moved(1, 3))),
}


class ScriptedDriver:
    ruleset = CLASSIC

    def play(self, seed: str, first_player: int, choose: Chooser) -> PlayedGame:
        winner, log = GAMES[first_player]
        return PlayedGame(winner, log)


def test_stats_aggregate_wins_turns_continuations_and_dead_turns():
    batch = run_batch(["random", "random"], games=2, seed="s", driver=ScriptedDriver())

    assert [(g.turns, g.continuations, g.dead_turns) for g in batch.games] == [
        (5, (2, 0), (0, 1)),
        (3, (0, 0), (1, 0)),
    ]
    assert batch.stats == BatchStats(
        games=2,
        seats=(
            SeatStats("random", wins=1, win_rate=0.5, continuations=1.0, dead_turns=0.5),
            SeatStats("random", wins=1, win_rate=0.5, continuations=0.0, dead_turns=0.5),
        ),
        mean_turns=4.0,
        min_turns=3,
        max_turns=5,
    )


def test_a_batch_needs_at_least_one_game():
    with pytest.raises(ValueError, match="at least 1 game"):
        run_batch(["random", "random"], games=0, seed="s")
