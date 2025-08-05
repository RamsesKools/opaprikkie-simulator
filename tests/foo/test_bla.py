import math
from dataclasses import astuple

import pytest
from opaprikkie_sim.foo import bla


# a fixture allows us to re-use data in multiple tests.
# This can be useful to reduce the necessary setup code for each test.
@pytest.fixture
def points():
    """A collection of points"""
    return [
        bla.Point(3.4, 2),
        bla.Point(6, 2),
        bla.Point(0, 0),
        bla.Point(1, 2),
        bla.Point(0, 0.1),
        bla.Point(30, 7),
    ]


class TestPointDistance:
    def test_same_point(self):
        assert bla.Point(3.2, 4).distance(bla.Point(3.2, 4)) == 0

    def test_example(self):
        assert bla.Point(3, 4).distance(bla.Point(0, 0)) == 5


def test_average_point(points):
    avg = bla.Point.average(points)
    assert astuple(avg) == pytest.approx((6.733_333, 2.183_333))


def test_variance():
    assert bla.variance([1]) == 0
    assert bla.variance([1, 3, 2, 4]) == 1.25
    assert bla.variance([1.1, 1.1]) == 0
    assert math.isnan(bla.variance([]))


class TestFitLine:
    def test_too_few_points(self):
        with pytest.raises(ValueError, match="few"):
            bla.fit_line([bla.Point(3, 0)])

    def test_example(self, points):
        assert bla.fit_line(points) == pytest.approx((0.2108, 0.7641), abs=1e-3)

    def test_linear(self):
        assert bla.fit_line([bla.Point(1, 3), bla.Point(3, 3)]) == pytest.approx((0, 3))
