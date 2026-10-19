# Game rules

The rules the engine implements, and how it handles each one.
Based on the [official rules](https://opaprikkie.nl/spelregels/), with the gaps they leave filled in by decisions [#15](https://github.com/RamsesKools/opaprikkie-simulator/issues/15) to [#18](https://github.com/RamsesKools/opaprikkie-simulator/issues/18) and [#25](https://github.com/RamsesKools/opaprikkie-simulator/issues/25).
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
3. The roll sequence for that target runs automatically:
   1. Every match in the roll is set aside, including the opening roll.
   2. The remaining dice are rerolled.
   3. When every die is set aside, all six are rolled again and the count carries on.
   4. The sequence ends when a roll has no match, when fewer dice remain than one match needs, or as soon as the peg is topped.
4. The peg moves up by the number of matches, clamped to its remaining distance; extra matches are lost.
5. Continuation: if the peg was topped and the game isn't over, the same player makes a fresh opening roll and chooses a new target.
   This repeats for every peg topped in the turn.
6. Otherwise the turn passes to the next player.

The target can't change during a roll sequence.

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

The state's `phase` moves `naming`, `choosing_first_player`, `choosing_target`, `finished`.
Every action checks the phase and returns `(state, log)`:

- `new_game(ruleset, seed)`
- `name_players(state, names, first_player=None)`: runs the dice-off; an explicit `first_player` skips it and makes the first opening roll.
- `choose_first_player(state, player)`: makes the first opening roll.
- `choose_target(state, target)`: resolves one roll sequence, then a continuation, the next turn, or the game end.

After every action the state rests at a real choice point or at `finished`.
Dead turns in between are resolved automatically and logged with outcome `no_move`, as are continuation opening rolls without a legal target.
Any invalid action raises `IllegalAction` and leaves the state unchanged.

### Logs

- Dice-off: each player's two dice per round.
- Roll sequence: the target, then each roll in order (opening roll first) with dice values, set-aside indices, and whether it was a six-dice reset, plus total matches and applied movement.
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
