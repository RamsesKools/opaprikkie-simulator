# HTTP API

The backend's routes, sessions, and errors, all under an unversioned `/api` ([ADR 0004](../adr/0004_unversioned_api_with_version_handshake.md)).
Choices, observations, and rejections follow the [strategy contract](strategy_contract.md); the Pydantic models in `opaprikkie.backend.models` are the exact shapes.

## Routes

| Route | Does | Returns |
| -- | -- | -- |
| `GET /api/health` | the version handshake | `{version, dev_mode, strategies}` |
| `POST /api/sessions` | starts a session and sets its cookie | 201, `Session` |
| `GET /api/session` | resumes from the cookie | `Session`: the last `names` and the `game`, either may be `null` |
| `POST /api/game` | starts a new game, replacing the session's game | 201, `GameUpdate` in phase `naming` |
| `POST /api/game/names` | `{names}`: names the players and runs the dice-off | `GameUpdate` |
| `POST /api/game/first_player` | `{player}`: the dice-off winner picks who starts | `GameUpdate` |
| `POST /api/game/target` | `{target}`: resolves the roll sequence automatically | `GameUpdate` |
| `POST /api/game/take` | `{target, dice}`: sets aside the dice at those places in the roll on the table, then rolls the rest | `GameUpdate` |
| `POST /api/game/stop` | ends a sequence played by hand | `GameUpdate` |
| `GET /api/game` | reads the state | `Game` |

- Each game route is one engine action: `new_game`, `name_players`, `choose_first_player`, `choose_target`, `take`, `stop`.
- A take that leaves the sequence going returns phase `choosing_dice` and no logs; the sequence's `roll_sequence` log comes with the take or stop that ends it.
- Each `observation` lists the valid `takes` for the roll on the table, each with its `outcome` and `next_dice` ([strategy contract](strategy_contract.md#observation)), so a client offers takes and says what each leads to by looking up the selected dice, with no extra call.
- `POST /api/game` takes one `controller` per seat: `["human", "human"]` is hot-seat, `["human", "ai"]` is versus AI.
- `GameUpdate` is `{game, logs}`: the state after the action and every log entry it produced, including the AI's.
- `Game` holds the phase, names, controllers, pegs, winner, the game stats, and an `observation` at choice points (`null` while naming or finished).
- The game stats are `turns`, the number of turns so far (dead ones included), and `dice_counts`, one list per seat with how often each face 1 to 6 was thrown (index 0 is face 1), the dice-off left out ([strategy contract](strategy_contract.md#game-stats)).
- Successful naming stores the names in the session, so the menu can prefill them.

## Sessions

- The cookie `opaprikkie_session` holds only an opaque id: HttpOnly, SameSite=Lax, `Secure` with `OPAPRIKKIE_COOKIE_SECURE`, and a `Max-Age` of `SESSION_TTL_DAYS`, refreshed on every use.
- Sessions live in memory, one game each, at most `MAX_SESSIONS`: creating one past the cap evicts the least recently used.
- The store lives in one process, so the backend must run as a single uvicorn worker.
- A session unused for `SESSION_TTL_DAYS` expires.
- Non-browser callers use the same path: `POST /api/sessions`, then send the cookie back.
- The simulator plays a whole batch in one session, starting each game with `POST /api/game`, so a batch takes one slot and evicts no other session.

## AI seats

- After every caller action, the backend plays the `ai` seats until the next `human` choice or the game end.
- The AI's strategy is drawn uniformly from the built-ins with `Random(f"{seed}:strategy")`.
- Each AI target choice gets `Random(f"{seed}:strategy:{roll_index}")`, so a seed and the human choices replay a game exactly.

## Dev mode

- With `OPAPRIKKIE_DEV_MODE` off, `seed`, `first_player`, or `strategy` on `POST /api/game` gets a 403 `dev_mode_only` listing the `fields`, and `Game` shows neither `seed` nor `strategy`.
- With it on, those fields are accepted, `Game` shows both, `/api/health` lists the built-in `strategies` (`null` otherwise), and `/docs` and `/openapi.json` are served.
- A dev `first_player` must be a seat number, checked on creation, and skips the dice-off when the players are named.

## Errors

Every error body is `{code, message, ...hints}`:

| Status | Code | Hints |
| -- | -- | -- |
| 401 | `no_session` |  |
| 403 | `dev_mode_only` | `fields` |
| 404 | `no_game` |  |
| 404 | `not_found` |  |
| 405 | `method_not_allowed` |  |
| 422 | `wrong_phase`, `illegal_target`, `illegal_dice`, `invalid_names`, `invalid_player` | as in the [strategy contract](strategy_contract.md#rejections) |
| 422 | `unknown_strategy` | `strategies` |
| 422 | `invalid_request` | `errors`, each a Pydantic `{loc, msg}`, for a malformed body |
| 500 | `internal_error` |  |

Choice fields (`names`, `player`, `target`, `dice`) are typed in the schema but passed to the engine as sent, so a wrong type is an engine rejection, not `invalid_request`.

## Schema

`uv run task gen_api` writes the OpenAPI schema to `frontend/openapi.json` and its TypeScript types to `frontend/src/lib/api.d.ts`, without a server.
