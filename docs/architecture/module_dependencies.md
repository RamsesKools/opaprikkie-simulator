# Module dependencies

How the modules of Opa Prikkie relate: what each owns, what it may depend on, and how they talk.
Why it's shaped this way lives in the [ADRs](../adr/).

## Graph

```mermaid
flowchart LR
    Browser[frontend<br/>React SPA] -->|HTTP /api + session cookie| Backend
    Sim[opaprikkie.sim] -->|HTTP /api + session cookie| Backend
    Sim -->|Python import| Engine
    Backend[opaprikkie.backend<br/>FastAPI] -->|Python import| Engine[opaprikkie.engine]
    Backend -.->|serves built files| Browser
    Backend -.->|OpenAPI schema| Types[frontend/src/lib/api.d.ts]
    Types -.->|compile-time types| Browser
    CLI[opaprikkie.cli] --> Backend
    CLI --> Sim
```

## Modules

### `opaprikkie.engine`

- Owns the rules, board, dice, game state, turn resolution, seeded randomness, and built-in strategies.
- A library of pure functions over immutable state; it stores nothing ([ADR 0003](../adr/0003_stateless_engine_with_backend_sessions.md)).
- Depends on the standard library only; imports neither `backend` nor `sim`.
- Public surface: whatever `opaprikkie/engine/__init__.py` exports in `__all__`.

### `opaprikkie.backend`

- Owns the HTTP API, the in-memory session store, the cookie, settings, and serving the built SPA.
- Wraps the engine: every state change is an engine call.
- Depends on `engine`, FastAPI, uvicorn, and pydantic-settings; doesn't import `sim`.

### `opaprikkie.sim`

- Owns batch runs, strategy matchups, the HTTP client, and aggregate statistics.
- Drives games either in-process through `engine` or over HTTP against a running backend.
- Depends on `engine` and httpx; never imports `backend` (tests may use it to exercise the HTTP path in-process).

### `opaprikkie.cli`

- The `opaprikkie` command: `serve` starts the backend, `simulate` runs batches.
- The only module that composes `backend` and `sim`.

### `frontend/`

- React SPA for hot-seat and human-versus-AI play.
- Talks to the backend only over HTTP, through a typed client generated from the backend's OpenAPI schema.
- Built into static files that the backend serves at `/`.

## Communication paths

| From | To | Through | Contract |
| --- | --- | --- | --- |
| frontend | backend | HTTP `/api`, same origin | generated `api.d.ts`, contract suite |
| sim | backend | HTTP `/api` | version handshake on `/api/health` |
| sim | engine | Python import | `engine.__all__` |
| backend | engine | Python import | `engine.__all__` |
| backend | frontend | static files from `OPAPRIKKIE_STATIC_DIR` | built `frontend/dist` |

## Enforcement

- `import-linter` contracts in `task lint_imports` (part of `task check` and CI) encode the import rules above.
- Change this document and the contracts together.
