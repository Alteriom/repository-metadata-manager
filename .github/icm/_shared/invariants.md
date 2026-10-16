---
verified_at: 2026-10-15
verified_commit: d5daf2275e14b98526f8b4b61ac7bda226efa9da
---

# Invariants — the trust boundaries a change must not weaken

Each line names the code that enforces it. A change that touches one of these files changes a trust boundary: it needs tests for policy validation, path containment, stale state and authorization.

- **Evaluation and planning never write.** `check`, `inventory` and `plan` only read; writes happen only in `lib/control/Executor.js`.
- **Apply previews unless approved.** `dryRun` defaults to true, and a real apply without `approved` throws (`lib/control/Executor.js:59-68`); the CLI needs `--approve` (`bin/repo-manager.js`, `apply`); `fix` previews by default ([README.md](../../../README.md), "Usage").
- **Every write stays inside the project root.** The plan's root must equal the target root; each path is resolved inside it and symlink traversal is refused (`lib/control/Executor.js:61-72`).
- **Stale plans are rejected.** Each operation carries the SHA-256 of the file it was planned against; a mismatch throws before any write (`lib/control/Executor.js:73-77`).
- **Tokens come from the environment only.** `GITHUB_TOKEN` is read from `process.env` (`bin/repo-manager.js:190-217`, `mcp-server/index.js:69`), never from an argument or a tool input, and never logged.
- **MCP is read-only unless its process enables apply.** `REPO_MANAGER_ENABLE_APPLY=true` in the server's environment, plus `approved: true` with the exact plan (`mcp-server/index.js:23`, `mcp-server/index.js:78`); project roots are confined to `REPO_MANAGER_ALLOWED_ROOTS` (`mcp-server/index.js:24-32`).
- **Configuration fails closed.** Unknown or malformed policy properties, a policy path outside the root and an unsupported schema version throw (`lib/policy/Policy.js:92-154`).
- **Only real plans are fixable**, and **not-applicable checkers stay visible but unscored** ([architecture.md](architecture.md)).
- **The compliance workflow evaluates candidates as data.** `pull_request_target` loads the workflow from `main`; candidate code runs only in a secret-free job under a supervised Jest runner (`scripts/run-trusted-tests.js`, `scripts/jest-*.js`); `test/workflows/configuration.test.js` and `test/workflows/trusted-runner.test.js` pin that design ([docs/COMMAND_CENTER.md](../../../docs/COMMAND_CENTER.md), "Trust model").
