from random import Random

import pytest
from fastapi.testclient import TestClient

from opaprikkie.backend.app import create_app
from opaprikkie.backend.settings import Settings
from opaprikkie.engine import IllegalAction, Observation, Rejection
from opaprikkie.sim import BackendError, HttpDriver, InProcessDriver, run_batch


@pytest.fixture
def driver() -> HttpDriver:
    return HttpDriver(TestClient(create_app(Settings(dev_mode=True))))


class Cheater:
    name = "cheater"

    def choose_first_player(self, observation: Observation) -> int:
        return observation.seat

    def choose_target(self, observation: Observation, rng: Random) -> int:
        return 99


def lowest(observation: Observation) -> int:
    return min(t.target for t in observation.legal_targets)


@pytest.mark.parametrize("first_player", [0, 1])
def test_a_seeded_game_over_http_logs_the_same_as_in_process(driver, first_player):
    over_http = driver.play("parity", first_player, lowest)

    assert over_http == InProcessDriver().play("parity", first_player, lowest)


def test_a_seeded_batch_over_http_matches_in_process(driver):
    over_http = run_batch(["random", "smart"], games=6, seed="batch", driver=driver)

    assert over_http == run_batch(["random", "smart"], games=6, seed="batch")


def test_a_backend_outside_dev_mode_is_refused_since_it_takes_no_seeds():
    with pytest.raises(BackendError, match="need a backend in dev mode"):
        HttpDriver(TestClient(create_app(Settings())))


def test_a_rejected_choice_over_http_fails_the_batch_like_in_process(driver):
    with pytest.raises(IllegalAction) as over_http:
        run_batch(["random", Cheater()], games=3, seed="batch", driver=driver)
    with pytest.raises(IllegalAction) as in_process:
        run_batch(["random", Cheater()], games=3, seed="batch")

    assert over_http.value.code is Rejection.ILLEGAL_TARGET
    assert over_http.value.message == in_process.value.message
    assert over_http.value.hints["reason"] == "not_a_target"
    assert over_http.value.__notes__ == ["cheater in seat 1 of game 'batch:0'"]


def test_a_session_evicted_mid_game_fails_the_game():
    app = create_app(Settings(dev_mode=True, max_sessions=1))
    driver = HttpDriver(TestClient(app))

    def evict(observation: Observation) -> int:
        TestClient(app).post("/api/sessions")
        return lowest(observation)

    with pytest.raises(BackendError, match=r"POST /api/game/target failed with 401: .*no_session"):
        driver.play("parity", 0, evict)
