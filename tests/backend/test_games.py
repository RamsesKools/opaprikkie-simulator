from unittest.mock import ANY

import pytest

HOT_SEAT = {"controllers": ["human", "human"]}
NAMES = {"names": ["Ada", "Bob"]}
EMPTY_BOARD = {str(target): 0 for target in range(1, 13)}


def test_a_new_game_waits_for_names(client):
    response = client.post("/api/game", json=HOT_SEAT)

    assert response.status_code == 201
    assert response.json() == {
        "game": {
            "ruleset": "classic",
            "phase": "naming",
            "names": [],
            "controllers": ["human", "human"],
            "pegs": [EMPTY_BOARD, EMPTY_BOARD],
            "turns": 0,
            "dice_counts": [[0] * 6, [0] * 6],
            "observation": None,
            "winner": None,
            "seed": None,
            "strategy": None,
        },
        "logs": [],
    }
    assert client.get("/api/game").json() == response.json()["game"]


def test_naming_runs_the_dice_off_and_the_winner_chooses(client):
    client.post("/api/game", json=HOT_SEAT)

    update = client.post("/api/game/names", json={"names": [" Ada ", "Bob"]}).json()

    rounds = update["logs"]
    assert rounds
    assert all(entry["kind"] == "dice_off" for entry in rounds)
    final = {roll["player"]: sum(roll["dice"]) for roll in rounds[-1]["rolls"]}
    game = update["game"]
    assert game["phase"] == "choosing_first_player"
    assert game["names"] == ["Ada", "Bob"]
    assert game["observation"]["seat"] == max(final, key=final.__getitem__)
    assert game["observation"]["legal_targets"] == []
    assert client.get("/api/session").json()["names"] == ["Ada", "Bob"]


@pytest.mark.parametrize(
    ("names", "rule"),
    [("Ada", "type"), ([1, 2], "type"), (["Ada"], "count"), (["Ada", " "], "blank")],
)
def test_invalid_names_are_rejected_and_the_game_still_waits(client, names, rule):
    client.post("/api/game", json=HOT_SEAT)

    response = client.post("/api/game/names", json={"names": names})

    assert response.status_code == 422
    assert response.json() == {"code": "invalid_names", "message": ANY, "rule": rule}
    assert client.get("/api/game").json()["phase"] == "naming"
    assert client.get("/api/session").json()["names"] is None


def test_naming_twice_is_the_wrong_phase(client):
    client.post("/api/game", json=HOT_SEAT)
    client.post("/api/game/names", json=NAMES)

    response = client.post("/api/game/names", json=NAMES)

    assert response.status_code == 422
    assert response.json() == {
        "code": "wrong_phase",
        "message": ANY,
        "phase": "choosing_first_player",
    }


def test_the_dice_off_winner_may_let_the_other_player_start(client):
    client.post("/api/game", json=HOT_SEAT)
    winner = client.post("/api/game/names", json=NAMES).json()["game"]["observation"]["seat"]

    update = client.post("/api/game/first_player", json={"player": 1 - winner}).json()

    observation = update["game"]["observation"]
    assert update["game"]["phase"] == "choosing_target"
    assert observation["turn"] == 1
    assert len(observation["opening_roll"]) == 6
    assert observation["legal_targets"]
    assert observation["seat"] == 1 - winner
    assert update["logs"] == []


def play_to_the_end(client, game: dict) -> tuple[dict, list[dict]]:
    logs = []
    while game["phase"] == "choosing_target":
        target = game["observation"]["legal_targets"][0]["target"]
        update = client.post("/api/game/target", json={"target": target}).json()
        game = update["game"]
        logs += update["logs"]
    return game, logs


def test_a_hot_seat_game_plays_to_the_end(client):
    client.post("/api/game", json=HOT_SEAT)
    winner = client.post("/api/game/names", json=NAMES).json()["game"]["observation"]["seat"]
    game = client.post("/api/game/first_player", json={"player": winner}).json()["game"]

    game, logs = play_to_the_end(client, game)

    assert game["phase"] == "finished"
    assert game["observation"] is None
    assert set(game["pegs"][game["winner"]].values()) == {5}
    assert {entry["player"] for entry in logs if entry["kind"] == "roll_sequence"} == {0, 1}
    assert client.get("/api/game").json() == game


def started(client) -> dict:
    client.post("/api/game", json=HOT_SEAT)
    winner = client.post("/api/game/names", json=NAMES).json()["game"]["observation"]["seat"]
    return client.post("/api/game/first_player", json={"player": winner}).json()["game"]


@pytest.mark.parametrize("target", [13, "7", 7.0, True, None])
def test_anything_but_a_target_number_is_not_a_target(client, target):
    game = started(client)

    response = client.post("/api/game/target", json={"target": target})

    assert response.status_code == 422
    assert response.json() == {
        "code": "illegal_target",
        "message": ANY,
        "legal_targets": [t["target"] for t in game["observation"]["legal_targets"]],
        "reason": "not_a_target",
    }
    assert client.get("/api/game").json() == game


def test_a_target_without_a_match_is_rejected(client):
    game = started(client)
    legal = {t["target"] for t in game["observation"]["legal_targets"]}

    response = client.post("/api/game/target", json={"target": min(set(range(1, 13)) - legal)})

    assert response.json()["reason"] == "no_match"


@pytest.mark.parametrize("player", [2, -1, "0", None])
def test_a_first_player_outside_the_game_is_rejected(client, player):
    client.post("/api/game", json=HOT_SEAT)
    client.post("/api/game/names", json=NAMES)

    response = client.post("/api/game/first_player", json={"player": player})

    assert response.status_code == 422
    assert response.json() == {"code": "invalid_player", "message": ANY, "players": 2}


def test_choosing_a_target_before_naming_is_the_wrong_phase(client):
    client.post("/api/game", json=HOT_SEAT)

    response = client.post("/api/game/target", json={"target": 7})

    assert response.json() == {"code": "wrong_phase", "message": ANY, "phase": "naming"}


@pytest.mark.parametrize(
    ("method", "path", "body"),
    [
        ("GET", "/api/game", None),
        ("POST", "/api/game/names", NAMES),
        ("POST", "/api/game/first_player", {"player": 0}),
        ("POST", "/api/game/target", {"target": 7}),
    ],
)
def test_game_routes_need_a_game(client, method, path, body):
    response = client.request(method, path, json=body)

    assert response.status_code == 404
    assert response.json()["code"] == "no_game"


@pytest.mark.parametrize(
    "body",
    [{}, {"controllers": ["human"]}, {"controllers": ["human", "robot"]}, HOT_SEAT | {"x": 1}],
)
def test_malformed_requests_are_rejected_in_the_same_shape(client, body):
    response = client.post("/api/game", json=body)

    assert response.status_code == 422
    assert response.json() == {"code": "invalid_request", "message": ANY, "errors": ANY}
    assert all(set(error) == {"loc", "msg"} for error in response.json()["errors"])


def test_a_topped_peg_is_not_a_legal_target(dev_client):
    dev_client.post("/api/game", json=HOT_SEAT | {"seed": "topped", "first_player": 0})
    game = dev_client.post("/api/game/names", json=NAMES).json()["game"]
    while not (
        topped := [t for t, row in game["pegs"][game["observation"]["seat"]].items() if row == 5]
    ):
        target = game["observation"]["legal_targets"][0]["target"]
        game = dev_client.post("/api/game/target", json={"target": target}).json()["game"]

    response = dev_client.post("/api/game/target", json={"target": int(topped[0])})

    assert response.json()["reason"] == "topped"


def test_targets_and_rolls_show_the_dice_they_keep(client):
    legal = started(client)["observation"]["legal_targets"][0]

    logs = client.post("/api/game/target", json={"target": legal["target"]}).json()["logs"]

    opening = logs[0]["rolls"][0]
    assert legal["set_aside"]
    assert opening["set_aside"] == legal["set_aside"]
    assert opening["matches"] == legal["matches"]
