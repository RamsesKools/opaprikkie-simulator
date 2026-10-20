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
   - Both players' peg boards are visible, and they throw two dice in their colour from a [dice stack](#dice-stack) into the same fixed-size throw area; each player's dice stay in their own lane, and the winner is shown once all dice have landed.
   - A human throws by clicking their stack, which throws by itself after 3 to 5 seconds, with a bar under it filling up for the countdown; the AI throws by itself after about a second.
   - On a tie, a message names the tied players, and only they throw again.
   - The winner's name shows larger and in their seat colour, as in "Roman wins the dice-off!", and their throw area glows in that colour.
   - A human winner chooses who starts with one button per player, directly under that line.
   - An AI winner starts by itself, and the game screen follows after a short pause.
3. Game: boards, the current player, the opening roll, and only legal targets to choose from.
   - A pill above the dice shows the turn number and the player in their colour; their board gets a border in that colour.
   - Dice show in the current player's colour.
   - Dice are thrown from a [dice stack](#dice-stack) into a throw area right of it: green velvet inside a wooden frame, with the dice in rows of three.
   - Every throw first shows its dice waiting in the stack with the throw area empty, also with automatic turns on and for the AI, so a roll reads as stack, throw, set aside, back to the stack, throw.
   - With "Play turns automatically" off, a human player clicks their stack for every throw: the opening roll, each roll after it, and a fresh roll after topping a peg.
     The AI always throws by itself.
     Switching it off mid-game never hides dice already on the table; the next throw waits.
   - With automatic turns on, the player picks a target by clicking its column on their own board; with [hints](#hints) on, only legal columns are clickable and glow.
   - With hints on, hovering or focusing a legal column raises the dice that form its matches, and shows a ghost peg on the row it's guaranteed to reach from the opening roll alone.
     When that row is the top, the dashed ghost also gets a gold halo.
   - With automatic turns off, a human plays the roll sequence by hand ([game rules](game_rules.md#roll-sequence)):
     - Clicking dice in the throw area selects them, raised and outlined; clicking again deselects.
     - With hints on, a row under the throw area lists a "take" option for every target the selection can form, like "Take 2 x 6" and "Take 1 x 12" for two sixes, and those lanes glow; clicking either takes the dice for that target.
       A target only counts when every selected die is part of one of its matches.
     - Taking sets the dice aside into the bowl and locks the target: its lane stays lit in the seat colour while the player throws the rest from the stack, selects more matches, and takes them again.
     - After the first take, a "Stop" button next to the options ends the sequence, and the peg moves by the matches taken.
       There's no stop before the first take, since a turn with a legal target can't pass.
     - Once dice are selected, hovering a column they can be taken for shows the ghost peg where taking them would land; without a selection there's no preview.
     - Switching automatic turns on mid-sequence takes every match from then on.
       If such an automatic take fails, it isn't retried: the error shows and the player finishes the sequence by hand.
     - While a take or stop is on its way, the selection, lit lanes, options, and Stop stay on screen, disabled.
     - Changing the selection clears an error from the last choice.
   - Each roll of the sequence shows in turn, with set-aside dice raised and outlined, then the peg slides up.
   - Set-aside dice move to a saved bowl next to the throw area, with the number of matches so far underneath, like "3 matches for 7".
     The bowl stays filled until the turn passes or the peg reaches the top; a six-dice reset empties it back onto the table, but the count carries on.
   - A six-dice reset gets its own message.
   - No legal target: an animated "Oh no, you didn't roll any legal targets", then the turn passes.
   - Continuation: a cue like "Peg 7 is at the top, roll again".
   - AI turns animate from the returned logs, each starting with "Opa throws the dice." over the full stack, then "Opa is thinking..." over its opening roll, dead turns included.
   - Topped pegs get a gold ring.
4. Victory screen when the last peg is topped: the winner's name in their colour, both final boards, and "Play again".
   - "Play again" returns to the menu with the last mode and names kept.
5. "New Game" in the header, next to the title, leaves the dice-off, game, or victory screen for the menu, with the mode and names kept.
   - Answers still on their way for the abandoned game are ignored.
   - The backend keeps the abandoned game until the next one starts, so a reload before that resumes it.

## Board

- 12 columns, targets 1 to 12, each with rows 0 to 5.
- Row 0 is the bottom row, where every peg starts, and row 5 is the top.

## Dice stack

A pile of the dice the player has left to throw, left of the throw area, in a pyramid:

```text
6:   x      5:  x x    4: x x    3:  x     2: x    1: x
    x x        x x x      x x       x x       x
   x x x
```

- It holds the dice of the next throw: once dice are set aside, the bowl fills and only the rest go back to the stack.
- It's full at the start of a turn or continuation and for a six-dice reset.
- It's clickable only while it waits for a human's throw, and then its dice pulse a white glow.
- With automatic turns on, and for the AI, it's shown the same way but isn't clickable.
- Its dice take the player's colour and show fixed faces; they never tumble.
- Once thrown, it's empty while the dice are in the throw area, keeping its place so nothing shifts.
- `components/stack.tsx` takes a dice count, a seat, an optional `onThrow`, and an optional auto-press time for the countdown bar.
- Below 540 px, where the side columns can't hold it, the stack sits in a row with the throw area, and the bowl with its count moves into a row underneath.

## Colours

- Seat 1 is red, seat 2 is blue.
- Colours come from one palette in the frontend (`frontend/src/lib/palette.ts`); the engine doesn't know about them.
- The boards are wood-coloured with dark holes.
- The header and the mode switch use a pixel wood texture (`frontend/src/assets/wood.svg`).
- The page is a green pixel velvet (`frontend/src/assets/felt.svg`), dimmed to 40% over the off-white paper colour so it stays calm; the throw area and the bowl use the same velvet at full strength.

## Header

- A wooden bar across the top with the title and the "Rules" button, on every screen.
- Outside the menu, a "New Game" button sits right of the title.
- During the game it also holds the "Play turns automatically" and "Show hints" toggles, both on by default and kept for the next game.

## Hints

"Show hints" in the header turns the help in picking on or off; it's a frontend setting only.

- On: legal columns glow, manual turns list "take" options and light their lanes, and hovering previews a pick.
- Off: no glowing columns, no "take" options, and no preview in automatic turns.
  Every column on the player's board is clickable: in automatic turns it chooses that target, in manual turns it takes the selected dice for it.
  The API judges the choice, and a rejection shows its message, like "Not every chosen die is part of a match for 5."
- The locked lane of a sequence in progress stays lit either way, as does the ghost peg for selected dice.

## Rules booklet

- The "Rules" button opens a small booklet in the centre of the screen, on every screen.
- It closes with its "Close" button, Escape, or a click outside it.
- Focus moves to "Close" while it's open and returns to the "Rules" button afterwards.
- Short, player-facing text in `frontend/`, written separately from the engine-facing [game rules](game_rules.md).

## Animations

- Use whatever works best per feature: CSS, or a library when it gives a clearly better result.
- For now everything is CSS: dice tumble in, pegs slide with a slight overshoot, legal columns and a clickable stack glow, "Oh no" wobbles, and cues and the dice-off winner pop.
- Dice tumble in only on a new throw; dice already on the table stay put while the sequence replays, and set-aside dice leave without moving the rest.
- Reduced motion shortens every animation to almost nothing.
- Timings live in `frontend/src/game/timing.ts`:

| Step | Duration |
| -- | -- |
| Dice waiting in the stack | 0.7 s |
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
  - a rejected choice: the API's message, as above
  - anything else: "Something went wrong."
- Except for a lost game, the player stays put and can try again.
- When the session can't load because the server is unreachable, the menu shows with the network message; any other failure there leaves a clean menu.
- An alert on the menu clears as soon as the player changes the mode or a name.
- The app waits for the session before showing a screen, so a reload resumes the game:
  - waiting for the dice-off winner's choice: the dice-off screen with the "Who starts?" buttons, without replaying the throws
  - waiting for a target: the game screen at that choice
  - no game, a finished one, or one never named: the menu, with the names prefilled
- Unit tests use a fixture client that replays a game recorded from the engine; each choice point offers only the recorded target, and manual turns aren't scripted.
- The "take" options, their lanes, and the ghost peg's row are looked up for the selected dice in the observation's `takes`; the frontend has no matching rules of its own.
- A rejection of a choice (`wrong_phase`, `illegal_target`, `illegal_dice`) shows the API's message as a sentence, so hints off can teach the rules.
- After a `wrong_phase` rejection, for example when another tab moved the game on, the game screen reloads the game from the session.

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
