# PR Conventional Commit Labeler

Automatically labels pull requests based on their [Conventional Commits](https://www.conventionalcommits.org/) title. Supports multi-label PRs, stale-label cleanup, auto-creating missing labels, and full override/extension of the default label map.

## Features

- ✅ **All standard types covered out of the box** — no configuration required
- ✅ **Multiple labels per PR** — a PR can match more than one type
- ✅ **Stale label removal** — when a PR title changes, old labels are cleaned up automatically
- ✅ **Auto-creates missing labels** — labels are created in the repo if they don't exist yet
- ✅ **Override or extend defaults** — supply only the keys you want to change
- ✅ **Case-insensitive matching** — `FEAT:`, `Feat:`, and `feat:` all match
- ✅ **Breaking-change suffix** — `feat!:` and `feat!(scope):` are supported

## Default Label Map

The following conventional commit types are handled automatically with no configuration:

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

## Inputs

### `token` *(required)*

The `GITHUB_TOKEN` secret used to read and label the PR.

### `label_map` *(optional)*

A JSON object to **override or extend** the built-in defaults. You only need to supply the keys you want to change — the rest of the defaults remain active.

| Usage | Example |
|-------|---------|
| Use all defaults (no config needed) | *(omit `label_map` or pass `{}`)* |
| Override a default label name | `'{"feat": "Enhancement"}'` |
| Add a custom commit type | `'{"security": "Security Fix"}'` |
| Fully replace all defaults | `'{"feat": "Feature", "fix": "Bugfix"}'` *(only these two active)* |

## Example Usage

### Minimal — use all defaults

```yaml
- name: Label PR
  uses: JKBeeman92/conventional-commit-labeler@v2.0.0
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
```

### Override one label name

```yaml
- name: Label PR
  uses: JKBeeman92/conventional-commit-labeler@v2.0.0
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    label_map: '{"feat": "Enhancement"}'
```

### Add a custom type alongside defaults

```yaml
- name: Label PR
  uses: JKBeeman92/conventional-commit-labeler@v2.0.0
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    label_map: '{"security": "Security Fix", "deps": "Dependencies"}'
```

### Full custom map (replaces all defaults)

```yaml
- name: Label PR
  uses: JKBeeman92/conventional-commit-labeler@v2.0.0
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    label_map: '{"feat": "Feature", "fix": "Bugfix", "docs": "Documentation"}'
```

## PR Title Format

Titles follow the [Conventional Commits](https://www.conventionalcommits.org/) spec:

```
type: short description
type(scope): short description
type!: breaking change
type!(scope): breaking change with scope
```

**Examples that get labeled:**
- `feat: add dark mode` → **Feature**
- `fix(auth): resolve token expiry` → **Bugfix**
- `feat!: redesign API` → **Feature**
- `docs: update README` → **Documentation**

## Migrating from v1

- The `token` and `label_map` inputs are unchanged.
- `label_map` now **merges with defaults** instead of replacing them entirely. If you previously passed a full map, behaviour is identical. If you passed a partial map, you will now also get the default labels for unspecified types — remove any you don't want by specifying them explicitly with an empty string value, or pass a complete replacement map.
- The action now adds **all** matching labels (v1 only added the first match).
- Stale labels are removed automatically when a PR title changes.
