import json


def test_gen_api_writes_the_schema_for_the_frontend(gen_api, tmp_path, monkeypatch):
    (tmp_path / "frontend").mkdir()
    monkeypatch.setattr(gen_api, "ROOT", tmp_path)

    assert gen_api.main() == 0

    schema = json.loads((tmp_path / "frontend" / "openapi.json").read_text())
    assert {"/api/health", "/api/sessions", "/api/game/target"} <= set(schema["paths"])
