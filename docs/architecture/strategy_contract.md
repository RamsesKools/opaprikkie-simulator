# Strategy contract

How built-in and external strategies make choices, in-process and over HTTP ([#10](https://github.com/RamsesKools/opaprikkie-simulator/issues/10), [#11](https://github.com/RamsesKools/opaprikkie-simulator/issues/11)).
The rules behind each choice are in [game rules](../game_rules.md).

## Observation

`observe(state)` returns a frozen dataclass in the engine, mirrored as a Pydantic model in the HTTP state:

- the ruleset (its name over HTTP) and the observing seat
- every player's peg positions
- the opening roll
- legal targets for the roll on the table, each with `matches` (every match it holds), `guaranteed_moves` (those matches clamped to the remaining distance), and `set_aside` (the indices of the dice the automatic path keeps)
- turn number and continuation index
- `sequence`: during a sequence played by hand, its target, the rolls taken so far, their `matches`, the `dice` on the table, and whether they're a six-dice `reset`; otherwise `None`
- `takes`: every valid take for the roll on the table, each with its `target`, its `dice` (sorted indices, every one part of a match), its `matches`, the `row` the peg would reach (clamped to the top), its `outcome`, and `next_dice`, the number of dice thrown next:
  - `throw`: the rest of the dice are thrown
  - `reset`: every die is used, so all are thrown again
  - `topped`: the peg reaches the top, and a continuation throws all dice
  - `ends`: too few dice are left for a match, so the sequence ends and the turn passes (0 dice)
  - `wins`: the last peg reaches the top (0 dice)

The roll on the table is the opening roll, or during a sequence played by hand its latest roll; then the legal targets and takes hold only the sequence's target, counted from the matches taken so far.
`takes` is how a UI offers takes without rules of its own: it looks the selected dice up, and every entry with exactly those dice is one option, with its outcome to say what happens next.
The engine computes it on first use, so strategies, which never read it, don't pay for it.
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
- They only choose targets, so their sequences always run automatically; `take` and `stop` are for human players ([ADR 0006](../adr/0006_imperfect_play_without_passing.md)).
- The caller supplies `rng`; the backend derives it from the game seed, so AI games replay from the seed alone.
- Built-in strategies live in the engine; external ones live in the simulator or anywhere else and use the same calls.

## Built-in strategies

| Name | Picks |
| -- | -- |
| `random` | uniformly among legal targets |
| `greedy` | most `guaranteed_moves`; ties go to the peg closest to the top, then the lower number |
| `smart` | highest expected movement over the whole roll sequence, computed exactly from the remaining dice and clamped, plus a bonus for topping out (it earns a continuation), 0 rows by default; ties go to the lower number |

- All three choose themselves as first player.
- `smart` is a first version and may change, its bonus included.
  A flat bonus measured worse: against greedy over 1000 `CLASSIC` games, smart won 631 with no bonus and 464 with 1 row.
- `SmartStrategy(topping_bonus=...)` sets the bonus, and `expected_value(observation, target)` returns a target's exact value as a `Fraction`.

## Seat controllers

- Each game gives each seat a `controller`: `human` (the caller decides) or `ai` (a built-in strategy).
  A simulator over HTTP plays its seats as `human`.
- The engine knows nothing about controllers.
- After any caller action, the backend plays every following `ai` seat within the same request (first-player pick, targets, continuations) until the next human choice point or the game end, and returns all logs ([HTTP API](http_api.md#ai-seats)).
- Outside dev mode the backend picks the AI's strategy uniformly among the built-ins using the game seed, and never reveals it.
  In dev mode the caller may pick it, and the state shows it.

## Rejections

- The engine is the only validation point: `IllegalAction` carries a `code`, a `message`, and `hints`, with the state unchanged and no turn used.
- HTTP returns 422 with `{code, message, ...hints}`:
  - `wrong_phase` with the current `phase`, including a stop before the first take
  - `illegal_target` with `legal_targets` and a reason: `topped`, `no_match`, `not_a_target` (which includes anything that isn't an int), or `locked` (a take for another target than the sequence's)
  - `illegal_dice` for a take, with a reason: `not_dice` (not a list of distinct places in the roll on the table), `empty`, or `no_match` (a die that isn't part of a match for the target); the target is checked first
  - `invalid_names` with the failing `rule`: `type`, `count`, or `blank` (names are stripped, and duplicates are fine)
  - `invalid_player` for a first player that isn't an int in the game, with the number of `players`
- With hints on, the UI only offers legal choices; with hints off, it shows the rejection's message.
- The simulator treats a rejection as a strategy bug and fails fast: no retry, no fallback.

## Seeds

- The backend generates every seed and keeps it out of responses.
- With `OPAPRIKKIE_DEV_MODE` on, game creation accepts `seed`, `first_player`, and AI strategy, and the state includes the seed; otherwise those fields get a 403.
- In-process callers always pass their own seed.
- The simulator over HTTP passes them too, so it needs a dev-mode backend.
- The simulator seeds each seat's strategy `rng` with `<game seed>:strategy:<seat>`.
- Once games are stored, the seed may move out of the engine state.
