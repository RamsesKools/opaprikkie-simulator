# Opa Prikkie backend

Sample game API for the [frontend comparison (#6)](https://github.com/RamsesKools/opaprikkie-simulator/issues/6).
It wraps the existing `opaprikkie_sim` engine unchanged in an in-memory game session.
The real package boundary is still open in [#8](https://github.com/RamsesKools/opaprikkie-simulator/issues/8).

## Run

Needs [uv](https://docs.astral.sh/uv/).

```sh
cd apps/backend
uv run opaprikkie-backend
```

API docs: http://127.0.0.1:8000/docs (set `BACKEND_PORT` to move it).

## Contract

```text
POST /games                  {opponent, seed?}  -> {game_id, state}
GET  /games/{game_id}                           -> {game_id, state}
POST /games/{game_id}/moves  {target}           -> {game_id, state}
```

`state` holds the turn, status, current player, winner, initial roll, legal targets with counts, both boards, and turn history.
The backend rolls, auto-plays AI turns, and auto-skips turns without a movable target until a human must choose.
Illegal targets return 422, moves on a finished game return 409.
