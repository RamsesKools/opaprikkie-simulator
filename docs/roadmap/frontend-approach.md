# Frontend approach comparison

Working notes for [Which frontend approach best fits the browser MVP? (#6)](https://github.com/RamsesKools/opaprikkie-simulator/issues/6).

## Question

NiceGUI (Python-rendered) or SvelteKit (TypeScript browser UI) for the browser MVP, judged on the same thin flow: start a game, show board and initial roll, choose a legal target, show updated state.

## Setup

- Both frontends live in `apps/web/`, each on its own branch and PR into this feature branch. The one we pick gets merged, the other closed.
- Both call the shared sample API in [`apps/backend`](../../apps/backend/README.md) over the same contract, and share the same pixel-art theme and animations.
- Each PR's description has its code layout, run instructions and the packages it relies on.

## Comparing live

Check out each PR in its own worktree and run `scripts/dev.sh` in both, giving the second its own API port:

```sh
git worktree add ../web-nicegui RamsesKools/frontend-approach-prototype-nicegui
git worktree add ../web-svelte RamsesKools/frontend-approach-prototype-svelte
(cd ../web-nicegui && scripts/dev.sh)
(cd ../web-svelte && BACKEND_PORT=8001 scripts/dev.sh)
```

- NiceGUI: http://localhost:8081
- SvelteKit: http://localhost:5173

Same seed and same choices give the same game in both (dice placement on the mat is cosmetic).

What to judge (from the [prototype skill](https://aihero.dev/skills-prototype)): the question, not the polish.

- Feel: responsiveness, animation timing, glitches.
- Cost: how much framework had to be worked around, whether the API contract is a real boundary, toolchain weight.
- Surprises in game behavior, like "chose 3, moved 0": the opening roll does not count toward the chosen target, tracked in [#16](https://github.com/RamsesKools/opaprikkie-simulator/issues/16).

## Verdict

TBD after the live comparison.
