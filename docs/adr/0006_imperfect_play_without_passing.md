---
status: accepted
---

# Imperfect play, but no passing

Human players in a manual play mode ("Play without hints" or "Play with hints") play their own roll sequences: they pick the dice to set aside, may take fewer matches than they rolled, and may stop a sequence early.
What they can't do is pass: when the opening roll has a legal target, they must take at least one match.
The user decided this on 2026-10-20 in [#52](https://github.com/RamsesKools/opaprikkie-simulator/issues/52).

## Considered options

- **Imperfect play without passing** (chosen): it feels like a real table, where nobody checks that you took every match, while a pass is never the better choice, since moving never hurts.
- **Only perfect play**, the engine setting aside every match as it does for strategies: simpler, but the player only ever picks a target, so a manual turn adds nothing but clicks.
- **Imperfect play with passing**: one more choice, but one that never helps, so it mostly adds a way to misclick a turn away.

## Consequences

- The engine gets per-roll actions, `take` and `stop`, and a `choosing_dice` phase, next to `choose_target`, which stays the automatic path for strategies, the AI, and the simulator, with unchanged results.
- A manual sequence still logs one `roll_sequence` when it ends, so logs keep their shape; a stop shows as a last roll with nothing set aside.
- Strategies only ever choose targets, so they can't play imperfectly; a simulation may test later whether passing or stopping early ever pays, and revisit this.
  [ADR 0007](0007_strategies_that_play_by_hand.md) lets a strategy opt in to choosing its takes.
