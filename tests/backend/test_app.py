import pytest
from fastapi.testclient import TestClient

from opaprikkie import __version__
from opaprikkie.backend.app import create_app
from opaprikkie.backend.settings import Settings


@pytest.mark.parametrize("dev_mode", [True, False])
def test_health_reports_version_and_dev_mode(dev_mode):
    client = TestClient(create_app(Settings(dev_mode=dev_mode)))

    assert client.get("/api/health").json() == {"version": __version__, "dev_mode": dev_mode}


@pytest.mark.parametrize(("dev_mode", "status"), [(True, 200), (False, 404)])
def test_docs_are_served_in_dev_mode_only(dev_mode, status):
    client = TestClient(create_app(Settings(dev_mode=dev_mode)))

    assert client.get("/docs").status_code == status
    assert client.get("/openapi.json").status_code == status
