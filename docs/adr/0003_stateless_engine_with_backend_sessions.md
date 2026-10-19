---
status: accepted
---

# Stateless engine, sessions in the backend

The engine is a library of pure functions over immutable state, for example `new_game(settings, seed) -> GameState` and `choose(state, target) -> (GameState, TurnLog)`.
The backend keeps sessions in memory behind a cookie, and the simulator calls the engine functions directly.
We chose it in [#8](https://github.com/RamsesKools/opaprikkie-simulator/issues/8).

## Considered options

- **Pure functions, caller holds state** (chosen): the seed lives in `GameState`, so the same seed and choices replay identically over HTTP and in-process, and the backend's store is just sessions holding states.
- **Mutable `Game` object owning its RNG**, as the current code does: familiar, but parity between the HTTP and in-process paths depends on both driving the object the same way, and storing or replaying a game means serializing hidden RNG state.

## Session model

- The cookie holds only an opaque session id (HttpOnly, SameSite=Lax, persistent `Max-Age`, `Secure` configurable for HTTPS).
- A session holds the player's settings and one active game.
- Sessions live in memory in a single uvicorn worker, capped at 50 with LRU eviction and a 7-day idle TTL.
- Non-browser callers create a session through the API and send its id as the cookie, so there is one access path and no dev backdoor.

## Consequences

- A backend restart loses all sessions, which is acceptable while MVP games are ephemeral; persisting sessions can come later.
- Multiple users or public hosting will need authentication on top of the session id.
- `/docs` and `/openapi.json` are served only in dev mode, since end users have no reason to call the API directly.
