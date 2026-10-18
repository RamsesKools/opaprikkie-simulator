---
status: accepted
---

# React single-page app for the browser frontend

The browser MVP frontend is a React single-page app (Vite, TypeScript) that talks to the Python backend only over the HTTP game contract.
We chose it in [#6](https://github.com/RamsesKools/opaprikkie-simulator/issues/6) after playing three prototypes of the same flow side by side, each with the same sample backend and pixel-art UI.

## Considered options

- **React** ([#22](https://github.com/RamsesKools/opaprikkie-simulator/pull/22), chosen): the UI and animations run in the browser, contract types are generated from the backend's OpenAPI schema, and as a plain SPA it needs no server rendering or adapters for a local MVP. It has the largest ecosystem, at the cost of a little more code than SvelteKit.
- **SvelteKit** ([#21](https://github.com/RamsesKools/opaprikkie-simulator/pull/21)): the same browser-side model and contract typing, and the most concise of the three, but brings a full-stack framework we don't need for a local SPA.
- **NiceGUI** ([#20](https://github.com/RamsesKools/opaprikkie-simulator/pull/20)): keeps the whole repo in Python, but a custom look meant working around Quasar and Tailwind throughout, every interaction is a websocket round trip to a second Python server, and nothing enforces the HTTP contract as a boundary.

## Consequences

- The repo gains a Node toolchain next to uv, for `apps/web`.
- The backend's OpenAPI schema is the frontend's contract: regenerate `apps/web/src/lib/api.d.ts` when it changes, and a mismatch fails `npm run check`.
- `apps/web` starts from the prototype code, which has no tests yet; harden it during implementation rather than treating it as production-ready.
