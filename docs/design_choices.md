# Design choices

Every frontend design choice: screens, flows, colours, animations, timings, and copy.
When this grows too large, split it, for example into `docs/design/ux_choices.md` and `docs/design/theme.md`.

## Flow

1. Menu: pick hot-seat or versus AI, and enter names.
   - Names are trimmed, 1 to 20 characters, and stored in the session so they're prefilled next time.
   - Defaults: "Player 1", "Player 2", and "Opa" for the AI; all editable.
   - Duplicate names are fine; seat colours tell players apart.
2. Dice-off, animated and explained on screen.
   - Each player throws two dice in their colour onto the board; the winner is shown once all dice have landed.
   - Each player has a "Throw" button that auto-presses after 3 to 5 seconds; the AI throws by itself.
   - The winner chooses who starts.
3. Game: boards, the current player, the opening roll, and only legal targets to choose from.
   - Dice show in the current player's colour.
   - No legal target: an animated "Oh no, you didn't roll any legal targets", then the turn passes.
   - Continuation: a cue like "Peg 7 is at the top, roll again".
   - AI turns animate from the returned logs.
4. Victory screen when the last peg is topped.

## Board

- 12 columns, targets 1 to 12, each with rows 0 to 5.
- Row 0 is the bottom row, where every peg starts, and row 5 is the top.

## Colours

- Seat 1 is red, seat 2 is blue.
- Colours come from one palette in the frontend; the engine doesn't know about them.

## Rules booklet

- A "Rules" button opens a small booklet in the centre of the screen.
- Short, player-facing text in `frontend/`, written separately from the engine-facing [game rules](game_rules.md).

## Animations

- Use whatever works best per feature: CSS, or a library when it gives a clearly better result.

## Language

- English only for the MVP.
- Keep UI strings in one module, so adding a language is easy.

## Dev mode

When `GET /api/health` reports `dev_mode`:

- the menu shows a seed field and an AI strategy dropdown
- the game shows the seed and the AI's strategy

The AI strategy is never shown otherwise.

## Later

- A language selector, starting with Dutch.
- More player colours.
