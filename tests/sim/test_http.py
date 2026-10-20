import httpx2
import pytest

from opaprikkie import __version__
from opaprikkie.sim import BackendError, HttpDriver


def backend(version: str) -> httpx2.Client:
    def health(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(200, json={"version": version, "dev_mode": True})

    return httpx2.Client(base_url="http://backend", transport=httpx2.MockTransport(health))


def test_a_backend_on_another_version_is_refused_before_any_game():
    with pytest.raises(BackendError, match=f"backend runs 0.0.1, the simulator {__version__}"):
        HttpDriver(backend("0.0.1"))


def test_a_server_that_isnt_the_backend_is_refused():
    def not_found(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(404, text="Not Found")

    client = httpx2.Client(base_url="http://other", transport=httpx2.MockTransport(not_found))

    with pytest.raises(BackendError, match="GET /api/health failed with 404: Not Found"):
        HttpDriver(client)
