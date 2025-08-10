import re

import pytest

from opaprikkie_sim.cli import create_strategy
from opaprikkie_sim.strategy import FinishPegsStrategy, GreedyStrategy, RandomStrategy
from opaprikkie_sim.utilities import get_version


# TODO move this to a separate test file for utilities
def test_version() -> None:
    """Test that the version is correctly set and matches the format X.Y.Z."""
    version = get_version()
    assert version != "unknown"
    assert re.match(r"^\d+\.\d+\.\d+$", version), f"Version '{version}' does not match X.Y.Z format"


@pytest.mark.parametrize(
    ("name", "expected_type"),
    [
        ("random", RandomStrategy),
        ("greedy", GreedyStrategy),
        ("smart", FinishPegsStrategy),
        ("RANDOM", RandomStrategy),  # test case-insensitivity
        ("GrEeDy", GreedyStrategy),
    ],
)
def test_create_strategy_valid(name: str, expected_type: type) -> None:
    strategy = create_strategy(name)
    assert isinstance(strategy, expected_type)


def test_create_strategy_invalid() -> None:
    with pytest.raises(ValueError) as exc:
        create_strategy("unknown")
    assert "Unknown strategy" in str(exc.value)
