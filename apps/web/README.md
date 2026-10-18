# Opa Prikkie web (NiceGUI)

NiceGUI candidate for [#6](https://github.com/RamsesKools/opaprikkie-simulator/issues/6): the browser game, rendered from Python, calling [`apps/backend`](../backend/README.md) over HTTP.

## Run

Needs [uv](https://docs.astral.sh/uv/). From the repo root:

```sh
scripts/dev.sh
```

- Game: http://localhost:8081
- API docs: http://127.0.0.1:8000/docs

Pick an opponent (AI strategy or hot-seat), optionally a seed, and play.
Each turn the dice are thrown onto the mat, you pick a legal target, the peg climbs, and a banner swipes to the next player; AI turns are replayed from the turn history.

## Layout

- `src/opaprikkie_web/main.py`: the page, its animation timeline, and the HTTP client.
- `src/opaprikkie_web/static/`: pixel art, `pixel.css` theme and animations, font, served at `/assets`.
- `scripts/make_assets.py`: regenerates the pixel art with `uv run scripts/make_assets.py`.

## Credits

- Dice faces: ["Pixel art dice faces"](https://opengameart.org/content/pixel-art-dice-faces) by Vircon32 (Carra), [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/). Sliced into a sprite strip (`dice.png`); original in `dice-sheet.png`.
- Font: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) by CodeMan38, SIL Open Font License (`fonts/OFL.txt`).
- Wood, felt, frame, holes and pegs: drawn by `scripts/make_assets.py`.
