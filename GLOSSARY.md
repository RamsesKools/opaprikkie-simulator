# Opa Prikkie

Terms for the game and the systems that support playing and simulating it.

## Game

**Turn**:
A player's complete play from the initial dice roll through one target choice and the backend's resolution of the remaining rolls.

**Target choice**:
The selection of one legal peg number based on the dice observation for the current turn.
_Avoid_: Move, when referring only to the player's choice.

**Strategy**:
A decision-maker that selects one legal target from a game observation.

**Hot-seat game**:
A game where two human players take turns using the same browser.

## Systems

**Game engine**:
The authoritative model of Opa Prikkie rules, random rolls, game state, and state transitions.

**Simulator**:
A separate program that runs games and evaluates strategies by driving the game engine through HTTP or its in-process Python interface.
