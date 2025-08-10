"""Utility functions for Opa Prikkie simulator."""

import logging
import sys


def init_logger(name: str = "opaprikkie_sim", level: int = logging.INFO) -> logging.Logger:
    """Initialize and configure a logger with timestamp formatting.

    Args:
        name: Logger name (default: "opaprikkie_sim")
        level: Logging level (default: logging.INFO)

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)

    # Only configure if not already configured
    if not logger.handlers:
        logger.setLevel(level)

        # Create console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(level)

        # Create formatter with timestamp
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
        )
        console_handler.setFormatter(formatter)

        # Add handler to logger
        logger.addHandler(console_handler)

    return logger


def get_version() -> str:
    """Get the version of the Opa Prikkie simulator."""
    import importlib.metadata

    try:
        return importlib.metadata.version("opaprikkie_sim")
    except importlib.metadata.PackageNotFoundError:
        return "unknown"
