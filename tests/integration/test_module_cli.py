import re
import subprocess
import sys
from pathlib import Path


def test_module_cli_version():
    # Find the root of the project and the src directory
    root = Path(__file__).parent.parent.parent
    src_dir = root / "src"
    # Run the CLI as a module using the src path
    result = subprocess.run(  # noqa: S603
        [sys.executable, "-m", "opaprikkie_sim.cli", "--version"],
        cwd=src_dir,
        capture_output=True,
        text=True,
        check=True,
    )

    assert result.returncode == 0
    assert result.stderr == ""
    assert re.match(r"^\d+\.\d+\.\d+$", result.stdout), "Version does not match X.Y.Z format"


def test_module_cli_help():
    # Find the root of the project and the src directory
    root = Path(__file__).parent.parent.parent
    src_dir = root / "src"
    # Run the CLI as a module using the src path
    result = subprocess.run(  # noqa: S603
        [sys.executable, "-m", "opaprikkie_sim.cli", "--help"],
        cwd=src_dir,
        capture_output=True,
        text=True,
        check=True,
    )
    assert result.returncode == 0
    assert "Usage: python -m opaprikkie_sim.cli [OPTIONS] COMMAND [ARGS]..." in result.stdout
    assert "Opa Prikkie Simulator CLI" in result.stdout
    assert "Options:" in result.stdout
    assert "--help" in result.stdout
    assert "--version" in result.stdout
    assert "Commands:" in result.stdout
    assert "interactive" in result.stdout
    assert "simulation" in result.stdout
