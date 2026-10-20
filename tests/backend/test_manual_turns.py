from unittest.mock import ANY

import pytest

HOT_SEAT = {"controllers": ["human", "human"]}
VERSUS_AI = {"controllers": ["human", "ai"]}
NAMES = {"names": ["Ada", "Bob"]}


def opened(client, controllers: dict, seed: str) -> dict:
    client.post("/api/game", json=controllers | {"seed": seed, "first_player": 0})
    return client.post("/api/game/names", json=NAMES).json()["game"]


def single(game: dict) -> dict:
    return next(t for t in game["observation"]["legal_targets"] if t["target"] <= 6)


def in_sequence(client, controllers: dict = HOT_SEAT) -> tuple[dict, dict]:
    """The opening state and the update after taking one die for a single-die target."""
    for seed in range(100):
        game = opened(client, controllers, f"manual:{seed}")
        legal = single(game)
        body = {"target": legal["target"], "dice": legal["set_aside"][:1]}
        update = client.post("/api/game/take", json=body).json()
        if update["game"]["phase"] == "choosing_dice":
            return game, update
    pytest.fail("no seed where the sequence goes on")


def test_taking_dice_locks_the_target_and_shows_the_sequence_so_far(dev_client):
    game, update = in_sequence(dev_client)

    legal = single(game)
    sequence = update["game"]["observation"]["sequence"]
    assert update["logs"] == []
    assert update["game"]["pegs"] == game["pegs"]
    assert sequence == {
        "target": legal["target"],
        "rolls": [
            {
                "dice": game["observation"]["opening_roll"],
                "set_aside": ANY,
                "reset": False,
                "matches": 1,
            }
        ],
        "matches": 1,
        "dice": ANY,
        "reset": False,
    }
    assert update["game"]["observation"]["legal_targets"][0]["target"] == legal["target"]
    assert dev_client.get("/api/game").json() == update["game"]


def test_stopping_moves_the_peg_by_the_matches_taken(dev_client):
    _, waiting = in_sequence(dev_client)
    target = waiting["game"]["observation"]["sequence"]["target"]

    update = dev_client.post("/api/game/stop").json()

    sequence = update["logs"][0]
    assert sequence["kind"] == "roll_sequence"
    assert sequence["matches"] == sequence["movement"] == 1
    assert sequence["rolls"][-1]["matches"] == 0
    assert update["game"]["pegs"][0][str(target)] == 1
    assert update["game"]["observation"]["sequence"] is None


def test_a_turn_with_a_legal_target_cant_end_without_moving(dev_client):
    opened(dev_client, HOT_SEAT, "manual")

    response = dev_client.post("/api/game/stop")

    assert response.status_code == 422
    assert response.json() == {"code": "wrong_phase", "message": ANY, "phase": "choosing_target"}


@pytest.mark.parametrize(("dice", "reason"), [([], "empty"), ([9], "not_dice"), ("0", "not_dice")])
def test_dice_that_arent_matches_are_rejected(dev_client, dice, reason):
    game = opened(dev_client, HOT_SEAT, "manual")
    target = single(game)["target"]

    response = dev_client.post("/api/game/take", json={"target": target, "dice": dice})

    assert response.status_code == 422
    assert response.json() == {"code": "illegal_dice", "message": ANY, "reason": reason}
    assert dev_client.get("/api/game").json() == game


def test_a_sequence_in_progress_rejects_another_target(dev_client):
    _, waiting = in_sequence(dev_client)
    target = waiting["game"]["observation"]["sequence"]["target"]

    response = dev_client.post("/api/game/take", json={"target": target % 12 + 1, "dice": [0]})

    assert response.json() == {
        "code": "illegal_target",
        "message": ANY,
        "legal_targets": [target],
        "reason": "locked",
    }


def test_the_ai_plays_after_a_manual_turn_ends(dev_client):
    in_sequence(dev_client, VERSUS_AI)

    update = dev_client.post("/api/game/stop").json()

    players = [entry["player"] for entry in update["logs"] if entry["kind"] != "dice_off"]
    assert players[0] == 0
    assert 1 in players
    assert update["game"]["phase"] == "finished" or update["game"]["observation"]["seat"] == 0


@pytest.mark.parametrize(
    ("path", "body"),
    [("/api/game/take", {"target": 6, "dice": [0]}), ("/api/game/stop", None)],
)
def test_manual_routes_need_a_game(client, path, body):
    response = client.post(path, json=body)

    assert response.status_code == 404
    assert response.json()["code"] == "no_game"


def test_the_observation_lists_the_takes_for_the_dice_on_the_table(dev_client):
    game, update = in_sequence(dev_client)
    legal = single(game)
    target = legal["target"]

    option = {"target": target, "dice": legal["set_aside"][:1], "matches": 1, "row": 1}
    assert option in game["observation"]["takes"]
    assert {t["target"] for t in update["game"]["observation"]["takes"]} == {target}
    assert all(t["row"] == 1 + t["matches"] for t in update["game"]["observation"]["takes"])


def test_a_die_chosen_twice_is_not_dice(dev_client):
    game = opened(dev_client, HOT_SEAT, "manual")
    legal = single(game)
    dice = legal["set_aside"][:1] * 2

    response = dev_client.post("/api/game/take", json={"target": legal["target"], "dice": dice})

    assert response.json()["reason"] == "not_dice"
