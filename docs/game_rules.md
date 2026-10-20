# Game rules

The rules the engine implements, and how it handles each one.
Based on the [official rules](https://opaprikkie.nl/spelregels/), with the gaps they leave filled in by decisions [#15](https://github.com/RamsesKools/opaprikkie-simulator/issues/15) to [#18](https://github.com/RamsesKools/opaprikkie-simulator/issues/18), [#25](https://github.com/RamsesKools/opaprikkie-simulator/issues/25), and [#52](https://github.com/RamsesKools/opaprikkie-simulator/issues/52).
Vocabulary lives in the [glossary](../GLOSSARY.md); this document is the single source for rules.

## Setup

- Two players, each with a board of 12 columns, one per target 1 to 12.
- Each column has rows 0 to 5: every peg starts on row 0 and is topped on row 5, so each target needs 5 matches.
- Six dice with faces 1 to 6.

## Starting player

1. Every player enters a name; names may repeat, since seats tell players apart.
2. Dice-off: each player rolls two dice; the highest sum wins.
   On a tie for highest, only the tied players roll again.
3. The dice-off winner chooses who starts.

## Turn

1. Opening roll: the player rolls all six dice.
2. The player chooses one legal target: an untopped peg with at least one match in the opening roll.
   If there is none, the turn ends; on the turn's first opening roll that's a dead turn, without any movement.
3. The roll sequence for that target runs, automatically or by hand (see [Roll sequence](#roll-sequence)):
   1. Matches in the roll are set aside, including the opening roll.
   2. The remaining dice are rerolled.
   3. When every die is set aside, all six are rolled again and the count carries on.
   4. The sequence ends when a roll has no match, when fewer dice remain than one match needs, or as soon as the peg is topped.
4. The peg moves up by the number of matches set aside, clamped to its remaining distance; extra matches are lost.
5. Continuation: if the peg was topped and the game isn't over, the same player makes a fresh opening roll and chooses a new target.
   This repeats for every peg topped in the turn.
6. Otherwise the turn passes to the next player.

The target can't change during a roll sequence.

## Roll sequence

- Automatic: every match of every roll is set aside.
  Strategies, the AI, and human players with automatic turns play this way.
- By hand: the player picks the dice to set aside, every one of them part of a match for the target.
  - The first pick, from the opening roll, chooses the target.
  - They may take fewer matches than rolled; the dice they leave are rerolled with the rest.
  - After a later roll they take more or stop, and the peg moves by the matches taken so far.
- No passing: with a legal target in the opening roll, at least one match must be taken ([ADR 0006](adr/0006_imperfect_play_without_passing.md)).

## Matching

- Targets 1 to 6 match single dice showing that value.
- Targets 7 to 12 match disjoint pairs that sum to the target; two dice adding up to 1 to 6 don't count.
- The pair count is the maximum number of disjoint pairs: for each value `v` below `t / 2`, `min(count(v), count(t - v))`, plus `count(t / 2) // 2` for even `t`.
- Set-aside dice are taken from the lowest indices, so roll logs are deterministic.

## Game end

- The game ends the moment a player's last peg is topped, even mid-turn.
- That player wins; draws are impossible.

## Engine handling

### Ruleset

- Dimensions live in a named, frozen `Ruleset`: player count, dice count and faces, row height, the target table (target to combo size), the start rule, and the end rule.
- The engine reads only the ruleset, never module constants.
- `CLASSIC` is the only ruleset: the rules above.
- Validation rejects values the engine can't play yet, such as combo size 3.
- The API and UI always use `CLASSIC`; in-process callers may pass any valid ruleset.

### Phases and actions

The state's `phase` moves `naming`, `choosing_first_player`, `choosing_target`, then `choosing_dice` while a sequence is played by hand, and `finished`.
Every action checks the phase and returns `(state, log)`:

- `new_game(ruleset, seed)`
- `name_players(state, names, first_player=None)`: runs the dice-off; an explicit `first_player` skips it and makes the first opening roll.
- `choose_first_player(state, player)`: makes the first opening roll.
- `choose_target(state, target)`: resolves one roll sequence automatically, then a continuation, the next turn, or the game end.
- `take(state, target, dice)`: sets aside the dice at those places in the roll on the table for `target`, then rolls the rest.
  The first take, from the opening roll, locks in the target; until the sequence ends, the state's `sequence` holds the rolls taken so far and the roll on the table, in phase `choosing_dice`.
  A roll without a match, too few dice, or a topped peg ends the sequence as `choose_target`'s would.
- `stop(state)`: ends a sequence in `choosing_dice`; there's no stop before the first take.

After every action the state rests at a real choice point or at `finished`.
Dead turns in between are resolved automatically and logged with outcome `no_move`, as are continuation opening rolls without a legal target.
Any invalid action raises `IllegalAction` and leaves the state unchanged.

### Logs

- Dice-off: each player's two dice per round.
- Roll sequence: the target, then each roll in order (opening roll first) with dice values, set-aside indices, its matches, and whether it was a six-dice reset, plus total matches and applied movement.
  A sequence played by hand is logged the same way once it ends; a stop shows as a last roll with nothing set aside.
- Dead turn: the opening roll and `no_move`, with the turn and continuation index.
- Roll sequences and `no_move` entries also carry the player, turn, and continuation index.
- HTTP and in-process callers get the same shape.

### Randomness

- `GameState` holds the `seed` and a `roll_index`; each roll uses `random.Random(f"{seed}:{roll_index}")` and draws one `randint(1, faces)` per die.
  String seeds are stable across runs and Python versions, so a seed and the choices replay a game exactly.
- The dice-off uses the same stream.
- The backend generates the seed and never exposes it outside dev mode; see the [strategy contract](architecture/strategy_contract.md#seeds).

## Later

Not built, but the ruleset leaves room for:

- An equal-turns end rule: the second player gets a last turn when the first player tops out.
- More dice, taller boards, and 3-dice targets.
