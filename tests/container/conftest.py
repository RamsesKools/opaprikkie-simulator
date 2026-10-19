import json
import os
import subprocess
import time
import urllib.request
from collections.abc import Iterator

import pytest

IMAGE = os.environ.get("CONTAINER_IMAGE", "ghcr.io/ramseskools/opaprikkie:latest")


def docker(*args: str) -> str:
    result = subprocess.run(["docker", *args], check=True, capture_output=True, text=True)
    return result.stdout.strip()


def wait_until_up(url: str, timeout: float = 30) -> None:
    deadline = time.monotonic() + timeout
    while True:
        try:
            urllib.request.urlopen(url, timeout=1)
            return
        except OSError:
            if time.monotonic() > deadline:
                raise
            time.sleep(0.2)


@pytest.fixture(scope="session")
def base_url() -> Iterator[str]:
    container = docker("run", "--detach", "--publish", "127.0.0.1::8000", IMAGE)
    try:
        url = f"http://{docker('port', container, '8000/tcp').splitlines()[0]}"
        wait_until_up(f"{url}/api/health")
        yield url
    finally:
        docker("rm", "--force", container)


@pytest.fixture(scope="session")
def image_config() -> dict:
    return json.loads(docker("image", "inspect", "--format", "{{json .Config}}", IMAGE))
