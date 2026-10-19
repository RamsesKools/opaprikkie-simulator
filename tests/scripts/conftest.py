import importlib.util
from pathlib import Path
from types import ModuleType

import pytest

SCRIPTS = Path(__file__).parents[2] / "scripts"


def load(name: str) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / f"{name}.py")
    assert spec
    assert spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def dev() -> ModuleType:
    return load("dev")


@pytest.fixture
def version() -> ModuleType:
    return load("version")


@pytest.fixture
def gen_api() -> ModuleType:
    return load("gen_api")
