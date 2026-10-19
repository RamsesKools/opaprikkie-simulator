import pytest

from opaprikkie.engine import CLASSIC, count_matches, set_aside


@pytest.mark.parametrize(
    ("target", "dice", "expected"),
    [
        (3, (1, 2, 3, 6, 3, 5), (2, 4)),
        (6, (1, 2, 3, 4, 5, 5), ()),
        (7, (3, 4, 3, 4, 4, 6), (0, 1, 2, 3)),
        (7, (1, 6, 6, 6, 1, 2), (0, 1, 2, 4)),
        (8, (4, 4, 4, 2, 6, 1), (0, 1, 3, 4)),
        (8, (4, 1, 1, 1, 1, 1), ()),
        (12, (6, 6, 6, 6, 6, 6), (0, 1, 2, 3, 4, 5)),
        (12, (1, 6, 6, 2, 6, 3), (1, 2)),
        (2, (1, 1, 2, 5, 5, 5), (2,)),
    ],
)
def test_set_aside_takes_matching_dice_from_the_lowest_indices(target, dice, expected):
    assert set_aside(CLASSIC, target, dice) == expected


def test_dice_summing_to_a_low_target_do_not_match_it():
    assert set_aside(CLASSIC, 5, (1, 4, 2, 3, 1, 4)) == ()


def test_pairs_are_the_maximum_disjoint_set():
    assert count_matches(CLASSIC, 9, (3, 6, 6, 4, 5, 3)) == 3
