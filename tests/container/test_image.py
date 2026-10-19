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
    assert json.loads(get(f"{base_url}/api/health")) == {"version": __version__, "dev_mode": False}


def test_serves_the_spa_and_its_assets(base_url):
    index = get(f"{base_url}/")
    assert '<div id="root">' in index

    script = re.search(r'src="(/assets/[^"]+\.js)"', index)
    assert script
    assert get(f"{base_url}{script[1]}")
