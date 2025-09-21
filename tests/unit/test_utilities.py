"""Tests for utility functions."""

import re
from unittest.mock import patch

from opaprikkie_sim.utilities import get_version


def test_get_version_returns_correct_format() -> None:
    """Test that get_version returns a correct X.X.X version format."""
    version = get_version()
    assert version != "unknown"
    assert re.match(r"^\d+\.\d+\.\d+$", version), f"Version '{version}' does not match X.Y.Z format"


def test_get_version_returns_unknown_on_package_not_found() -> None:
    """Test that get_version returns 'unknown' when PackageNotFoundError is raised."""
    with patch("importlib.metadata.version") as mock_version:
        import importlib.metadata

        mock_version.side_effect = importlib.metadata.PackageNotFoundError("opaprikkie_sim")

        version = get_version()
        assert version == "unknown"
