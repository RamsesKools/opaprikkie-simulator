import json
from pathlib import Path

import pytest


def write_versions(root: Path, python: str, frontend: str) -> None:
    (root / "frontend").mkdir(exist_ok=True)
    (root / "pyproject.toml").write_text(f'[project]\nversion = "{python}"\n')
    (root / "frontend" / "package.json").write_text(json.dumps({"version": frontend}))


@pytest.fixture
def commands(version, tmp_path, monkeypatch):
    calls = []

    def run(args, cwd, check):
        calls.append((args, cwd))
        if args[0] == "uv":
            write_versions(tmp_path, "1.3.0", "1.2.3")

    monkeypatch.setattr(version, "ROOT", tmp_path)
    monkeypatch.setattr(version.subprocess, "run", run)
    return calls


def test_check_passes_when_versions_match(version, tmp_path):
    write_versions(tmp_path, "1.2.3", "1.2.3")

    assert version.check(tmp_path) == 0


def test_check_fails_when_versions_differ(version, tmp_path, capsys):
    write_versions(tmp_path, "1.2.3", "1.2.4")

    assert version.check(tmp_path) == 1
    assert "1.2.3" in capsys.readouterr().out


def test_main_checks_the_repo_root(version, tmp_path, commands):
    write_versions(tmp_path, "1.2.3", "1.2.4")

    assert version.main(["check"]) == 1


def test_bump_sets_the_frontend_to_the_new_python_version(version, tmp_path, commands):
    write_versions(tmp_path, "1.2.3", "1.2.3")

    assert version.main(["bump", "minor"]) == 0

    assert commands == [
        (["uv", "version", "--bump", "minor"], tmp_path),
        (
            ["npm", "version", "1.3.0", "--no-git-tag-version", "--allow-same-version"],
            tmp_path / "frontend",
        ),
    ]


@pytest.mark.parametrize("args", [[], ["bump"], ["bump", "huge"], ["release"]])
def test_main_rejects_unknown_commands(version, args, capsys):
    assert version.main(args) == 2
    assert "Usage" in capsys.readouterr().err
