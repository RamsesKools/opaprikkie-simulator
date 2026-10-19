# Frontend lint and format research (issue #26)

Checked on 2026-10-19 against primary sources.
The `apps/web` paths below date from the prototype; the app now lives in `frontend/`.
Release facts come from the npm registry (`npm view <pkg> time`), everything else links to official docs.
"Tested" means I ran it on a scratch copy of `apps/web` (never in the repo).

## TL;DR

- Recommendation: oxlint (type-aware) + oxfmt.
- It keeps your current linter, adds one more binary from the same project, and needs 3 devDependencies.
- Oxlint now ships the React Compiler rules natively (22 of them), `unicorn/filename-case` with `snakeCase`, and 59 of 61 typescript-eslint type-aware rules.
- Tested: type-aware oxlint works on this TS 6 project and found 3 real issues (floating promise, misused promise, template literal) that Biome only half-caught.
- Catch: oxfmt is still beta (0.x), and `oxlint-tsgolint` officially targets TypeScript 7.
- Fallback: swap oxfmt for Prettier later, the lint side does not change.
- Runner-up: Biome, if you want one tool and 1 dependency, at the cost of weaker type-aware and no React Compiler rules.

## Comparison

| Criterion | 1. Biome | 2. oxlint + oxfmt | 3. oxlint + Prettier | 4. ESLint + tseslint + Prettier |
| --- | --- | --- | --- | --- |
| Latest | 2.5.15 (2026-09-30) | oxlint 1.88.0, oxfmt 0.73.0 (2026-10-13) | oxlint 1.88.0, Prettier 3.9.10 | ESLint 10.13.0, tseslint 8.71.2 |
| Releases, last ~6 mo | 20 | 29 and 28 | 29 and 13 | 15 and 23 |
| Formatter status | stable | oxfmt beta | stable | stable |
| Hooks rules | hooks + exhaustive-deps | hooks + exhaustive-deps | same as 2 | full plugin |
| React Compiler rules | one nursery rule | 22 native | 22 native | full plugin (17 in recommended) |
| only-export-components | yes (not recommended preset) | yes (restriction) | yes | react-refresh plugin |
| Type-aware | own inference, nursery rules | tsgolint, 59 of 61 rules | same as 2 | typescript-eslint, all rules |
| snake_case files | `useFilenamingConvention` | `unicorn/filename-case` | same as 2 | unicorn or check-file |
| CSS formatting | yes | yes | yes | yes |
| Markdown formatting | in progress | yes | yes | yes |
| devDependencies | 1 | 3 | 3 | about 8 |
| Config files | 1 | 2 | 2 | 2 plus plugins |

## Maturity and cadence

- Biome 2.5.15 is the latest stable on npm, with 20 stable releases since April ([npm](https://www.npmjs.com/package/@biomejs/biome)).
- oxlint 1.88.0 and oxfmt 0.73.0 shipped on 2026-10-13, so cadence is roughly weekly ([oxlint](https://www.npmjs.com/package/oxlint), [oxfmt](https://www.npmjs.com/package/oxfmt), [oxfmt releases](https://github.com/oxc-project/oxc/releases)).
- Oxfmt reached beta on 2026-02-24 and I found no stable announcement since ([beta post](https://oxc.rs/blog/2026-02-24-oxfmt-beta)).
- Type-aware linting went stable on 2026-07-22 ([post](https://oxc.rs/blog/2026-07-22-type-aware-linting-stable)).
- JS plugins are still alpha ([docs](https://oxc.rs/docs/guide/usage/linter/js-plugins.html)).
- ESLint 10.0.0 landed 2026-02-06, flat config only ([release post](https://eslint.org/blog/2026/02/eslint-v10.0.0-released/)), latest is 10.13.0 ([npm](https://www.npmjs.com/package/eslint)).
- typescript-eslint 8.71.2 ([npm](https://www.npmjs.com/package/typescript-eslint)) supports TypeScript >=4.8.4 <6.1.0, so not TS 7 ([docs](https://typescript-eslint.io/users/dependency-versions/)).
- eslint-plugin-react-hooks 7.1.1 was published 2026-04-17, nothing since ([npm](https://www.npmjs.com/package/eslint-plugin-react-hooks)).
- Prettier 3.9.10 is stable, 4.0 is still alpha ([npm](https://www.npmjs.com/package/prettier)).

## React rule coverage

- Oxlint implements `react/exhaustive-deps` ([rule](https://oxc.rs/docs/guide/usage/linter/rules/react/exhaustive-deps.html)), `react/rules-of-hooks` (pedantic category, so enable explicitly) ([rule](https://oxc.rs/docs/guide/usage/linter/rules/react/rules-of-hooks.html)), and `react/only-export-components` (restriction category) ([rule list](https://oxc.rs/docs/guide/usage/linter/rules.html)).
- Oxlint has 22 React Compiler rules (purity, immutability, refs, set-state-in-effect, and so on), recommended ones live in `correctness` ([post](https://oxc.rs/blog/2026-08-18-react-compiler-support)).
- The upstream plugin's recommended preset has 17 rules including the compiler diagnostics ([react.dev](https://react.dev/reference/eslint-plugin-react-hooks)).
- Biome's React domain auto-enables when `react` is a dependency, and has `useExhaustiveDependencies` and `useHookAtTopLevel` ([domains](https://biomejs.dev/linter/domains/)).
- Biome's compiler rule `useReactCompiler` is nursery ([domains](https://biomejs.dev/linter/domains/)).
- Biome's `useComponentExportOnlyModules` supports `allowConstantExport` but is not in the recommended preset ([rule](https://biomejs.dev/linter/rules/use-component-export-only-modules/)).
- ESLint route: `eslint-plugin-react-refresh` has a `reactRefresh.configs.vite()` preset ([README](https://github.com/ArnaudBarre/eslint-plugin-react-refresh)).
- Optional `@eslint-react/eslint-plugin` is at 5.28.2 ([npm](https://www.npmjs.com/package/@eslint-react/eslint-plugin)), I would skip it.

## Type-aware rules

- Oxlint: install `oxlint-tsgolint`, set `options.typeAware: true`, 59 of 61 typescript-eslint type-aware rules ([docs](https://oxc.rs/docs/guide/usage/linter/type-aware.html)).
- Docs say TypeScript 7.0+ is required, tsgolint is built on typescript-go ([docs](https://oxc.rs/docs/guide/usage/linter/type-aware.html), [tsgolint](https://github.com/oxc-project/tsgolint)).
- Tested: with this repo's `typescript ~6.0.2` and current tsconfigs, `oxlint` type-aware ran in about 1.2s and reported `no-floating-promises`, `no-misused-promises`, and `restrict-template-expressions`.
- Docs warn that some legacy tsconfig options (for example `baseUrl`) are unsupported ([docs](https://oxc.rs/docs/guide/usage/linter/type-aware.html)).
- `options.typeAware` is root-config only ([config docs](https://oxc.rs/docs/guide/usage/linter/config.html)).
- Biome: `noFloatingPromises` and `noMisusedPromises` are nursery rules in the `types` domain, which must be enabled ([domains](https://biomejs.dev/linter/domains/)).
- Tested: Biome flagged `noFloatingPromises` in `App.tsx` but not the `no-misused-promises` case that oxlint found (one sample, not a benchmark).
- typescript-eslint: full rule set, works with TS 6, but not TS 7 ([docs](https://typescript-eslint.io/users/dependency-versions/)).

## Formatting parity

- Biome claims 97% Prettier compatibility ([site](https://biomejs.dev/)), with documented differences ([docs](https://biomejs.dev/formatter/differences-with-prettier/)).
- Biome formats JS, TS, JSX, JSON, CSS, HTML (experimental); Markdown is in progress ([language support](https://biomejs.dev/internals/language-support/)).
- Oxfmt passes 100% of Prettier's JS and TS conformance tests per the maintainers, with a few remaining inconsistencies reported upstream ([beta post](https://oxc.rs/blog/2026-02-24-oxfmt-beta)).
- Oxfmt is compatible with Prettier 3.9.9 "for many configurations" and diverges deliberately in places ([migration guide](https://oxc.rs/docs/guide/usage/formatter/migrate-from-prettier.html)).
- Oxfmt handles CSS, JSON, Markdown, YAML and more ([formatter docs](https://oxc.rs/docs/guide/usage/formatter.html)).
- Defaults differ from Prettier: `printWidth` 100, `trailingComma` all, `sortPackageJson` on ([config docs](https://oxc.rs/docs/guide/usage/formatter/config.html)).
- Tested: oxfmt formatted `app.css`, `package.json`, and the tsconfigs without errors.

## snake_case filenames

- Oxlint: `"unicorn/filename-case": ["error", { "case": "snakeCase" }]` with the `unicorn` plugin ([rule](https://oxc.rs/docs/guide/usage/linter/rules/unicorn/filename-case.html)).
- It has an `ignore` regex list, and exempts `index.*` files ([rule](https://oxc.rs/docs/guide/usage/linter/rules/unicorn/filename-case.html)).
- Tested: it flagged `App.tsx`, `Board.tsx`, `DiceMat.tsx`, `PixelSelect.tsx` and suggested the snake_case names; `vite.config.ts`, `main.tsx` and `api.d.ts` pass as is.
- Biome: `useFilenamingConvention` with `filenameCases: ["snake_case"]`, exceptions via `overrides` ([rule](https://biomejs.dev/linter/rules/use-filenaming-convention/)).
- Tested: Biome flagged the same four files.
- ESLint: `unicorn/filename-case` supports `case: "snakeCase"` ([docs](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/filename-case.md)), unicorn 78.0.0 needs ESLint >=10.4 ([npm](https://www.npmjs.com/package/eslint-plugin-unicorn)).
- Alternative: `eslint-plugin-check-file` 3.3.2 ([npm](https://www.npmjs.com/package/eslint-plugin-check-file)).
- Exceptions: use `ignorePatterns` in `.oxlintrc.json` or `overrides` with `"unicorn/filename-case": "off"`.

## VS Code

- Oxc: one extension `oxc.oxc-vscode` covers lint and format ([linter editors](https://oxc.rs/docs/guide/usage/linter/editors.html), [formatter editors](https://oxc.rs/docs/guide/usage/formatter/editors.html)).
- Settings: `"editor.defaultFormatter": "oxc.oxc-vscode"`, `"editor.formatOnSave": true`, and `"source.fixAll.oxc": "always"` under `editor.codeActionsOnSave`.
- Type-aware in the editor follows the root config or `oxc.typeAware`, and needs `oxlint-tsgolint` installed.
- Biome: extension `biomejs.biome`, fix on save is `source.fixAll.biome` ([docs](https://biomejs.dev/reference/vscode/)).
- ESLint and Prettier: two extensions (`dbaeumer.vscode-eslint`, `esbenp.prettier-vscode`), unverified against docs here.

## pre-commit and CI

- pre-commit passes staged file paths relative to the repo root, so hooks need `files: ^apps/web/` and a path-aware entry (standard pre-commit behavior, tested below).
- Biome documents a local hook: `biome check --write --files-ignore-unknown=true --no-errors-on-unmatched` with `language: system` ([git hooks](https://biomejs.dev/recipes/git-hooks/)).
- Biome from the repo root needs `--config-path=apps/web` or a root `biome.json`; my attempt hit a "nested root configuration" error, so unverified.
- Oxfmt finds the nearest config per file, so repo-root invocation just works ([config docs](https://oxc.rs/docs/guide/usage/formatter/config.html)).
- Tested: `oxfmt --check web/src/...` from the parent directory (mimicking a repo-root hook) honored the nested `.oxfmtrc.json` `ignorePatterns`.
- Oxlint: auto-discovery plus a nested config holding `typeAware` fails ("only supported in the root config"), so pass `-c apps/web/.oxlintrc.json`, which disables nested lookup ([config docs](https://oxc.rs/docs/guide/usage/linter/config.html)).
- Tested: `oxlint -c web/.oxlintrc.json web/src/main.tsx` from the parent dir works, type-aware included, and `ignorePatterns` apply to explicitly passed paths.
- Type-aware caveat: the rules need project type info ([docs](https://oxc.rs/docs/guide/usage/linter/type-aware.html)); passing a file subset still produced type-aware findings in my test, but whether cross-file context is always complete is unverified.
- Prettier: `--ignore-unknown` skips unsupported types, `--check` for CI ([CLI](https://prettier.io/docs/cli)).
- ESLint 10 looks up `eslint.config.*` from each linted file's directory ([release post](https://eslint.org/blog/2026/02/eslint-v10.0.0-released/)).

## CI speed

- Oxlint claims 50 to 100 times faster than ESLint ([docs](https://oxc.rs/docs/guide/usage/linter.html)).
- Oxfmt benchmark (Prettier 3.9.10, Biome 2.5.15, Oxfmt 0.73.0): Outline repo 19.4s Prettier, 1.24s Biome, 0.37s Oxfmt ([bench-formatter](https://github.com/oxc-project/bench-formatter)).
- Biome claims about 35x faster than Prettier on 171k lines ([site](https://biomejs.dev/)).
- Reality check: this app has about 9 files, oxfmt checked 17 files in about 120ms and type-aware oxlint took about 1.2s wall time here.
- Speed is not a deciding factor at this size, ESLint plus typescript-eslint would still finish in seconds (not measured).

## Config size

- Biome: one `biome.json`, about 25 lines for the rules below.
- Oxc: `.oxlintrc.json` (about 20 lines) and `.oxfmtrc.json` (about 5 lines).
- ESLint: `eslint.config.js` (about 40 lines with `tseslint.config`, react-hooks, react-refresh, unicorn, globals), plus `.prettierrc` and `.prettierignore`.
- devDependencies: Biome 1; oxlint + oxfmt + oxlint-tsgolint 3; oxlint + Prettier + tsgolint 3; ESLint stack about 8 (`eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-plugin-unicorn`, `globals`, `prettier`).

## Migration paths from the current config

- Biome: `biome migrate eslint --write` and `biome migrate prettier --write` ([guide](https://biomejs.dev/guides/migrate-eslint-prettier/)), but there is no oxlint importer, so port rules by hand.
- Oxc to oxfmt: `oxfmt --migrate prettier` reads Prettier config and `.prettierignore` ([guide](https://oxc.rs/docs/guide/usage/formatter/migrate-from-prettier.html)).
- ESLint to oxlint: `@oxlint/migrate` ([docs](https://oxc.rs/docs/guide/usage/linter.html)).
- From the current oxlint setup, option 2 needs no linter migration, only extra rules.

## Recommendation

Go with oxlint + oxfmt.

- Quality: React Compiler rules and type-aware rules come from the same binary, and the type-aware run caught real issues in the existing code.
- Simplicity: the Ruff-like shape, two fast native tools, one VS Code extension, no plugin graph.
- Robustness: the linter is already in use, and tsgolint is described as stable.
- Maintainability: ESLint's peer-dep matrix (`typescript <6.1`, unicorn needs ESLint 10.4) is exactly the churn this avoids.
- Why not Biome: type-aware rules are nursery, only one compiler rule, and it missed `no-misused-promises` in my test.
- Why not Prettier: it is the safe choice, but costs a Node-only tool and a second config dialect; revisit only if oxfmt output churns.

## Migration steps

1. Rename files with `git mv` (macOS is case-insensitive, so go through a temp name) and fix imports.
2. Install: `npm i -D oxlint@latest oxfmt@latest oxlint-tsgolint@latest` in `apps/web`.
3. Replace `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc", "unicorn"],
  "options": { "typeAware": true },
  "categories": { "correctness": "error" },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/exhaustive-deps": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }],
    "typescript/no-floating-promises": "error",
    "typescript/no-misused-promises": "error",
    "unicorn/filename-case": ["error", { "case": "snakeCase" }]
  },
  "ignorePatterns": ["src/lib/api.d.ts"]
}
```

4. Add `.oxfmtrc.json`:

```json
{ "ignorePatterns": ["src/lib/api.d.ts", "package-lock.json"] }
```

5. Scripts in `apps/web/package.json`:

```json
"check": "tsc -b && oxlint && oxfmt --check",
"fix": "oxlint --fix && oxfmt"
```

6. Fix the 3 type-aware findings (`app.tsx:142`, `app.tsx:189`, `format.ts:6`), then run `npm run fix` once and commit the reformat alone.
7. Add to `.pre-commit-config.yaml`:

```yaml
  - repo: local
    hooks:
      - id: oxlint
        name: oxlint
        entry: npm --prefix apps/web exec -- oxlint -c apps/web/.oxlintrc.json --fix
        language: system
        files: ^apps/web/.*\.(ts|tsx|js|jsx)$
      - id: oxfmt
        name: oxfmt
        entry: npm --prefix apps/web exec -- oxfmt
        language: system
        files: ^apps/web/.*\.(ts|tsx|js|jsx|json|css|md)$
```

8. Add a CI job (the repo has no web job yet):

```yaml
  web:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: apps/web } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: npm, cache-dependency-path: apps/web/package-lock.json }
      - run: npm ci
      - run: npm run check
```

9. VS Code `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "oxc.oxc-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": { "source.fixAll.oxc": "always" }
}
```

## Open questions and caveats

- Oxfmt is beta, so pin the version in the lockfile and expect small output changes between releases.
- Docs say tsgolint needs TypeScript 7, it worked here with TS 6.0, so unverified as a supported combination; consider moving to TS 7 and keeping `tsc -b` as the type check (or try `--type-check`, experimental).
- Verified: `npm --prefix apps/web exec -- <bin> apps/web/...` resolves the binary from `apps/web/node_modules` but keeps the repo root as cwd, so pre-commit's root-relative paths stay valid (no real pre-commit session run yet).
- `check-pre-commit.yml` runs pre-commit in CI, so it needs `setup-node` plus `npm ci` in `apps/web` once these local hooks land.
- Hook args: `oxlint --fix` with `-c` in a hook modifies files, pre-commit then fails the commit once so you restage, which is normal.
- Oxfmt Markdown and CSS divergences are documented per language, unverified beyond the CSS file here.
- ESLint plus Prettier ecosystem coverage (editor IDs, flat config details) was not fully verified.
- Biome root-config error from the repo root was unresolved, so Biome hook paths are unverified.

## Sources

- [Oxlint npm](https://www.npmjs.com/package/oxlint)
- [Oxfmt npm](https://www.npmjs.com/package/oxfmt)
- [Oxc releases](https://github.com/oxc-project/oxc/releases)
- [Oxfmt beta post](https://oxc.rs/blog/2026-02-24-oxfmt-beta)
- [Type-aware stable post](https://oxc.rs/blog/2026-07-22-type-aware-linting-stable)
- [React Compiler support post](https://oxc.rs/blog/2026-08-18-react-compiler-support)
- [Type-aware docs](https://oxc.rs/docs/guide/usage/linter/type-aware.html)
- [Oxlint config docs](https://oxc.rs/docs/guide/usage/linter/config.html)
- [Oxlint rules](https://oxc.rs/docs/guide/usage/linter/rules.html)
- [Oxlint JS plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html)
- [Oxfmt config](https://oxc.rs/docs/guide/usage/formatter/config.html)
- [Oxfmt migration](https://oxc.rs/docs/guide/usage/formatter/migrate-from-prettier.html)
- [bench-formatter](https://github.com/oxc-project/bench-formatter)
- [tsgolint](https://github.com/oxc-project/tsgolint)
- [Biome site](https://biomejs.dev/)
- [Biome domains](https://biomejs.dev/linter/domains/)
- [Biome git hooks](https://biomejs.dev/recipes/git-hooks/)
- [Biome migration](https://biomejs.dev/guides/migrate-eslint-prettier/)
- [Biome VS Code](https://biomejs.dev/reference/vscode/)
- [ESLint v10 post](https://eslint.org/blog/2026/02/eslint-v10.0.0-released/)
- [typescript-eslint versions](https://typescript-eslint.io/users/dependency-versions/)
- [React hooks plugin](https://react.dev/reference/eslint-plugin-react-hooks)
- [eslint-plugin-react-refresh](https://github.com/ArnaudBarre/eslint-plugin-react-refresh)
- [unicorn filename-case](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/filename-case.md)
- [Prettier CLI](https://prettier.io/docs/cli)
