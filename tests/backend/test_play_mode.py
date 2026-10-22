import pytest

VERSUS_AI = {"controllers": ["human", "ai"]}
NAMES = {"names": ["Ada", "Opa"]}
MODES = ["without_hints", "with_hints", "automatic"]


@pytest.mark.parametrize("mode", MODES)
def test_a_game_takes_its_play_mode_at_creation_outside_dev_mode(client, mode):
    response = client.post("/api/game", json=VERSUS_AI | {"play_mode": mode})

    assert response.status_code == 201


def test_the_play_mode_changes_mid_game_without_logs_or_a_new_state(client):
    client.post("/api/game", json=VERSUS_AI)
    before = client.post("/api/game/names", json=NAMES).json()["game"]

    response = client.post("/api/game/play_mode", json={"play_mode": "without_hints"})

    assert response.status_code == 200
    assert response.json() == {"game": before, "logs": []}


@pytest.mark.parametrize("play_mode", ["hints", "", 1])
def test_an_unknown_play_mode_is_rejected(client, play_mode):
    client.post("/api/game", json=VERSUS_AI)

    response = client.post("/api/game/play_mode", json={"play_mode": play_mode})

    assert response.status_code == 422
    assert response.json()["code"] == "invalid_request"
    created = client.post("/api/game", json=VERSUS_AI | {"play_mode": play_mode})
    assert created.status_code == 422


def test_setting_the_play_mode_needs_a_game(client):
    response = client.post("/api/game/play_mode", json={"play_mode": "automatic"})

    assert response.status_code == 404
    assert response.json()["code"] == "no_game"


def sloppy_seed(dev_client) -> str:
    for seed in map(str, range(200)):
        game = dev_client.post("/api/game", json=VERSUS_AI | {"seed": seed}).json()["game"]
        if game["strategy"] == "sloppy":
            return seed
    pytest.fail("no seed draws sloppy")


def ai_rolls(dev_client, body: dict, mode_before_names: str | None = None) -> list[list[list[int]]]:
    """The AI's set-aside dice per roll over a game the human plays on its first legal target."""
    dev_client.post("/api/game", json=body)
    if mode_before_names:
        dev_client.post("/api/game/play_mode", json={"play_mode": mode_before_names})
    update = dev_client.post("/api/game/names", json=NAMES).json()
    rolls = []
    while True:
        sequences = [e for e in update["logs"] if e["kind"] == "roll_sequence" and e["player"] == 1]
        rolls += [r["set_aside"] for e in sequences for r in e["rolls"]]
        if update["game"]["phase"] == "finished":
            return rolls
        observation = update["game"]["observation"]
        assert observation["seat"] == 0
        target = observation["legal_targets"][0]["target"]
        update = dev_client.post("/api/game/target", json={"target": target}).json()


def test_a_drawn_sloppy_plays_as_random_while_the_human_plays_automatically(dev_client):
    seed = sloppy_seed(dev_client)
    drawn = VERSUS_AI | {"seed": seed, "first_player": 0}

    automatic = ai_rolls(dev_client, drawn | {"play_mode": "automatic"})

    assert automatic == ai_rolls(dev_client, drawn | {"strategy": "random"})
    assert automatic != ai_rolls(dev_client, drawn | {"strategy": "sloppy"})


@pytest.mark.parametrize("mode", ["without_hints", "with_hints"])
def test_a_drawn_sloppy_plays_by_hand_in_both_manual_modes(dev_client, mode):
    seed = sloppy_seed(dev_client)
    drawn = VERSUS_AI | {"seed": seed, "first_player": 0}

    manual = ai_rolls(dev_client, drawn | {"play_mode": mode})

    assert manual == ai_rolls(dev_client, drawn | {"strategy": "sloppy"})


def test_a_mode_set_after_creation_decides_the_ai_too(dev_client):
    seed = sloppy_seed(dev_client)
    drawn = VERSUS_AI | {"seed": seed, "first_player": 0}

    switched = ai_rolls(dev_client, drawn | {"play_mode": "automatic"}, "with_hints")

    assert switched == ai_rolls(dev_client, drawn | {"play_mode": "with_hints"})


@pytest.mark.parametrize("mode", MODES)
def test_a_picked_sloppy_always_plays_as_itself(dev_client, mode):
    seed = sloppy_seed(dev_client)
    picked = VERSUS_AI | {"seed": seed, "first_player": 0, "strategy": "sloppy"}

    assert ai_rolls(dev_client, picked | {"play_mode": mode}) == ai_rolls(dev_client, picked)


def test_the_dev_state_still_names_the_drawn_strategy_in_automatic_mode(dev_client):
    seed = sloppy_seed(dev_client)

    game = dev_client.post(
        "/api/game", json=VERSUS_AI | {"seed": seed, "play_mode": "automatic"}
    ).json()["game"]

    assert game["strategy"] == "sloppy"
