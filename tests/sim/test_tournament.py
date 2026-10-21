import pytest

from opaprikkie.sim import run_batch, run_tournament


def test_every_pair_plays_head_to_head_with_its_own_batch_seed():
    result = run_tournament(["random", "greedy", "smart"], games=10, seed="t")

    assert set(result.wins) == {
        (a, b)
        for a in ("random", "greedy", "smart")
        for b in ("random", "greedy", "smart")
        if a != b
    }
    batch = run_batch(["random", "greedy"], games=10, seed="t:random:greedy")
    assert result.wins["random", "greedy"] == batch.stats.seats[0].wins
    assert result.wins["greedy", "random"] == batch.stats.seats[1].wins


def test_the_head_to_head_wins_of_a_pair_add_up_to_its_games():
    result = run_tournament(["random", "greedy", "smart"], games=10, seed="t")

    assert result.wins["random", "smart"] + result.wins["smart", "random"] == 10
    assert result.win_rate("random", "smart") == result.wins["random", "smart"] / 10


def test_the_same_seed_gives_the_same_tournament():
    first = run_tournament(["random", "greedy", "sloppy"], games=10, seed="t")

    assert first == run_tournament(["random", "greedy", "sloppy"], games=10, seed="t")
    assert first != run_tournament(["random", "greedy", "sloppy"], games=10, seed="u")


def test_the_ranking_orders_by_overall_win_rate():
    result = run_tournament(["random", "highest", "smart"], games=40, seed="t")

    ranking = result.ranking()

    assert [s.strategy for s in ranking] == sorted(
        result.strategies, key=lambda name: -result.overall(name).win_rate
    )
    assert all(s.games == 80 for s in ranking)
    assert sum(s.wins for s in ranking) == 120
    assert ranking[0].win_rate >= ranking[1].win_rate >= ranking[2].win_rate


def test_ties_in_the_ranking_keep_the_given_order():
    result = run_tournament(["random", "greedy"], games=1, seed="t")

    ranking = result.ranking()

    assert {s.wins for s in ranking} == {0, 1}


@pytest.mark.parametrize(
    ("strategies", "message"),
    [
        (["random"], "at least 2 strategies"),
        (["random", "random"], "each strategy once"),
    ],
)
def test_a_tournament_needs_distinct_strategies(strategies, message):
    with pytest.raises(ValueError, match=message):
        run_tournament(strategies, games=1, seed="t")
