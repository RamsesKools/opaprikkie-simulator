---
status: accepted
---

# Strategies that play by hand

A strategy may opt in to choosing its takes, driving the same `take` action as a human player, so it can play imperfectly.
The first one is `sloppy`, which takes uniformly among the valid takes on every roll and never stops early.
It still can't pass or stop, as in [ADR 0006](0006_imperfect_play_without_passing.md), which this updates: strategies no longer only choose targets.

## Considered options

- **An opt-in `choose_take` next to `choose_target`** (chosen): every other strategy keeps the automatic path with unchanged results, and a hand strategy uses the engine's own `take` and its validation.
- **Every strategy picks takes**: forces perfect play to be spelled out as a take for each roll, and risks changing seeded results.
- **A strategy-side flag for the sequence**: the engine would need a second way to play a sequence, next to `take`.

## Consequences

- The strategy contract gets a `HandStrategy` protocol: a `Strategy` that also has `choose_take(observation, rng)`, returning one of the observation's `takes`.
- Callers (the backend's AI seats and the simulator drivers) check for it: a hand strategy is asked for a take at every choice point, including `choosing_dice`, and is never asked for a target.
- A regular game draws the AI from every built-in, so a player who plays automatically could meet an opponent that plays by hand.
  The backend learns the human's play mode ([HTTP API](../architecture/http_api.md#play-mode)): while it is `automatic`, a drawn hand strategy plays as `random`, and in both manual modes it plays by hand.
  A strategy picked in dev mode, and the simulator's, always play as themselves.
- A hand sequence logs one `roll_sequence` as before, so logs and statistics keep their shape.
- A simulation can now test whether imperfect play ever pays, which ADR 0006 left open.
