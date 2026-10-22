import httpx2
import pytest

from opaprikkie import __version__
from opaprikkie.engine import Observation, TakeOption, TakeOutcome
from opaprikkie.sim import BackendError, HttpDriver

HEALTHY = {"version": __version__, "dev_mode": True}


def backend(answers: dict[str, tuple[int, object]]) -> httpx2.Client:
    """A backend that answers each path with a fixed status and a JSON or text body."""
    answers = {
        "/api/health": (200, HEALTHY),
        "/api/sessions": (201, {}),
        "/api/game": (201, {}),
    } | answers

    def answer(request: httpx2.Request) -> httpx2.Response:
        status, body = answers[request.url.path]
        if isinstance(body, str):
            return httpx2.Response(status, text=body)
        return httpx2.Response(status, json=body)

    return httpx2.Client(base_url="http://backend", transport=httpx2.MockTransport(answer))


def lowest(observation: Observation) -> int:
    return min(t.target for t in observation.legal_targets)


def test_a_backend_on_another_version_is_refused_before_any_game():
    stale = backend({"/api/health": (200, {"version": "0.0.1", "dev_mode": True})})

    with pytest.raises(BackendError, match=f"backend runs 0.0.1, the simulator {__version__}"):
        HttpDriver(stale)


def test_a_server_that_isnt_the_backend_is_refused():
    with pytest.raises(BackendError, match="GET /api/health failed with 404: Not Found"):
        HttpDriver(backend({"/api/health": (404, "Not Found")}))


def test_a_log_entry_of_an_unexpected_kind_is_refused():
    dice_off = {"game": {}, "logs": [{"kind": "dice_off", "rolls": []}]}
    driver = HttpDriver(backend({"/api/game/names": (200, dice_off)}))

    with pytest.raises(BackendError, match="unexpected log entry 'dice_off'"):
        driver.play("seed", 0, lowest)


@pytest.mark.parametrize("status", [200, 422])
def test_an_answer_that_isnt_json_is_refused(status):
    driver = HttpDriver(backend({"/api/game/names": (status, "<html>proxy</html>")}))

    with pytest.raises(BackendError, match=f"POST /api/game/names answered {status} without JSON"):
        driver.play("seed", 0, lowest)


def test_a_server_error_is_refused():
    error = {"code": "internal_error", "message": "something went wrong"}
    driver = HttpDriver(backend({"/api/game/names": (500, error)}))

    with pytest.raises(
        BackendError, match=r"POST /api/game/names failed with 500: .*internal_error"
    ):
        driver.play("seed", 0, lowest)


def test_a_take_choice_is_posted_as_a_take():
    sent = []
    observation = {
        "seat": 0,
        "pegs": [{"1": 0}, {"1": 0}],
        "opening_roll": [1, 1],
        "legal_targets": [{"target": 1, "matches": 2, "guaranteed_moves": 2, "set_aside": [0, 1]}],
        "turn": 1,
        "continuation": 0,
        "sequence": {
            "target": 1,
            "rolls": [{"dice": [1, 1], "set_aside": [0], "reset": False, "matches": 1}],
            "matches": 1,
            "dice": [1],
            "reset": False,
        },
    }
    playing = {"game": {"phase": "choosing_dice", "observation": observation}, "logs": []}
    finished = {"game": {"phase": "finished", "winner": 1}, "logs": []}
    answers = iter([playing, finished])

    def answer(request: httpx2.Request) -> httpx2.Response:
        path = request.url.path
        if path == "/api/health":
            return httpx2.Response(200, json=HEALTHY)
        if path in ("/api/game/names", "/api/game/take"):
            sent.append((path, request.content))
            return httpx2.Response(200, json=next(answers))
        return httpx2.Response(201, json={})

    driver = HttpDriver(
        httpx2.Client(base_url="http://backend", transport=httpx2.MockTransport(answer))
    )
    seen = []

    def choose(obs: Observation) -> TakeOption:
        seen.append(obs.sequence)
        return TakeOption(1, (0,), 1, 1, TakeOutcome.THROW, 0)

    driver.play("seed", 0, choose)

    assert sent[-1] == ("/api/game/take", b'{"target":1,"dice":[0]}')
    assert seen[0] is not None
    assert seen[0].target == 1
    assert seen[0].matches == 1
