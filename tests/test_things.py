import pytest
from hypothesis import given
from hypothesis.strategies import floats, integers, lists
from opaprikkie_sim.things import (
    average,
    fibonacci,
    my_add,
    my_div,
    repeat_enthousiastically_several_times,
)


def test_version():
    from opaprikkie_sim import __version__

    assert __version__ is not None


# an example of a simple unittest.
# the function name must start with ``test``
# see https://docs.pytest.org
def test_my_add():
    assert my_add(2, 3) == 5


# related unittests can be grouped together in a class.
# Such a class must start with ``Test``.
class TestMyDiv:
    def test_simple(self):
        # when comparing floats, be sure to use pytest.approx.
        # this is necessary because of the intricacies of floating-point
        # arithmetic
        assert my_div(1, 8) == pytest.approx(0.125)

    # the parametrize decorator allows us to test multiple cases,
    # without writing many test functions
    @pytest.mark.parametrize(
        ("x", "y", "expect"),
        [(4, 2, 2), (5, 2, 2.5), (1, 3, 0.333_333_333), (5, 5, 1), (0, 3, 0)],
    )
    def test_multiple_cases(self, x, y, expect):
        assert my_div(x, y) == pytest.approx(expect)

    def test_zero_divisor(self):
        # test that the correct exceptions will be raised in certain cases
        with pytest.raises(ValueError, match="divisor cannot be zero"):
            my_div(9, 0)


class TestAverage:
    def test_simple(self):
        assert average([2, 4, 3]) == 3

    # An example of a simple property-based test.
    # In this case, the ``given`` decorator runs the test
    # multiple times with randomly generated lists of numbers.
    # See the ``hypothesis`` library for more info:
    # https://hypothesis.readthedocs.io
    @given(numbers=lists(floats() | integers()))
    def test_fuzzing(self, numbers):
        # Inside the function body of this type of test,
        # we can't check the exact outcome,
        # but we can perform sanity checks on the outputs.
        result = average(numbers)
        assert isinstance(result, float)


class TestFibonacci:
    # example of a test marked as "slow".
    # this test will be skipped unless --runslow is passed at the command line
    # how does it work? see the ``conftest.py`` file
    # and the pytest documentation
    @pytest.mark.slow
    def test_large(self):
        assert fibonacci(30) > 9

    def test_example(self):
        assert fibonacci(6) == 8

    def test_one_or_smaller(self):
        assert fibonacci(1) == 1
        assert fibonacci(0) == 0


def test_repeat_enthousiastically_several_times():
    assert repeat_enthousiastically_several_times(4) == ("4! 4! 4! 4! 4! 4! 4! 4! 4! 4! 4! 4! ")
