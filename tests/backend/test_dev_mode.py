from unittest.mock import ANY

import pytest

from opaprikkie import engine

HOT_SEAT = {"controllers": ["human", "human"]}
VERSUS_AI = {"controllers": ["human", "ai"]}
NAMES = {"names": ["Ada", "Opa"]}


@pytest.mark.parametrize(
    ("extra", "fields"),
    [
        ({"seed": "s"}, ["seed"]),
        ({"first_player": 0}, ["first_player"]),
        ({"strategy": "random", "seed": 1}, ["seed", "strategy"]),
    ],
)
def test_dev_only_fields_are_forbidden_outside_dev_mode(client, extra, fields):
    response = client.post("/api/game", json=VERSUS_AI | extra)

    assert response.status_code == 403
    assert response.json() == {"code": "dev_mode_only", "message": ANY, "fields": fields}
    assert client.get("/api/game").status_code == 404


def test_dev_mode_shows_the_seed_and_the_strategy(dev_client):
    game = dev_client.post("/api/game", json=VERSUS_AI | {"seed": "s"}).json()["game"]

    assert game["seed"] == "s"
    assert game["strategy"] in engine.BUILTIN_STRATEGIES


def test_dev_mode_generates_a_seed_when_none_is_given(dev_client):
    game = dev_client.post("/api/game", json=HOT_SEAT).json()["game"]

    assert game["seed"]
    assert game["strategy"] is None


def test_dev_mode_accepts_a_strategy(dev_client):
    game = dev_client.post("/api/game", json=VERSUS_AI | {"strategy": "random"}).json()["game"]

    assert game["strategy"] == "random"


def test_an_unknown_strategy_is_rejected(dev_client):
    response = dev_client.post("/api/game", json=VERSUS_AI | {"strategy": "psychic"})

    assert response.status_code == 422
    assert response.json() == {
        "code": "unknown_strategy",
        "message": ANY,
        "strategies": sorted(engine.BUILTIN_STRATEGIES),
    }


def test_a_first_player_skips_the_dice_off(dev_client):
    dev_client.post("/api/game", json=HOT_SEAT | {"seed": "s", "first_player": 1})

    update = dev_client.post("/api/game/names", json=NAMES).json()

    assert all(entry["kind"] != "dice_off" for entry in update["logs"])
    assert update["game"]["phase"] == "choosing_target"
    state, _ = engine.new_game(engine.CLASSIC, "s")
    state, _ = engine.name_players(state, ["Ada", "Opa"], first_player=1)
    assert update["game"]["observation"]["seat"] == state.current_player


@pytest.mark.parametrize("player", [2, -1, "0", True, 0.5])
def test_a_first_player_outside_the_game_is_rejected_at_creation(dev_client, player):
    response = dev_client.post("/api/game", json=HOT_SEAT | {"first_player": player})

    assert response.status_code == 422
    assert response.json()["code"] == "invalid_request"
    assert dev_client.get("/api/game").status_code == 404


def test_the_ai_strategy_is_drawn_from_every_builtin_by_seed(dev_client):
    def strategy(seed: int) -> str:
        game = dev_client.post("/api/game", json=VERSUS_AI | {"seed": seed}).json()["game"]
        return game["strategy"]

    assert strategy(7) == strategy(7)
    assert {strategy(seed) for seed in range(40)} == set(engine.BUILTIN_STRATEGIES)


@pytest.mark.parametrize("strategy", sorted(engine.BUILTIN_STRATEGIES))
def test_every_builtin_can_be_picked_and_played(dev_client, strategy):
    dev_client.post("/api/game", json=VERSUS_AI | {"strategy": strategy, "first_player": 1})

    update = dev_client.post("/api/game/names", json=NAMES).json()

    assert update["game"]["strategy"] == strategy
    assert update["logs"][0]["player"] == 1


def test_a_game_between_two_ais_finishes_during_auto_play(dev_client):
    dev_client.post("/api/game", json={"controllers": ["ai", "ai"]})

    update = dev_client.post("/api/game/names", json=NAMES).json()

    assert update["game"]["phase"] == "finished"
    assert update["game"]["winner"] in (0, 1)
    assert {e["player"] for e in update["logs"] if e["kind"] == "roll_sequence"} == {0, 1}


def play(client, seed: str) -> list[dict]:
    client.post("/api/game", json=VERSUS_AI | {"seed": seed, "first_player": 1})
    update = client.post("/api/game/names", json=NAMES).json()
    logs = update["logs"]
    while update["game"]["phase"] != "finished":
        target = update["game"]["observation"]["legal_targets"][-1]["target"]
        update = client.post("/api/game/target", json={"target": target}).json()
        logs += update["logs"]
    return logs


def test_a_game_versus_ai_replays_from_the_seed(dev_client):
    assert play(dev_client, "replay") == play(dev_client, "replay")
    assert play(dev_client, "replay") != play(dev_client, "other")
