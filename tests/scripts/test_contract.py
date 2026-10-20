import sys
import urllib.error
import urllib.request

import pytest

PROBE = """
import json, os, sys, urllib.request
health = json.load(urllib.request.urlopen(os.environ["BACKEND_URL"] + "/api/health"))
print(os.environ["BACKEND_URL"])
sys.exit(0 if health["dev_mode"] else 1)
"""


def test_runs_the_suite_against_a_live_dev_mode_backend(contract, monkeypatch, capfd):
    monkeypatch.setattr(contract, "SUITE", [sys.executable, "-c", PROBE])

    assert contract.main() == 0

    url = capfd.readouterr().out.strip().splitlines()[-1]
    with pytest.raises(urllib.error.URLError):
        urllib.request.urlopen(f"{url}/api/health", timeout=1)


def test_returns_the_suite_exit_code(contract, monkeypatch):
    monkeypatch.setattr(contract, "SUITE", [sys.executable, "-c", "raise SystemExit(3)"])

    assert contract.main() == 3


def test_fails_when_the_backend_doesnt_start(contract, monkeypatch):
    monkeypatch.setattr(contract.sys, "executable", "false")

    with pytest.raises(urllib.error.URLError):
        contract.main()
