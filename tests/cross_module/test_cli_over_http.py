import socket
import threading
import time
from collections.abc import Iterator

import pytest
import uvicorn
from click.testing import CliRunner

from opaprikkie import __version__, cli
from opaprikkie.backend.app import create_app
from opaprikkie.backend.settings import Settings
from opaprikkie.engine import IllegalAction, RandomStrategy
from opaprikkie.sim import http


def serve(settings: Settings) -> Iterator[str]:
    server = uvicorn.Server(uvicorn.Config(create_app(settings), port=0, log_level="warning"))
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    deadline = time.monotonic() + 10
    while not server.started:
        if not thread.is_alive() or time.monotonic() > deadline:
            server.should_exit = True
            pytest.fail("uvicorn didn't start")
        time.sleep(0.01)
    port = server.servers[0].sockets[0].getsockname()[1]
    yield f"http://127.0.0.1:{port}"
    server.should_exit = True
    thread.join(timeout=10)


@pytest.fixture(scope="module")
def dev_backend() -> Iterator[str]:
    yield from serve(Settings(dev_mode=True))


@pytest.fixture(scope="module")
def backend() -> Iterator[str]:
    yield from serve(Settings())


def simulate(*args: str) -> str:
    result = CliRunner().invoke(cli.main, ["simulate", "random", "smart", "-n", "10", *args])
    return result.output


def test_a_seeded_batch_over_http_prints_the_in_process_summary(dev_backend):
    assert simulate("-s", "s", "--url", dev_backend) == simulate("-s", "s")


def test_a_backend_outside_dev_mode_fails_with_the_reason(backend):
    result = CliRunner().invoke(cli.main, ["simulate", "random", "random", "--url", backend])

    assert result.exit_code == 1
    assert result.output == "Error: seeded games need a backend in dev mode (OPAPRIKKIE_DEV_MODE)\n"


def test_an_unreachable_backend_fails_with_the_reason():
    with socket.socket() as unused:
        unused.bind(("127.0.0.1", 0))
        url = f"http://127.0.0.1:{unused.getsockname()[1]}"

    result = CliRunner().invoke(cli.main, ["simulate", "random", "random", "--url", url])

    assert result.exit_code == 1
    assert result.output.startswith(f"Error: can't reach the backend at {url}: ")


def test_a_simulator_on_another_version_fails_with_the_reason(dev_backend, monkeypatch):
    monkeypatch.setattr(http, "__version__", "0.0.1")

    result = CliRunner().invoke(cli.main, ["simulate", "random", "random", "--url", dev_backend])

    assert result.exit_code == 1
    assert result.output == f"Error: backend runs {__version__}, the simulator 0.0.1\n"


def test_a_rejected_choice_fails_the_batch_naming_the_strategy(dev_backend, monkeypatch):
    monkeypatch.setattr(RandomStrategy, "choose_target", lambda self, observation, rng: 99)

    result = CliRunner().invoke(cli.main, ["simulate", "random", "smart", "--url", dev_backend])

    assert result.exit_code == 1
    assert isinstance(result.exception, IllegalAction)
    assert result.exception.__notes__[0].startswith("random in seat 0 of game ")


def test_a_seeded_tournament_over_http_prints_the_in_process_output(dev_backend):
    def tournament(*args: str) -> str:
        args = ("tournament", "sloppy", "smart", "highest", "-n", "6", "-s", "s", *args)
        return CliRunner().invoke(cli.main, args).output

    assert tournament("--url", dev_backend) == tournament()
