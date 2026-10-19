import pytest
from fastapi.testclient import TestClient

from opaprikkie.backend.app import create_app
from opaprikkie.backend.settings import Settings


def session(settings: Settings) -> TestClient:
    client = TestClient(create_app(settings))
    client.post("/api/sessions")
    return client


@pytest.fixture
def client() -> TestClient:
    return session(Settings())


@pytest.fixture
def dev_client() -> TestClient:
    return session(Settings(dev_mode=True))
