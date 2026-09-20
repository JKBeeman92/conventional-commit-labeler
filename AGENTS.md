# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this is

A GitHub Action (`action.yml`) that labels PRs by parsing their title as a [Conventional Commit](https://www.conventionalcommits.org/). Single-file logic in `index.js`; bundled to `dist/index.js` for distribution (GitHub Actions runs `dist/index.js` directly — it does not run `npm install`).

## Commands

```bash
npm ci             # install exact locked deps
npm test           # node --test — runs index.test.js
npm run build      # ncc build index.js -o dist  (regenerates dist/index.js)
npm audit          # should report 0 vulnerabilities; investigate before ignoring anything here
```

**Any change to `index.js` requires `npm run build` and committing the resulting `dist/index.js` in the same commit.** CI (`dist-up-to-date` job in `.github/workflows/ci.yml`) fails the build if `dist/` doesn't match a fresh build — don't try to work around this by hand-editing `dist/index.js`.

## Architecture

- `index.js` — all logic. `run()` is the action entry point, gated behind `if (require.main === module)` so it only executes when the file is run directly (i.e., by the Actions runtime), not when required by tests.
- Pure functions (`buildLabelMap`, `matchLabels`, `computeStaleLabels`) are exported and exercised directly in `index.test.js` — prefer extending these over adding logic inline in `run()`, since `run()` itself isn't unit tested (it's thin I/O glue around `@actions/core` / `@actions/github`, not tested).
- `dist/index.js` is a generated, committed build artifact (via `@vercel/ncc`). Never hand-edit it. `node_modules/` is gitignored and not committed — this is why bundling exists at all: the action needs its dependencies inlined into one file since there's no install step at run time.

## Dependency constraints — read before bumping

`@actions/core` and `@actions/github` moved to **ESM-only** distributions starting at `@actions/core@3.x` and `@actions/github@9.x` (no `require()` entry point). This repo is CommonJS (`index.js` uses `require`/`module.exports`) and stays pinned below those majors:

- `@actions/core`: `^2.0.3` max within the 2.x line (2.x is the last CJS-compatible major; the underlying `undici` ReDoS/WebSocket advisories are already resolved as of 2.0.3 — verify with `npm audit` before assuming a newer patch is required)
- `@actions/github`: `^8.0.1` max within the 8.x line (9.x+ is ESM-only)

Before bumping either past these majors, either confirm a CJS build has returned, or convert the whole project to ESM (rename to `.mjs` / add `"type": "module"`, update `action.yml`'s `main`, re-verify `require.main === module` becomes `import.meta.url` checks, rebuild with ncc, rerun the full test suite) — don't do this halfway.

## Branching, versioning, releases

Full detail in [CONTRIBUTING.md](CONTRIBUTING.md). Summary: `feature/*` → `develop` → (promotion PR) → `main` → (release-please PR) → tagged release. Version bumps and CHANGELOG entries are derived automatically from Conventional Commit PR titles — never hand-edit `version` in `package.json` or write CHANGELOG entries manually.

## PR titles matter functionally, not just cosmetically

This repo's own action labels PRs by title, and the release automation (release-please) also parses PR titles for version bumps. A malformed title here breaks both.
