from itertools import count

from opaprikkie import engine

VERSUS_AI = {"controllers": ["human", "ai"]}
NAMES = {"names": ["Ada", "Opa"]}


def play_human_turns(client, update: dict) -> list[dict]:
    """Plays seat 0's first legal target until the end; returns every update."""
    updates = [update]
    while update["game"]["phase"] != "finished":
        observation = update["game"]["observation"]
        assert observation["seat"] == 0
        target = observation["legal_targets"][0]["target"]
        update = client.post("/api/game/target", json={"target": target}).json()
        updates.append(update)
    return updates


def ai_sequences(updates: list[dict]) -> list[dict]:
    return [
        entry
        for update in updates
        for entry in update["logs"]
        if entry["kind"] == "roll_sequence" and entry["player"] == 1
    ]


def test_a_game_versus_ai_rests_only_at_human_choices(client):
    client.post("/api/game", json=VERSUS_AI)
    update = client.post("/api/game/names", json=NAMES).json()
    if update["game"]["phase"] == "choosing_first_player":
        update = client.post("/api/game/first_player", json={"player": 0}).json()

    updates = play_human_turns(client, update)

    assert updates[-1]["game"]["winner"] in (0, 1)
    assert ai_sequences(updates)
    assert updates[-1]["game"]["strategy"] is None


def dice_off_winner(seed: str) -> int:
    state, _ = engine.new_game(engine.CLASSIC, seed)
    state, _ = engine.name_players(state, ["Ada", "Opa"])
    assert state.current_player is not None
    return state.current_player


def test_the_ai_picks_the_first_player_after_winning_the_dice_off(dev_client):
    seed = next(s for s in map(str, count()) if dice_off_winner(s) == 1)
    dev_client.post("/api/game", json=VERSUS_AI | {"seed": seed})

    update = dev_client.post("/api/game/names", json=NAMES).json()

    kinds = [entry["kind"] for entry in update["logs"]]
    assert kinds[0] == "dice_off"
    assert "roll_sequence" in kinds
    assert update["logs"][-1]["player"] == 1
    assert update["game"]["observation"]["seat"] == 0


def test_outside_dev_mode_nothing_reveals_the_seed_or_strategy(client):
    responses = [client.post("/api/game", json=VERSUS_AI)]
    responses.append(client.post("/api/game/names", json=NAMES))
    responses += [client.get("/api/game"), client.get("/api/session")]

    games = [r.json().get("game", r.json()) for r in responses]
    assert all(game["seed"] is None and game["strategy"] is None for game in games)
    for name in engine.BUILTIN_STRATEGIES:
        assert all(name not in r.text for r in responses)


def test_a_sloppy_ai_plays_its_sequences_by_hand_and_never_stops(dev_client):
    dev_client.post("/api/game", json=VERSUS_AI | {"strategy": "sloppy", "first_player": 0})
    update = dev_client.post("/api/game/names", json=NAMES).json()

    rolls = [
        (entry["target"], roll)
        for entry in ai_sequences(play_human_turns(dev_client, update))
        for roll in entry["rolls"]
    ]

    def matching(target: int, roll: dict) -> int:
        return len(engine.set_aside(engine.CLASSIC, target, roll["dice"]))

    assert any(len(roll["set_aside"]) < matching(target, roll) for target, roll in rolls)
    assert all(roll["set_aside"] or not matching(target, roll) for target, roll in rolls)
