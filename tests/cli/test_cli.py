from click.testing import CliRunner

from opaprikkie import __version__, cli


def test_serve_runs_the_app_on_the_configured_address(monkeypatch):
    calls = []
    monkeypatch.setenv("OPAPRIKKIE_PORT", "9001")
    monkeypatch.setattr(cli.uvicorn, "run", lambda app, host, port: calls.append((host, port)))

    result = CliRunner().invoke(cli.main, ["serve"])

    assert result.exit_code == 0
    assert calls == [("127.0.0.1", 9001)]


def test_simulate_is_not_available_yet():
    result = CliRunner().invoke(cli.main, ["simulate"])

    assert result.exit_code == 1
    assert "aren't available yet" in result.output


def test_version():
    assert __version__ in CliRunner().invoke(cli.main, ["--version"]).output
