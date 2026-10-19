from unittest.mock import ANY

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

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
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<div id=root></div>")
    (dist / "assets" / "app.js").write_text("console.log(1)")
    (tmp_path / "secret.txt").write_text("secret")
    return dist


def test_serves_the_spa_next_to_the_api(spa):
    client = TestClient(create_app(Settings(static_dir=spa)))

    assert client.get("/").text == "<div id=root></div>"
    assert client.get("/assets/app.js").text == "console.log(1)"
    assert client.get("/api/health").status_code == 200


def test_unknown_api_paths_stay_json_404s(spa):
    response = TestClient(create_app(Settings(static_dir=spa))).get("/api/nope")

    assert response.status_code == 404
    assert response.headers["content-type"] == "application/json"


def test_does_not_serve_files_outside_the_spa(spa):
    client = TestClient(create_app(Settings(static_dir=spa)))

    assert client.get("/%2e%2e/secret.txt").status_code == 404
    assert client.get("/assets/%2e%2e/%2e%2e/secret.txt").status_code == 404


def test_runs_without_a_built_spa(tmp_path):
    client = TestClient(create_app(Settings(static_dir=tmp_path / "missing")))

    assert client.get("/").status_code == 404
    assert client.get("/api/health").status_code == 200


@pytest.mark.parametrize(
    ("method", "path", "status", "code"),
    [("GET", "/api/nope", 404, "not_found"), ("PUT", "/api/game", 405, "method_not_allowed")],
)
def test_routing_errors_have_the_error_shape(method, path, status, code):
    client = TestClient(create_app(Settings()))

    response = client.request(method, path)

    assert response.status_code == status
    assert response.json() == {"code": code, "message": ANY}


def test_server_errors_have_the_error_shape(tmp_path):
    app = create_app(Settings(static_dir=tmp_path / "missing"))

    @app.get("/api/broken")
    def broken() -> None:
        raise RuntimeError("secret detail")

    response = TestClient(app, raise_server_exceptions=False).get("/api/broken")

    assert response.status_code == 500
    assert response.json() == {"code": "internal_error", "message": ANY}
    assert "secret" not in response.text


@pytest.mark.parametrize("field", ["max_sessions", "session_ttl_days"])
def test_session_limits_must_be_positive(field):
    with pytest.raises(ValidationError):
        Settings.model_validate({field: 0})
