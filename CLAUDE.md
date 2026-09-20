# CLAUDE.md

This project's agent guidance lives in [AGENTS.md](AGENTS.md) — read that first for commands, architecture, dependency constraints, and branching/versioning/release conventions. Everything there applies here without restatement.

Claude Code-specific notes:

- Follow the standard commit workflow in [CONTRIBUTING.md](CONTRIBUTING.md): branch from `develop`, not `main`, unless doing a release promotion or hotfix.
- When asked to "fix a bug" or "add a feature" here, that's almost always a two-file change: `index.js` and `index.test.js`. Don't consider the change complete without a corresponding test.
- Don't add new runtime dependencies without checking whether they're ESM-only first (see AGENTS.md's dependency constraints section) — an ESM-only transitive dependency breaks the build the same way it would break `@actions/core`/`@actions/github`.
