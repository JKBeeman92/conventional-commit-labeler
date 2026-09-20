# Contributing

## Branching model

- **`main`** — always releasable. Every commit on `main` corresponds to a tagged release. Protected: no direct pushes, requires a passing CI run and one approval.
- **`develop`** — integration branch. Feature branches merge here first. `develop` is where changes soak before being promoted to `main` via a release PR.
- **`feature/<short-name>`** (or `fix/<short-name>`) — branched from `develop`, merged back into `develop` via PR. Delete after merge.

Promotion flow:

```
feature/x ──PR──▶ develop ──promotion PR──▶ main ──release-please PR──▶ tag ──▶ GitHub Release
```

Two distinct PRs move code from `develop` to a release:

1. **Promotion PR** (`develop` → `main`): opened by a maintainer, or via the `Promote develop to main` workflow (`.github/workflows/promote.yml`, manually triggered from the Actions tab). Requires review and green CI like any other PR.
2. **Release PR** (opened automatically by release-please against `main`): once the promotion PR lands on `main`, release-please computes the version bump and changelog from the Conventional Commit titles it finds and keeps a release PR up to date. Merging *that* PR is what actually tags the release.

Stale branches are pruned automatically — see [`.github/workflows/branch-pruning.yml`](.github/workflows/branch-pruning.yml): a branch with no commits for 60 days is tagged (`archive/<branch>-<date>`) and renamed under `archived/`; 30 days after that it's deleted outright. The tag is permanent, so history is never actually lost.

## Commit and PR title format

This repo's own action enforces its own convention on itself. PR titles (which are what actually get labeled and, via release-please, drive version bumps) must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type: short description
type(scope): short description
type!: breaking change
```

Supported types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`, `ci`, `perf`, `build`, `revert`.

## Versioning

This project follows [Semantic Versioning](https://semver.org/), derived mechanically from Conventional Commit types on `develop → main` release PRs:

| Commit type on develop | Version bump |
|---|---|
| `fix`, `perf` | patch (`2.0.0` → `2.0.1`) |
| `feat` | minor (`2.0.0` → `2.1.0`) |
| any type with `!` or a `BREAKING CHANGE:` footer | major (`2.0.0` → `3.0.0`) |
| `docs`, `chore`, `refactor`, `test`, `style`, `ci`, `build` | no release by itself |

Releases are cut and tagged automatically (see below) — do not hand-edit `version` in `package.json`.

Consumers of this action pin a **major version tag** (e.g. `uses: JKBeeman92/conventional-commit-labeler@v2`), which the release workflow moves to the latest release within that major line. Pin an exact tag (`@v2.1.0`) instead if you need reproducibility.

## Releasing

Releases are automated by [`release-please`](https://github.com/googleapis/release-please) (`.github/workflows/release-please.yml`), which watches `main`:

1. Once commits reach `main` (via a promotion PR from `develop`), release-please opens/updates a release PR on `main` with the version bump and CHANGELOG entry computed from Conventional Commit titles.
2. Merging that release PR tags the release, publishes a GitHub Release, and moves the rolling major-version tag (`v2`, `v3`, ...) to point at it.

No manual version bumping, tagging, or changelog editing.

## Before opening a PR

```
npm ci
npm test
npm run build   # if you touched index.js — commit the resulting dist/index.js
```

CI re-checks both `npm test` and that `dist/` matches a fresh build; a stale `dist/` fails the build.
