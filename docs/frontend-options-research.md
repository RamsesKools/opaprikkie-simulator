# Browser frontend prototype options

Issue: [#5](https://github.com/RamsesKools/opaprikkie-simulator/issues/5)

This is a prototype comparison. It does not select the final stack.

## Shared backend contract

Keep the browser clients against a small JSON HTTP contract so either frontend can be swapped:

```text
POST /games                  -> {game_id, state}
GET  /games/{game_id}        -> {state}
POST /games/{game_id}/moves  -> {state, event}
```

`state` should include the current player, six dice, available targets, peg positions, and turn status.
The move request can carry `{target: 1..12}`. The server remains authoritative for dice, legal targets, and peg advancement.

## Python-rendered candidate: NiceGUI

NiceGUI is a Python library for browser UIs with a backend-first model. It provides declarative UI elements, event handlers, page routing, and can run as a local server with `ui.run()` on localhost. It is built on FastAPI and can be attached to a FastAPI app.

Sources:

- [NiceGUI documentation](https://nicegui.io/documentation)
- [NiceGUI action and events](https://nicegui.io/documentation/section_action_events)
- [NiceGUI configuration and deployment](https://nicegui.io/documentation/section_configuration_deployment)
- [NiceGUI pages and routing](https://nicegui.io/documentation/section_pages_routing)

Thin flow:

1. `ui.button('Start game', on_click=start_game)` calls `POST /games` with `httpx`, stores the returned `game_id`, and renders `state`.
2. A board can be a `ui.grid` of labels or buttons. The initial roll and legal targets are rendered from `state`.
3. Each target is a real `ui.button` with an event handler that posts the target and refreshes the board from the returned state.

Shared contract fit: use an existing FastAPI service as the API and run NiceGUI beside or mounted on it. The UI handlers are thin API calls, so game rules stay in the package/backend. For a first prototype, keeping the API and NiceGUI process together is simplest; a separate service remains possible because the contract is HTTP JSON.

Accessibility: use semantic NiceGUI controls, visible text labels, keyboard reachable target buttons, and a text status region for roll and turn updates. NiceGUI exposes underlying HTML, CSS, JavaScript, and Quasar customization, so verify the generated markup with keyboard and screen-reader checks. The docs describe elements and events, but do not promise that a custom board is accessible automatically.

Local run: add NiceGUI to the Poetry environment, create a small `main.py`, and call `ui.run()`; the documented default is a local browser server on port 8080. This keeps the prototype in the existing Python toolchain.

Prototype strengths: minimal language boundary, direct access to Python models, and a short path from the existing package to an interactive demo.

Prototype risks: generated client behavior and Quasar customization can make accessibility and detailed visual control require explicit testing; a separate TypeScript client has a clearer browser ownership boundary.

## TypeScript candidate: SvelteKit

SvelteKit is the TypeScript-capable Svelte application framework. Its official docs describe filesystem routing, server and browser rendering modes, and `fetch` in route server endpoints. Svelte also emits compile-time accessibility warnings for many invalid or suspicious markup patterns.

Sources:

- [SvelteKit introduction](https://svelte.dev/docs/kit/introduction)
- [SvelteKit routing and server endpoints](https://svelte.dev/docs/kit/routing)
- [Svelte accessibility warnings](https://svelte.dev/docs/accessibility-warnings)
- [Svelte TypeScript](https://svelte.dev/docs/svelte/typescript)
- [SvelteKit tutorial project setup](https://svelte.dev/tutorial/kit/introducing-sveltekit)

Thin flow:

1. A `+page.svelte` start button calls a typed API client with `POST /games`, stores `game_id` and state, and renders the board.
2. A keyed list of legal target values renders native `<button>` elements. The initial roll is plain text plus a board whose cells expose meaningful labels.
3. The target button posts `{target}` to `POST /games/{game_id}/moves`, replaces state with the response, and updates a live status message.

Shared contract fit: define TypeScript interfaces for `GameState`, `MoveRequest`, and `MoveResponse`. Either call the Python API directly from the browser or add a SvelteKit `+server.ts` proxy so the browser uses same-origin requests. The proxy is useful for local CORS simplicity and for keeping backend URLs in server configuration.

Accessibility: native headings, lists, buttons, and status text align well with the game flow. Svelte compile-time a11y warnings catch common issues such as missing labels, invalid ARIA, and non-focusable interactive elements. They do not replace keyboard, contrast, and screen-reader testing, especially for the visual board.

Local run: scaffold a SvelteKit app with the official tooling, install dependencies, and use the documented `npm run dev` flow. The existing Python game service runs separately and the frontend points at its local API URL or proxy.

Prototype strengths: clear browser-side state and interaction model, strong TypeScript contracts, native HTML control semantics, and good separation from backend implementation.

Prototype risks: introduces Node and a second package toolchain; API proxy or CORS configuration is required when the Python service is separate.

## Prototype recommendation

Build a very small spike in both candidates against the same contract. NiceGUI is the fastest Python-first feasibility check for the existing package. SvelteKit is the stronger browser-first comparison for accessibility, typed API boundaries, and future client-side visual polish. The spike should measure the same five actions: start, initial roll display, target selection, updated state, and keyboard-only operation.

## Environment limitation

The repository sandbox permits writes to the working tree but exposes `.git` as read-only. `git worktree add` and creation of `refs/heads/research/opaprikkie-frontend-options` therefore fail with `Operation not permitted`. This report was created in an isolated temporary clone instead. GitHub API access via `gh` also failed with `error connecting to api.github.com`; branch push and issue comment could not be completed from this environment.
