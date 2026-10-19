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


@pytest.fixture
def spa(tmp_path):
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text("<div id=root></div>")
    (tmp_path / "assets" / "app.js").write_text("console.log(1)")
    return tmp_path


def test_serves_the_spa_next_to_the_api(spa):
    client = TestClient(create_app(Settings(static_dir=spa)))

    assert client.get("/").text == "<div id=root></div>"
    assert client.get("/assets/app.js").text == "console.log(1)"
    assert client.get("/api/health").status_code == 200


def test_runs_without_a_built_spa(tmp_path):
    client = TestClient(create_app(Settings(static_dir=tmp_path / "missing")))

    assert client.get("/").status_code == 404
    assert client.get("/api/health").status_code == 200
