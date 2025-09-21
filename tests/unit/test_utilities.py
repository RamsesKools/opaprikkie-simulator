"""Tests for utility functions."""

import logging
import re
import sys
from io import StringIO
from unittest.mock import patch

from opaprikkie_sim.utilities import get_version, init_logger


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


def test_init_logger_default_parameters() -> None:
    """Test that init_logger creates a logger with default name and level."""
    logger = init_logger()

    assert logger.name == "opaprikkie_sim"
    assert logger.level == logging.INFO
    assert len(logger.handlers) == 1

    # Clean up
    logger.handlers.clear()


def test_init_logger_custom_parameters() -> None:
    """Test that init_logger respects custom name and level parameters."""
    custom_name = "test_logger"
    custom_level = logging.DEBUG

    logger = init_logger(name=custom_name, level=custom_level)

    assert logger.name == custom_name
    assert logger.level == custom_level

    # Clean up
    logger.handlers.clear()


def test_init_logger_handler_configuration() -> None:
    """Test that the logger is configured with correct handler and formatter."""
    logger = init_logger("test_handler_config")

    assert len(logger.handlers) == 1
    handler = logger.handlers[0]

    # Check handler type and stream
    assert isinstance(handler, logging.StreamHandler)
    assert handler.stream == sys.stdout
    assert handler.level == logging.INFO

    # Check formatter
    formatter = handler.formatter
    assert formatter is not None
    assert formatter.datefmt == "%Y-%m-%d %H:%M:%S"

    # Test formatter by actually formatting a log record
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname="",
        lineno=0,
        msg="test message",
        args=(),
        exc_info=None,
    )
    formatted = formatter.format(record)
    assert "test" in formatted  # logger name
    assert "INFO" in formatted  # level
    assert "test message" in formatted  # message

    # Clean up
    logger.handlers.clear()


def test_init_logger_idempotency() -> None:
    """Test that calling init_logger twice doesn't add duplicate handlers."""
    logger_name = "test_idempotent"

    logger1 = init_logger(logger_name)
    initial_handler_count = len(logger1.handlers)

    logger2 = init_logger(logger_name)

    # Should be the same logger instance
    assert logger1 is logger2
    assert len(logger2.handlers) == initial_handler_count

    # Clean up
    logger1.handlers.clear()


def test_init_logger_output_format() -> None:
    """Test that the logger produces correctly formatted output."""
    # Capture stdout
    captured_output = StringIO()

    with patch("sys.stdout", captured_output):
        logger = init_logger("test_output", logging.INFO)
        logger.info("Test message")

    output = captured_output.getvalue().strip()

    # Check that output contains expected components
    assert "test_output" in output
    assert "INFO" in output
    assert "Test message" in output
    # Check timestamp format (YYYY-MM-DD HH:MM:SS)
    assert re.search(r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}", output)

    # Clean up
    logger.handlers.clear()


def test_logger_integration():
    """Test that logger integrates well with the application."""
    logger = init_logger("test_integration")

    # Test that logger can be used without errors
    logger.info("Test message")
    logger.debug("Debug message")
    logger.warning("Warning message")
    logger.error("Error message")

    # Verify logger has the expected methods
    assert hasattr(logger, "info")
    assert hasattr(logger, "debug")
    assert hasattr(logger, "warning")
    assert hasattr(logger, "error")
