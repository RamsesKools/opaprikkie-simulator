# Strategy contract

How built-in and external strategies make choices, in-process and over HTTP ([#10](https://github.com/RamsesKools/opaprikkie-simulator/issues/10), [#11](https://github.com/RamsesKools/opaprikkie-simulator/issues/11)).
The rules behind each choice are in [game rules](../game_rules.md).

## Observation

`observe(state)` returns a frozen dataclass in the engine, mirrored as a Pydantic model in the HTTP state:

- the ruleset (its name over HTTP) and the observing seat
- every player's peg positions
- the opening roll
- legal targets, each with `matches` (raw count in the opening roll) and `guaranteed_moves` (clamped to the remaining distance)
- turn number and continuation index

The observing seat is the player choosing next: the dice-off winner, then the player on turn.
Outside those choice points `observe` raises `wrong_phase`.

## Strategy protocol

```python
class Strategy(Protocol):
    name: str

    def choose_first_player(self, observation: Observation) -> int: ...
    def choose_target(self, observation: Observation, rng: Random) -> int: ...
```

- Strategies are pure: they never touch the state or roll dice for the game.
- The caller supplies `rng`; the backend derives it from the game seed, so AI games replay from the seed alone.
- Built-in strategies live in the engine; external ones live in the simulator or anywhere else and use the same calls.

## Built-in strategies

| Name | Picks |
| -- | -- |
| `random` | uniformly among legal targets |
| `greedy` | most `guaranteed_moves`; ties go to the peg closest to the top, then the lower number |
| `smart` | highest expected movement over the whole roll sequence, computed exactly from the remaining dice and clamped, plus a bonus for topping out (it earns a continuation), 1 row by default; ties go to the lower number |

- All three choose themselves as first player.
- `smart` is a first version and may change, its bonus included.
- `SmartStrategy(topping_bonus=...)` sets the bonus, and `expected_value(observation, target)` returns a target's exact value as a `Fraction`.
- Results from the old engine aren't comparable: the rules changed.

## Seat controllers

- Session settings give each seat a `controller`: `human` (the caller decides) or a built-in strategy.
  A simulator over HTTP plays its seats as `human`.
- The engine knows nothing about controllers.
- After any caller action, the backend plays every following built-in seat within the same request (first-player pick, targets, continuations) until the next human choice point or the game end, and returns all logs.
- Outside dev mode the backend picks the AI's strategy uniformly among the built-ins using the game seed, and never reveals it.
  In dev mode the caller may pick it, and the state shows it.

## Rejections

- The engine is the only validation point: `IllegalAction` carries a `code`, a `message`, and `hints`, with the state unchanged and no turn used.
- HTTP returns 422 with `{code, message, ...hints}`:
  - `wrong_phase` with the current `phase`
  - `illegal_target` with `legal_targets` and a reason: `topped`, `no_match`, or `not_a_target` (which includes anything that isn't an int)
  - `invalid_names` with the failing `rule`: `type`, `count`, `blank`, or `duplicate` (names are compared stripped and case-insensitively)
  - `invalid_player` for a first player that isn't an int in the game, with the number of `players`
- The UI only offers legal choices, so it never sees these.
- The simulator treats a rejection as a strategy bug and fails fast: no retry, no fallback.

## Seeds

- The backend generates every seed and keeps it out of responses.
- With `OPAPRIKKIE_DEV_MODE` on, game creation accepts `seed`, `first_player`, and AI strategy, and the state includes the seed; otherwise those fields get a 403.
- In-process callers always pass their own seed.
- Once games are stored, the seed may move out of the engine state.
