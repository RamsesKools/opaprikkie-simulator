"""Contains some random things"""

import logging
import math

# example of a constant
DOZEN = 12

logger = logging.getLogger(__name__)


# an example of a simple function.
def my_add(x: float, y: float) -> float:
    """Add two numbers

    Args:
        x: The first number
        y: The second number

    Returns:
        The sum of the two numbers
    """
    return x + y


# another simple function, with a more elaborate docstring
def my_div(a: float, b: float) -> float:
    """Perform a division of two numbers

    Args:
        a: The dividend
        b: The divisor

    Returns:
        The quotient

    Raises:
        ValueError: If the divisor is zero

    Example:
        >>> a = 10
        >>> b = 2.5
        >>> a / b
        4.0

    Warning:
        The divisor can't be zero!
    """
    if b == 0:
        raise ValueError("The divisor cannot be zero")
    return a / b


def average(numbers: list[float]) -> float:
    """Calculate the average of a list of numbers

    Args:
        numbers: The list of numbers

    Returns:
        The average value

    Note:
        If the list is empty, returns :attr:`math.nan`
    """
    count = len(numbers)
    if count == 0:
        logger.warning("attempted to get the average of an empty list")
        return math.nan
    return my_div(sum(numbers), count)


def repeat_enthousiastically_several_times(obj: object) -> str:
    """Repeat the object ``repr`` several times, enthousiastically.

    Args:
        obj: The object

    Returns:
        The enthousiastic string
    """
    return _repeat_dozen(str(obj) + "! ")


def fibonacci(n: int) -> int:
    """Calculate the Nth number in the fibonacci sequence

    Args:
        n: Which fibonacci number to calculate

    Returns:
        The nth fibonacci number

    Note:
        This function is not efficient at all
    """
    logger.debug("calculating fibonacci number %s", n)
    if n <= 1:
        return n
    else:
        return fibonacci(n - 1) + fibonacci(n - 2)


# example of a internal function.
# internal functions *generally*:
#   - start their names with an underscore
#   - are not used outside the module
#   - are not directly tested
#   - do not need a full docstring
def _repeat_dozen(string: str) -> str:
    """Repeat a string a dozen times"""
    return string * DOZEN
