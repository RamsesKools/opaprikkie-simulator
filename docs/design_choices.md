# Design choices

Every frontend design choice: screens, flows, colours, animations, timings, and copy.
When this grows too large, split it, for example into `docs/design/ux_choices.md` and `docs/design/theme.md`.

## Flow

1. Menu: pick the mode and enter names.
   - A big wooden switch flips between "Player vs AI", the default, and "Player vs Player" (hot-seat).
   - Names are trimmed, 1 to 20 characters, and stored in the session so they're prefilled next time, in the mode of the session's last game.
   - Defaults: "Player 1", "Player 2", and "Opa" for the AI; all editable.
   - The menu keeps three names: player 1 sits in both modes, while player 2 and the AI each keep their own, so switching modes brings back the other mode's name.
   - The app keeps them across games until the page reloads; the session only stores the last game's two.
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
   - Dice are thrown into a throw area: green velvet inside a wooden frame, with the dice in rows of three.
   - With "Play turns automatically" off, a human player presses "Throw" for every throw: the opening roll, each roll after it, and a fresh roll after topping a peg.
     The AI always throws by itself.
     Switching it off mid-game never hides dice already on the table; the next throw waits.
   - The player picks a target by clicking its column on their own board; only legal columns are clickable and glow.
   - Hovering or focusing a legal column raises the dice that form its matches, and shows a ghost peg on the row it's guaranteed to reach from the opening roll alone.
     When that row is the top, the dashed ghost also gets a gold halo.
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
5. "New Game" in the header, next to the title, leaves the dice-off, game, or victory screen for the menu, with the mode and names kept.
   - Answers still on their way for the abandoned game are ignored.
   - The backend keeps the abandoned game until the next one starts, so a reload before that resumes it.

## Board

- 12 columns, targets 1 to 12, each with rows 0 to 5.
- Row 0 is the bottom row, where every peg starts, and row 5 is the top.

## Colours

- Seat 1 is red, seat 2 is blue.
- Colours come from one palette in the frontend (`frontend/src/lib/palette.ts`); the engine doesn't know about them.
- The boards are wood-coloured with dark holes.
- The header and the mode switch use a pixel wood texture (`frontend/src/assets/wood.svg`).
- The page is a green pixel velvet (`frontend/src/assets/felt.svg`), dimmed to 40% over the off-white paper colour so it stays calm; the throw area and the bowl use the same velvet at full strength.

## Header

- A wooden bar across the top with the title and the "Rules" button, on every screen.
- Outside the menu, a "New Game" button sits right of the title.
- During the game it also holds the "Play turns automatically" toggle, on by default and kept for the next game.

## Rules booklet

- The "Rules" button opens a small booklet in the centre of the screen, on every screen.
- It closes with its "Close" button, Escape, or a click outside it.
- Focus moves to "Close" while it's open and returns to the "Rules" button afterwards.
- Short, player-facing text in `frontend/`, written separately from the engine-facing [game rules](game_rules.md).

## Animations

- Use whatever works best per feature: CSS, or a library when it gives a clearly better result.
- For now everything is CSS: dice tumble in, pegs slide with a slight overshoot, legal columns glow, "Oh no" wobbles, and cues pop.
- Dice tumble in only on a new throw; dice already on the table stay put while the sequence replays, and set-aside dice leave without moving the rest.
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

- Screens talk to a `GameClient` (`frontend/src/game/model.ts`) that mirrors the backend's [HTTP API](architecture/http_api.md), with the types generated in `frontend/src/lib/api.d.ts`: each action returns a `GameUpdate`, `{game, logs}`.
- `game/api_client.ts` implements it with `openapi-fetch`; `start` creates the game and names the players, and starts a fresh session when the old one is gone.
- A failed action rejects with a `GameError` carrying the API's `code`, and `game/errors.ts` picks the message:
  - `network`: "Can't reach the server. Check your connection and try again."
  - `no_session` or `no_game`: the game is lost, so the app goes back to the menu, with the last names kept, saying "Your game was lost. Start a new one."
  - anything else: "Something went wrong."
- Except for a lost game, the player stays put and can try again.
- When the session can't load because the server is unreachable, the menu shows with the network message; any other failure there leaves a clean menu.
- An alert on the menu clears as soon as the player changes the mode or a name.
- The app waits for the session before showing a screen, so a reload resumes the game:
  - waiting for the dice-off winner's choice: the dice-off screen with the "Who starts?" buttons, without replaying the throws
  - waiting for a target: the game screen at that choice
  - no game, a finished one, or one never named: the menu, with the names prefilled
- Unit tests use a fixture client that replays a game recorded from the engine; each choice point offers only the recorded target.

## Version handshake

- On load and after every failed action, the app compares `GET /api/health`'s `version` with its own from `package.json`.
- On a mismatch, a banner under the header says "A new version of Opa Prikkie is out." with a "Reload" button.
- A failed health check changes nothing; the next failure checks again.

## Dev mode

When `GET /api/health` reports `dev_mode`:

- the menu shows a seed field and, versus AI, an AI strategy dropdown with the `strategies` the health lists, defaulting to "Random"
- a blank seed or "Random" isn't sent, so the backend picks
- the seed is always sent as a string, like the backend's own generated seeds, so a seed copied from the game replays it
- the game shows the seed and the AI's strategy under the message

The AI strategy is never shown otherwise.

## Later

- A language selector, starting with Dutch.
- More player colours.
