---
status: accepted
---

# One app version, `.postN` image tags

The project has one version, set in `pyproject.toml` and mirrored in `frontend/package.json`.
Images are tagged with that version; when the same version is rebuilt with a different digest, the next tag is `<version>.postN`.
We chose it in [#7](https://github.com/RamsesKools/opaprikkie-simulator/issues/7) and [#27](https://github.com/RamsesKools/opaprikkie-simulator/issues/27).

## Considered options

- **One version, `.postN` for rebuilds** (chosen): the frontend, API, and simulator always ship together, so one number identifies what runs.
  `.postN` marks images rebuilt from newer commits without a version bump, so PRs don't need a forced bump.
- **Per-module versions with a composite image tag**: shows which module changed, but needs a bump check per module and a long tag for little gain in a single-image app.
- **A changelog with a version check**: dropped along with kacl; git history and PR descriptions cover it.

## Consequences

- `task bump <major|minor|patch>` sets both versions, and a pre-commit check fails when they differ.
- A GitHub Actions job on `main` builds the image, compares its digest with the latest tag for the version on GHCR, and pushes the next tag plus `latest` only when it differs.
- Because the commit is an image `LABEL`, every new commit changes the digest, so `.postN` in practice means "rebuilt from a newer commit".
