# Opa Prikkie

Terms for the game and the systems that support playing and simulating it.
The rules themselves live in [game rules](docs/game_rules.md).

## Game

**Turn**:
A player's play from the opening roll until the turn passes: one or more roll sequences, one per target choice.

**Dice-off**:
The start of a game: each player rolls two dice, and the highest sum chooses who starts.

**Ruleset**:
A named set of game dimensions and rules the engine plays by; `CLASSIC` is the only one.

**Opening roll**:
The roll of all six dice that the target choice is based on; it is also the first roll of that target's roll sequence, so its matching dice count toward movement.

**Set-aside dice**:
The dice or disjoint pairs matching the chosen target, removed automatically after each roll; only the remaining dice are rerolled, and all six are rolled again once every die is set aside.

**Roll sequence**:
The automatic rolls for one chosen target, from the opening roll until no match, too few dice, or the peg is topped.

**Continuation**:
A fresh opening roll and target choice in the same turn, after the player topped a peg.

**Legal target**:
An untopped peg with at least one match in the opening roll.

**Dead turn**:
A turn whose opening roll has no legal target; it passes without movement.

**Roll log**:
The ordered list of rolls in a resolved roll sequence, opening roll first, each with its dice values and the dice set aside.

**Target choice**:
The selection of one legal peg number based on the dice observation for the current turn.
_Avoid_: Move, when referring only to the player's choice.

**Observation**:
What a player or strategy sees at a choice point: boards, the opening roll, and the legal targets.

**Strategy**:
A decision-maker that selects one legal target from a game observation.

**Controller**:
Who decides for a seat: `human` (the caller) or a built-in strategy played by the backend.

**Hot-seat game**:
A game where two human players take turns using the same browser.

## Systems

**Game engine**:
The authoritative model of Opa Prikkie rules, random rolls, game state, and state transitions.

**Session**:
A backend record, identified by a browser cookie, holding one player's settings and their active game.
_Avoid_: Game, when referring to the stored record.

**Simulator**:
A separate program that runs games and evaluates strategies by driving the game engine through HTTP or its in-process Python interface.
