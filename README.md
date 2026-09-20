# PR Conventional Commit Labeler

[![CI](https://github.com/JKBeeman92/conventional-commit-labeler/actions/workflows/ci.yml/badge.svg)](https://github.com/JKBeeman92/conventional-commit-labeler/actions/workflows/ci.yml)
[![Marketplace](https://img.shields.io/badge/marketplace-pr--conventional--commit--labeler-blue?logo=github)](https://github.com/marketplace/actions/pr-conventional-commit-labeler)

A GitHub Action that labels pull requests by parsing their title as a [Conventional Commit](https://www.conventionalcommits.org/) — no config required, but fully overridable if you want different label names or extra types.

```yaml
- uses: JKBeeman92/conventional-commit-labeler@v3
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
```

That's the whole setup. `feat: add dark mode` gets labeled **Feature**, `fix(auth): resolve token expiry` gets labeled **Bugfix**, and so on for all 11 standard Conventional Commit types.

## Contents

- [Why](#why)
- [Quick start](#quick-start)
- [How it works](#how-it-works)
- [Inputs](#inputs)
- [Recipes](#recipes)
- [Default label map](#default-label-map)
- [Versioning \/ which tag to pin](#versioning--which-tag-to-pin)
- [Development](#development)
- [Migrating](#migrating)

## Why

Conventional Commit titles are only useful if something *acts* on them. This action is that something: it turns a well-formed PR title into a visible, filterable label, keeps that label in sync as the title changes, and needs no maintenance once it's wired up — no label list to keep updating by hand, no PR template checkbox to remember.

## Quick start

1. Add a workflow file, e.g. `.github/workflows/label.yml`:

   ```yaml
   name: Label PR

   on:
     pull_request:
       types: [opened, edited, synchronize]

   permissions:
     pull-requests: write

   jobs:
     label:
       runs-on: ubuntu-latest
       steps:
         - uses: JKBeeman92/conventional-commit-labeler@v3
           with:
             token: ${{ secrets.GITHUB_TOKEN }}
   ```

2. Open a PR titled `feat: add dark mode`. It gets labeled **Feature**. Retitle it to `fix: ...` and the **Feature** label is removed, **Bugfix** is added.

`permissions: pull-requests: write` is required — the default `GITHUB_TOKEN` permissions on many org/repo settings are read-only, and this action reads and writes labels.

## How it works

On every run, the action:

1. Reads the PR's current title and existing labels.
2. Matches the title against each configured type using `^type!?(\(scope\))?:.*$`, case-insensitively — so `type: ...`, `type(scope): ...`, `type!: ...`, and `type!(scope): ...` (breaking change) all match, and a PR title can match more than one type if you've configured overlapping keys.
3. Removes any label it manages that no longer matches (so retitling a PR cleans up the old label — it never leaves stale labels behind).
4. Creates any matching label that doesn't yet exist in the repo (default color `#ededed`).
5. Adds whatever's missing. Already-correct labels are left untouched — safe to run on every PR event without spamming label-changed notifications.

It only ever touches labels it manages (the values in your effective `label_map`) — it won't remove labels you or another action added manually.

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `token` | Yes | — | A token with `pull-requests: write` — typically `${{ secrets.GITHUB_TOKEN }}`. |
| `label_map` | No | `{}` | A JSON object that **merges into** the built-in defaults below. Pass only the keys you want to change or add — everything else keeps its default. |

## Recipes

<details>
<summary>Rename one label</summary>

```yaml
    with:
      token: ${{ secrets.GITHUB_TOKEN }}
      label_map: '{"feat": "Enhancement"}'
```

`feat` PRs get **Enhancement** instead of **Feature**; every other default (`fix` → Bugfix, etc.) is unchanged.
</details>

<details>
<summary>Add a custom commit type</summary>

```yaml
    with:
      token: ${{ secrets.GITHUB_TOKEN }}
      label_map: '{"security": "Security Fix", "deps": "Dependencies"}'
```

`security: ...` and `deps: ...` PR titles now get labeled too, alongside all 11 standard types.
</details>

<details>
<summary>Replace the defaults entirely</summary>

```yaml
    with:
      token: ${{ secrets.GITHUB_TOKEN }}
      label_map: '{"feat": "Feature", "fix": "Bugfix", "docs": "Documentation"}'
```

Only the keys you list are active — any standard type you leave out (e.g. `chore`, `refactor`) simply won't be labeled. This is the same object as above, just enumerating every key instead of a subset — there's no separate "replace mode" to opt into.
</details>

## Default label map

Handled automatically, no configuration needed:

| Commit prefix | Label applied  |
|---------------|---------------|
| `feat`        | Feature       |
| `fix`         | Bugfix        |
| `docs`        | Documentation |
| `chore`       | Chore         |
| `refactor`    | Refactor      |
| `test`        | Test          |
| `style`       | Style         |
| `ci`          | CI            |
| `perf`        | Performance   |
| `build`       | Build         |
| `revert`      | Revert        |

PR titles follow the [Conventional Commits](https://www.conventionalcommits.org/) spec:

```
type: short description
type(scope): short description
type!: breaking change
type!(scope): breaking change with scope
```

## Versioning / which tag to pin

- **`@v3`** (recommended) — a rolling tag that always points at the latest `3.x.y` release. Automated: you get fixes and non-breaking improvements without touching your workflow file.
- **`@v3.0.0`** (or any exact tag) — pinned to one immutable release. Use this if you need full reproducibility and want to control upgrades explicitly.

Releases and version numbers are generated automatically from PR titles here (see [CONTRIBUTING.md](CONTRIBUTING.md#versioning)) — a `fix:` merge bumps the patch version, `feat:` bumps minor, anything with `!` bumps major.

## Development

```bash
npm ci
npm test          # runs index.test.js via node --test
npm run build     # regenerates dist/index.js (required after any index.js change — commit the result)
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the branching model, versioning policy, and release process.

## Migrating

### From v2 to v3

v3 is a packaging change, not a behavior change — `token`, `label_map`, and the label-matching logic all work exactly as they did in v2.

- The action is now distributed as a bundled `dist/index.js` instead of raw `index.js` + a committed `node_modules`. If you consume this action normally (`uses: JKBeeman92/conventional-commit-labeler@v3`), there is nothing to change.
- Only affects you if you were vendoring `index.js` directly or referencing it by path rather than using the action via `uses:` — in that case, point at `dist/index.js` instead.

### From v1 to v2+

- `token` and `label_map` inputs are unchanged.
- `label_map` now **merges with defaults** instead of replacing them entirely. If you previously passed a full map, behavior is identical. If you passed a partial map, you'll now also get default labels for the types you didn't mention — remove any you don't want by passing a complete replacement map instead.
- The action now adds **all** matching labels (v1 only added the first match).
- Stale labels are removed automatically when a PR title changes.
