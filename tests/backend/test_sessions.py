import pytest
from fastapi.testclient import TestClient

from opaprikkie.backend.app import create_app
from opaprikkie.backend.settings import Settings


def test_a_new_session_sets_the_cookie_and_starts_empty():
    client = TestClient(create_app(Settings()))

    created = client.post("/api/sessions")

    assert created.status_code == 201
    assert created.json() == {"names": None, "game": None}
    assert client.get("/api/session").json() == {"names": None, "game": None}


def test_requests_without_a_session_are_rejected():
    client = TestClient(create_app(Settings()))

    response = client.get("/api/session")

    assert response.status_code == 401
    assert response.json()["code"] == "no_session"


def test_an_unknown_session_id_is_rejected():
    client = TestClient(create_app(Settings()), cookies={"opaprikkie_session": "forged"})

    assert client.get("/api/session").status_code == 401


@pytest.mark.parametrize("secure", [True, False])
def test_the_cookie_is_http_only_lax_and_lasts_the_idle_ttl(secure):
    client = TestClient(create_app(Settings(session_ttl_days=2, cookie_secure=secure)))

    cookie = client.post("/api/sessions").headers["set-cookie"]

    attributes = {part.strip().split("=")[0].lower() for part in cookie.split(";")}
    assert {"httponly", "path"} <= attributes
    assert ("secure" in attributes) is secure
    assert "SameSite=lax" in cookie
    assert f"Max-Age={2 * 86400}" in cookie


def test_using_a_session_refreshes_its_cookie():
    client = TestClient(create_app(Settings()))
    client.post("/api/sessions")

    response = client.get("/api/session")

    assert response.headers["set-cookie"].startswith(
        f"opaprikkie_session={client.cookies['opaprikkie_session']};"
    )


def new_session(app) -> TestClient:
    client = TestClient(app)
    client.post("/api/sessions")
    return client


def test_the_least_recently_used_session_is_evicted_at_the_cap():
    app = create_app(Settings(max_sessions=2))
    first, second = new_session(app), new_session(app)
    first.get("/api/session")

    third = new_session(app)

    assert second.get("/api/session").status_code == 401
    assert first.get("/api/session").status_code == 200
    assert third.get("/api/session").status_code == 200


def test_a_session_expires_after_the_idle_ttl():
    now = [0.0]
    app = create_app(Settings(session_ttl_days=1), clock=lambda: now[0])
    used, idle = new_session(app), new_session(app)

    now[0] = 86399.0
    used.get("/api/session")
    now[0] = 86401.0

    assert idle.get("/api/session").status_code == 401
    assert used.get("/api/session").status_code == 200


def test_a_returning_browser_resumes_its_game_from_the_cookie():
    app = create_app(Settings())
    first_tab = new_session(app)
    first_tab.post("/api/game", json={"controllers": ["human", "human"]})
    game = first_tab.post("/api/game/names", json={"names": ["Ada", "Bob"]}).json()["game"]

    returning = TestClient(app, cookies=dict(first_tab.cookies))

    assert returning.get("/api/session").json() == {"names": ["Ada", "Bob"], "game": game}


def test_a_new_game_replaces_the_old_one_and_keeps_the_names():
    client = new_session(create_app(Settings()))
    client.post("/api/game", json={"controllers": ["human", "human"]})
    client.post("/api/game/names", json={"names": ["Ada", "Bob"]})

    game = client.post("/api/game", json={"controllers": ["human", "ai"]}).json()["game"]

    assert client.get("/api/session").json() == {"names": ["Ada", "Bob"], "game": game}
    assert game["phase"] == "naming"
