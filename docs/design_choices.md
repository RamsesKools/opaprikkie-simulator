# Design choices

Every frontend design choice: screens, flows, colours, animations, timings, and copy.
When this grows too large, split it, for example into `docs/design/ux_choices.md` and `docs/design/theme.md`.

## Flow

1. Menu: pick hot-seat or versus AI, and enter names.
   - Names are trimmed, 1 to 20 characters, and stored in the session so they're prefilled next time.
   - Defaults: "Player 1", "Player 2", and "Opa" for the AI; all editable.
   - Duplicate names are fine; seat colours tell players apart.
   - Start stays disabled while a name is out of range or the game is being created.
   - Versus AI, the human is seat 1 and the AI seat 2.
2. Dice-off, animated and explained on screen.
   - Each player throws two dice in their colour onto the board; the winner is shown once all dice have landed.
   - Each player has a "Throw" button that auto-presses after 3 to 5 seconds, with a fill showing the countdown; the AI throws by itself after about a second.
   - On a tie, a message names the tied players, and only they throw again.
   - A human winner chooses who starts with one button per player.
   - An AI winner starts by itself, and the game screen follows after a short pause.
3. Game: boards, the current player, the opening roll, and only legal targets to choose from.
   - A pill above the dice shows the turn number and the player in their colour; their board gets a border in that colour.
   - Dice show in the current player's colour.
   - Dice are thrown into a throw area: green velvet inside a wooden frame.
   - The player picks a target by clicking its column on their own board; only legal columns are clickable and glow.
   - Hovering or focusing a legal column raises the dice that form its matches, and shows a ghost peg on the row it's guaranteed to reach from the opening roll alone.
     When that row is the top, the ghost gets a gold halo.
   - Each roll of the sequence shows in turn, with set-aside dice raised and outlined, then the peg slides up.
   - Set-aside dice move to a saved bowl next to the throw area, with the number of matches so far underneath, like "3 matches for 7".
     The bowl stays filled until the turn passes or the peg reaches the top; a six-dice reset empties it back onto the table, but the count carries on.
   - A six-dice reset gets its own message.
   - No legal target: an animated "Oh no, you didn't roll any legal targets", then the turn passes.
   - Continuation: a cue like "Peg 7 is at the top, roll again".
   - AI turns animate from the returned logs, each starting with "Opa is thinking..." over its opening roll, dead turns included.
   - Topped pegs get a gold ring.
4. Victory screen when the last peg is topped: the winner's name in their colour, both final boards, and "Play again".
   - "Play again" returns to the menu with the last mode and names kept.

## Board

- 12 columns, targets 1 to 12, each with rows 0 to 5.
- Row 0 is the bottom row, where every peg starts, and row 5 is the top.

## Colours

- Seat 1 is red, seat 2 is blue.
- Colours come from one palette in the frontend (`frontend/src/lib/palette.ts`); the engine doesn't know about them.
- The boards are wood-coloured with dark holes.
- The page is a green pixel velvet (`frontend/src/assets/felt.svg`), dimmed to 40% over the off-white paper colour so it stays calm; the throw area and the bowl use the same velvet at full strength.

## Rules booklet

- A "Rules" button in the header opens a small booklet in the centre of the screen, on every screen.
- It closes with its "Close" button, Escape, or a click outside it.
- Focus moves to "Close" while it's open and returns to the "Rules" button afterwards.
- Short, player-facing text in `frontend/`, written separately from the engine-facing [game rules](game_rules.md).

## Animations

- Use whatever works best per feature: CSS, or a library when it gives a clearly better result.
- For now everything is CSS: dice tumble in, pegs slide with a slight overshoot, legal columns glow, "Oh no" wobbles, and cues pop.
- Reduced motion shortens every animation to almost nothing.
- Timings live in `frontend/src/game/timing.ts`:

| Step | Duration |
| -- | -- |
| Each roll in a sequence | 0.9 s |
| Peg move | 0.8 s |
| AI thinking | 0.9 s |
| "Oh no" | 2.4 s |
| Continuation cue | 1.8 s |
| AI dice-off throw | 1.2 s |
| Dice-off result | 1.8 s |

## Language

- English only for the MVP.
- Keep UI strings in one module, `frontend/src/lib/strings.ts`, so adding a language is easy.

## View model

- Screens talk to a `GameClient` (`frontend/src/game/model.ts`) whose types mirror the backend's [HTTP API](architecture/http_api.md): each action returns a `GameUpdate`, `{game, logs}`.
- A failed action rejects with a `GameError` carrying the API's `code`; the screens show a generic message and let the player try again.
- Until the API is connected, a fixture client replays a game recorded from the engine; each choice point offers only the recorded target.

## Dev mode

When `GET /api/health` reports `dev_mode`:

- the menu shows a seed field and an AI strategy dropdown
- the game shows the seed and the AI's strategy

The AI strategy is never shown otherwise.

## Later

- A language selector, starting with Dutch.
- More player colours.
