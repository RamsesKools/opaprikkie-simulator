# Opa Prikkie web (React)

React candidate for [#6](https://github.com/RamsesKools/opaprikkie-simulator/issues/6): the browser game as a Vite + React single-page app in TypeScript, calling [`apps/backend`](../backend/README.md) over HTTP.

## Status

Good enough as the MVP frontend: it plays a full game against the AI or hot-seat and only renders the state the backend returns.
The gameplay itself does not follow the published rules completely yet; see [Rules status](../backend/README.md#rules-status).
Those fixes land in the backend, with at most small UI additions here, such as showing set-aside dice for [#16](https://github.com/RamsesKools/opaprikkie-simulator/issues/16).

## Run

Needs [uv](https://docs.astral.sh/uv/) and [Node](https://nodejs.org/) 22+. From the repo root:

```sh
scripts/dev.sh
```

- Game: http://localhost:5174
- API docs: http://127.0.0.1:8000/docs

Pick an opponent (AI strategy or hot-seat), optionally a seed, and play.
Each turn the dice are thrown onto the mat, you pick a legal target, the peg climbs, and a banner swipes to the next player; AI turns are replayed from the turn history.

## Layout

- `src/App.tsx`: game page, state, and the animation timeline.
- `src/components/Board.tsx`, `src/components/DiceMat.tsx`: peg board and dice mat.
- `src/lib/contract.ts`: typed API client; `src/lib/api.d.ts` is generated from the backend's OpenAPI schema with `npm run gen:api` (backend running).
- `src/lib/format.ts`: player labels and turn log lines.
- `src/app.css`: pixel-art theme and animations.
- `public/assets/`: pixel art and font, served at `/assets`.
- `scripts/make_assets.py`: regenerates the pixel art with `uv run scripts/make_assets.py`.
- `vite.config.ts`: dev proxy from `/api` to the backend (`BACKEND_URL`).

## Checks

```sh
npm run check
```

## Credits

- Dice faces: ["Pixel art dice faces"](https://opengameart.org/content/pixel-art-dice-faces) by Vircon32 (Carra), [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/). Sliced into a sprite strip (`dice.png`); original in `dice-sheet.png`.
- Font: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) by CodeMan38, SIL Open Font License (`fonts/OFL.txt`).
- Wood, felt, frame, holes and pegs: drawn by `scripts/make_assets.py`.
