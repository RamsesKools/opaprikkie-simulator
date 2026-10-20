import json
import re
import urllib.request

import pytest

from opaprikkie import __version__

pytestmark = pytest.mark.container


def get(url: str) -> str:
    with urllib.request.urlopen(url) as response:
        return response.read().decode()


def test_health_reports_the_app_version(base_url):
    assert json.loads(get(f"{base_url}/api/health")) == {
        "version": __version__,
        "dev_mode": False,
        "strategies": None,
    }


def test_serves_the_spa_and_its_assets(base_url):
    index = get(f"{base_url}/")
    assert '<div id="root">' in index

    script = re.search(r'src="(/assets/[^"]+\.js)"', index)
    assert script
    assert get(f"{base_url}{script[1]}")


def test_runs_as_a_non_root_user(image_config):
    assert image_config["User"] not in {"", "root", "0"}


def test_labels_the_version_and_commit(image_config):
    labels = image_config["Labels"]

    assert labels["org.opencontainers.image.version"] == __version__
    assert re.fullmatch(r"[0-9a-f]{40}", labels["org.opencontainers.image.revision"])
