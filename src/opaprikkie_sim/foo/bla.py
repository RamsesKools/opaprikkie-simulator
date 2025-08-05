"""A subpackage with more things!"""

import math
import typing as t
from dataclasses import dataclass

import numpy as np

from opaprikkie_sim.things import average


def variance(numbers: list[float]) -> float:
    """Determine the variance of a list of numbers

    Args:
        numbers: The numbers

    Returns:
        The variance

    """
    avg = average(numbers)
    return average([(n - avg) ** 2 for n in numbers])


@dataclass(frozen=True)
class Point:
    """A cartesian point in X,Y-space

    Args:
        x: The X coordinate
        y: The Y coordinate
    """

    x: float
    y: float

    def distance(self, other: "Point") -> float:
        """Calculate the distance to another point

        Args:
            other: The other point

        Returns:
            The distance
        """
        return math.sqrt((self.x - other.x) ** 2 + (self.y - other.y) ** 2)

    @classmethod
    def average(cls, points: t.Collection["Point"]) -> "Point":
        """Create the average point in a collection of points

        Args:
            points: The points to average

        Returns:
            The average point
        """
        return cls(average([p.x for p in points]), average([p.y for p in points]))


def fit_line(points: t.Collection[Point]) -> tuple[float, float]:
    """Fit a line through several points by least-squares

    Args:
        points: the collection of points

    Returns:
        The coefficients A and B for the line equation "y = A*x + B"
    """
    if len(points) < 2:  # noqa: PLR2004
        raise ValueError("Too few points!")
    return t.cast(
        "tuple[float, float]",
        tuple(np.polyfit([p.x for p in points], [p.y for p in points], deg=1)),
    )
