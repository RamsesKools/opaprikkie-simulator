import json


def test_gen_api_writes_the_schema_and_its_types_for_the_frontend(gen_api, tmp_path, monkeypatch):
    (tmp_path / "frontend").mkdir()
    monkeypatch.setattr(gen_api, "ROOT", tmp_path)
    commands = []
    monkeypatch.setattr(gen_api.subprocess, "run", lambda command, check: commands.append(command))

    assert gen_api.main() == 0

    schema = json.loads((tmp_path / "frontend" / "openapi.json").read_text())
    assert {"/api/health", "/api/sessions", "/api/game/target"} <= set(schema["paths"])
    tool = str(tmp_path / "frontend" / "tools" / "api_types")
    install, generate = commands
    assert install[:4] == ["npm", "--prefix", tool, "ci"]
    assert generate == [
        *("npm", "--prefix", tool, "exec", "--", "openapi-typescript"),
        *(str(tmp_path / "frontend" / "openapi.json"), "-o"),
        str(tmp_path / "frontend" / "src" / "lib" / "api.d.ts"),
    ]
