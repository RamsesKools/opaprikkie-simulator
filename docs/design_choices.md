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
   - Both players' peg boards are visible, every peg on the bottom row (even when an AI winner has already played its first turn), and they throw two dice in their colour from a [dice stack](#dice-stack) into the same fixed-size throw area; each player's dice stay in their own lane, and the winner is shown once all dice have landed.
   - A human throws by clicking their stack, which throws by itself after 3 to 5 seconds, with a bar under it filling up for the countdown; the AI throws by itself after about a second.
   - On a tie, a message names the tied players, and only they throw again.
   - The winner's name shows larger and in their seat colour, as in "Roman wins the dice-off!", and their throw area glows in that colour.
   - A human winner chooses who starts with one button per player, directly under that line.
   - An AI winner starts by itself, and the game screen follows after a short pause.
3. Game: boards, the current player, the opening roll, and only legal targets to choose from.
   - The game sits in one central column, as wide as the two boards side by side; wider screens get more side padding.
   - Under the pill, the dice stack, the throw area, and the bowl each take a third of that column.
   - A pill above the dice shows the turn number and the player in their colour; their board gets a border in that colour.
   - Dice show in the current player's colour.
   - Dice are thrown from a [dice stack](#dice-stack) into a throw area right of it: green velvet inside a wooden frame, with the dice in rows of three.
   - Every throw first shows its dice waiting in the stack with the throw area empty, also when playing automatically and for the AI, so a roll reads as stack, throw, set aside, back to the stack, throw.
   - In the manual [play modes](#play-modes), a human player clicks their stack for every throw: the opening roll, each roll after it, and a fresh roll after topping a peg.
     The AI always throws by itself.
     Switching modes never throws, hides, or changes the dice already on the table, and they don't tumble in again; in a manual mode, the next throw waits.
   - Playing automatically, the player picks a target by clicking its column on their own board; only legal columns are clickable and glow.
   - Playing automatically, hovering or focusing a legal column raises the dice that form its matches, and shows a [ghost peg](#board) on the row it's guaranteed to reach from the opening roll alone.
   - Playing with hints, hovering or focusing a lit lane on the opening roll, with nothing selected, shows a ghost peg where the peg lands after taking that lane's most matches.
   - In a manual play mode, a human plays the roll sequence by hand ([game rules](game_rules.md#roll-sequence)):
     - Clicking dice in the throw area selects them, raised and outlined; clicking again deselects.
       A die only selects while the selection still fits one of the observation's take options; otherwise it stays clickable, but the click does nothing.
     - Opening roll: once the selection is a whole take, the lanes it can be taken for glow, each with a ghost peg where the peg would land, like lane 6 two rows up and lane 12 one row up for two sixes.
       Clicking one of those lanes takes the dice for it and locks in the target.
     - Opening roll, in both manual modes: the stack's place also shows a button per take the selection fits, like "Choose 2 x 6" and "Choose 1 x 12" for two sixes.
       Clicking one does the same as clicking its lane.
       Under its name, each says in short what follows, from the take option's outcome: "Reroll 4 dice", "Reroll all", "Finish peg", "End turn", or "Win!".
     - Taking sets the dice aside into the bowl and locks the target: its lane stays lit in the seat colour while the player throws the rest from the stack, selects more matches, and takes them again.
     - Later throws: once the selection is a whole take, a button in the stack's place takes it and says what happens next, from the take option's outcome:
       - "Reroll 2 dice", with the number of dice left;
       - "Reroll all for more 3's" when the take uses up every die (a six-dice reset);
       - "Finish peg and reroll all dice" when it tops the peg (a continuation);
       - "Move peg and end turn" when too few dice are left for a match;
       - "Finish peg and win" when it tops the last peg.
     - In a later throw, clicking the locked lane takes the selection too.
       With nothing selected, playing with hints, it takes the lane's most matches at once and the sequence goes on.
       Without hints, or with only part of a match selected (one die of a pair), a first click selects the most matches, and a second takes them.
     - Playing with hints and nothing selected, clicking a lit lane on the opening roll takes its most matches at once, without a second click or a "Choose" button.
     - After the first take, an "End turn" button under the throw area ends the whole turn: the peg moves by the matches taken so far, and the turn passes.
       There's no end turn before the first take, since a turn with a legal target can't pass.
     - A ghost peg marks where the peg will land, while the peg itself only moves once the sequence ends:
       - During a sequence, in both manual modes and while its throws replay, on the locked lane, one row up per match taken so far, so each take moves it further.
       - For a selection that's a whole take, on every lane it can be taken for, at the row the take would reach.
       - Playing with hints, for a hovered lit lane with nothing selected, at the row its most matches reach.
     - Switching to playing automatically mid-sequence takes every match from then on.
       If such an automatic take fails, it isn't retried: the error shows and the player finishes the sequence by hand.
     - While a take or end turn is on its way, the selection, lit lanes, the button in the stack's place, and End turn stay on screen, disabled.
     - Changing the selection clears an error from the last choice.
   - Each roll of the sequence shows in turn, with set-aside dice raised and outlined, then the peg slides up.
   - Set-aside dice move to a saved bowl next to the throw area, with the number of matches so far underneath, like "3 matches for 7".
     The bowl stays filled until the turn passes or the peg reaches the top; a six-dice reset empties it back onto the table, but the count carries on.
   - A six-dice reset gets its own message.
   - [Combos](#turn-feedback), [end-of-sequence pop-ups](#turn-feedback), and [confetti](#celebrations) come with the throws, as described below.
   - No legal target: a pop-up "Oh no, you didn't roll any legal targets", then the turn passes.
   - Continuation: a cue like "Peg 7 is at the top, roll again".
   - AI turns animate from the returned logs, each starting with "Opa throws the dice." over the full stack, then "Opa is thinking..." over its opening roll, dead turns included.
   - Topped pegs get a gold ring.
4. Victory screen when the last peg is topped: the winner's name in their colour with [confetti](#celebrations), "Play again", the game's stats, and both final boards.
   - The stats are the number of turns, dead ones included ("The game took 54 turns."), and a small bar chart per player in their colour of how often each face 1 to 6 was thrown, with the count above each bar.
     Both charts share one scale, so players compare; the dice-off is left out.
   - The engine counts them in the game state, so they come from the API and a reload keeps them ([HTTP API](architecture/http_api.md)).
   - "Play again" returns to the menu with the last mode and names kept.
5. "New Game" in the header, next to the title, leaves the dice-off, game, or victory screen for the menu, with the mode and names kept.
   - Answers still on their way for the abandoned game are ignored.
   - The backend keeps the abandoned game until the next one starts, so a reload before that resumes it.

## Turn feedback

- Combo: from the third throw in a row with a match in one sequence, "Combo x3", "Combo x4", and so on flash in gold over the top of the throw area for a second.
  A throw without a match, or a new sequence after topping a peg, starts over.
  It's decoration only: it ignores clicks, and the selection keeps working under it.
- End-of-sequence pop-up: when a sequence ends on a throw with no match, or the player clicks "End turn", a pop-up under the throw area says what it did:
  - "No more 10s. You took 3 matches for 10, your peg moves 3 steps." For another player it names them: "No more 10s. Opa took 3 matches for 10, Opa's peg moves 3 steps."
  - "You ended your turn. You took 3 matches for 10, your peg moves 3 steps."
  - A sequence that ends by topping the peg or running out of dice for a match keeps its plain "Peg 10 moves up 3 rows." message, since the continuation cue or the next turn follows.
- The pop-ups, the end-of-sequence one and the no legal target one, never wait for a click: they go by themselves after 2.4 s, a click skips them early, and reduced motion shortens them to 0.6 s.
  They show for the AI and playing automatically too, where they lengthen the peg move to the same 2.4 s.

## Celebrations

- Great turn: a short confetti burst, in the seat's colour with gold, white, and green, falls from the top of the screen for 2.4 s when a roll sequence moves one peg far for its lane, for any player including the AI.
  - The cutoff is the steps in one sequence per lane, from simulating 40,000 sequences per lane with every match taken, given an opening roll with a match for it, and picking the step count whose chance of being reached is closest to 10%, comparing by ratio.
    A peg going from the bottom to the top (5 steps) is always great, since no cutoff is higher.

    | Lane | Cutoff (steps) | Chance of at least that many |
    | -- | -- | -- |
    | 1 to 6 | 5 | 11% |
    | 7 | 5 | 15% |
    | 8 | 5 | 9% |
    | 9 | 3 | 9% |
    | 10 | 3 | 6% |
    | 11 | 2 | 31% |
    | 12 | 2 | 16% |

  - Lanes 11 and 12 follow the playtest anchors: two 12s, and two or three 11s, are great.
    Two 11s happen in 31% of the sequences, but three in 2%, and two is the closer of the two to 10%.

  - The table lives in `frontend/src/game/great_turns.ts`.
- Win: confetti on the victory screen, in the winner's colour.
- Confetti never blocks input: it ignores clicks and isn't announced to assistive tech.
  Reduced motion makes it vanish after 0.2 s.

## Board

- 12 columns, targets 1 to 12, each with rows 0 to 5.
- Row 0 is the bottom row, where every peg starts, and row 5 is the top.
- A ghost peg, dashed in the seat colour, marks where a peg would land; on the top row it also gets a gold halo.

## Dice stack

A pile of the dice the player has left to throw, left of the throw area, in a pyramid:

```text
6:   x      5:  x x    4: x x    3:  x     2: x    1: x
    x x        x x x      x x       x x       x
   x x x
```

- It holds the dice of the next throw: once dice are set aside, the bowl fills and only the rest go back to the stack.
- It's full at the start of a turn or continuation and for a six-dice reset.
- It's clickable only while it waits for a human's throw, and then it's a big round button enclosing the dice, labelled "Throw dice", with the dice pulsing a white glow.
- Playing automatically, and for the AI, it's shown the same way but isn't clickable, so it keeps the plain pile without the button and the label.
- Its dice take the player's colour and show fixed faces; they never tumble.
- Once thrown, it's empty while the dice are in the throw area, keeping its place so nothing shifts; in a manual sequence, the buttons that take the selection show there.
- `components/stack.tsx` takes a dice count, a seat, an optional `onThrow`, and an optional auto-press time for the countdown bar.
- Below 540 px, where the thirds don't fit, the stack waits inside the empty throw area, so the throw area and the bowl stay on one line down to 360 px; the buttons that take the selection go under the throw area instead.

## Colours

- Seat 1 is red, seat 2 is blue.
- Colours come from one palette in the frontend (`frontend/src/lib/palette.ts`); the engine doesn't know about them.
- The boards are wood-coloured with dark holes.
- The header and the [sliders](#sliders) use a pixel wood texture (`frontend/src/assets/wood.svg`); the header's play mode slider is a darker wood than the header bar, with a drop shadow, so it stands out.
- The page is a green pixel velvet (`frontend/src/assets/felt.svg`), dimmed to 40% over the off-white paper colour so it stays calm; the throw area and the bowl use the same velvet at full strength.

## Header

- A wooden bar across the top with the title and the "Rules" button, on every screen.
- Outside the menu, a "New Game" button sits right of the title.
- During the game it also holds the [play mode](#play-modes) slider, with a small round "?" button next to it that opens the [explanation of the modes](#play-modes-help); below 540 px, the slider and the "?" take a full row of their own, with smaller labels.

## Sliders

- The menu's "Player vs AI" / "Player vs Player" mode and the header's [play mode](#play-modes) use one slider (`components/slider.tsx`): wood around felt-lined options, the chosen one sunk in.
- It's a radio group: Tab reaches the chosen option, the arrow keys move and select, stopping at the ends rather than wrapping, so an extra press mid-turn never lands on "Play automatically" by surprise, and Home and End jump to the ends.

## Play modes

A three-way slider in the header, "Play without hints", "Play with hints", "Play automatically", decides how human turns play; it's a frontend setting only.
It starts on "Play automatically" and keeps its position for the next game, but not across a reload.

- Play without hints: manual turns, and no lane in the opening roll lights up until dice are selected.
- Play with hints: manual turns, and every legal lane also glows before any dice are selected; hovering one shows where the peg lands for its most matches, and clicking it takes them at once.
- Play automatically: the player only picks the target and the sequence plays itself, always with the hints: legal columns glow and hovering previews a pick.
  There's no automatic play without hints.
- Both manual modes otherwise play the same: dice only select into a valid take, a whole take lights its lanes with their ghost pegs, and the "Choose" buttons show.
- In both manual modes, the locked lane of a sequence in progress stays lit whatever is selected, with its ghost peg for the matches taken so far.

## Scroll pop-ups

The rules booklet and the play modes explanation are text pop-ups drawn as an old paper scroll (`components/scroll.tsx`):

- A rolled header with the title and a rolled footer, both fixed, with wooden ends; the paper text scrolls between them.
- "Close" sits in the footer, so it's always reachable without scrolling to the end.
- It closes with "Close", Escape, or a click outside it.
- Focus moves to "Close" while it's open and returns to what opened it afterwards; Tab swaps between the scrolling text, so it can be scrolled by keyboard, and "Close".
- Centred on the screen above everything else but the confetti, on every screen.

## Rules booklet

- The "Rules" button opens the rules as a scroll, on every screen.
- Short, player-facing text in `frontend/`, written separately from the engine-facing [game rules](game_rules.md).

## Play modes help

- The "?" button next to the play mode slider opens a short scroll explaining "Play without hints", "Play with hints", and "Play automatically", one paragraph each.

## Animations

- Use whatever works best per feature: CSS, or a library when it gives a clearly better result.
- For now everything is CSS: dice tumble in, pegs slide with a slight overshoot, legal columns and a clickable stack glow, pop-ups, cues, and the dice-off winner pop, the combo flash rises and fades, and confetti falls.
- Dice tumble in only on a new throw; dice already on the table stay put while the sequence replays, and set-aside dice leave without moving the rest.
- Reduced motion shortens every animation to almost nothing, and the pop-ups and confetti stay on screen for a fraction of their time.
- Timings live in `frontend/src/game/timing.ts`:

| Step | Duration |
| -- | -- |
| Dice waiting in the stack | 0.7 s |
| Each roll in a sequence | 0.9 s |
| Peg move | 0.8 s (2.4 s when a pop-up goes with it) |
| AI thinking | 0.9 s |
| Pop-up ("Oh no", end of sequence) | 2.4 s (0.6 s with reduced motion) |
| Combo flash | 1.0 s |
| Confetti | 2.4 s (0.2 s with reduced motion) |
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
- Which dice may be selected, the lanes a selection lights, the ghost peg's row, and the label of the button that takes it are looked up in the observation's `takes`, whose `outcome` and `next_dice` say what each take leads to; the frontend has no matching rules of its own.
- A rejection of a choice (`wrong_phase`, `illegal_target`, `illegal_dice`) shows the API's message as a sentence; since the UI only offers legal choices, that's after a race, like another tab moving the game on.
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
