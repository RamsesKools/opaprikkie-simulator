---
status: accepted
---

# Unversioned API with a version handshake

All routes live under `/api` without a version segment.
`GET /api/health` returns the app version; the frontend shows a reload banner on mismatch and the simulator's HTTP client fails fast.
We chose it in [#8](https://github.com/RamsesKools/opaprikkie-simulator/issues/8).

## Considered options

- **Unversioned `/api` with a handshake** (chosen): the SPA ships in the same image as the API, so in production they can't drift apart.
  The two remaining drift cases, a browser tab open across a redeploy and the simulator pointed at an older container, are caught by the handshake.
- **Versioned routes (`/api/v1`, then `/api/v2` next to it)**: pays off for consumers you don't control and don't deploy with; here it would mean maintaining old versions nobody calls.

## Consequences

- Frontend and backend change together in one PR; a new variant of an endpoint gets a new name inside the same API.
- The frontend's generated types, the OpenAPI drift check, and the contract suite guard the API from the frontend's side (see [conventions](../development/conventions.md#testing)).
