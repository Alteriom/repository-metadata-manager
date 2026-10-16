---
verified_at: 2026-10-15
verified_commit: d5daf2275e14b98526f8b4b61ac7bda226efa9da
---

# Architecture — the engine, its three interfaces, and who consumes it

Version 3 is a policy evaluator and controlled-remediation engine: observe, plan, approve, apply, verify ([README.md](../../../README.md), "Stable automation contracts").

- **Policy**: `lib/policy/Policy.js` validates and resolves `.repo-manager.json` (this repository's own policy is `.repo-manager.json`; the schema is [docs/guides/POLICY.md](../../../docs/guides/POLICY.md)).
- **Engine**: `lib/engine/Context.js` builds the repository context (local files, and GitHub when a token is in the environment, `lib/engine/Context.js:23-44`); `lib/engine/Engine.js` runs the checkers; `lib/engine/Report.js` scores them, leaving not-applicable checkers out of the weighted score (`lib/engine/Report.js:15`); `lib/engine/Cache.js`.
- **Checkers**: `lib/checkers/*.js`, one per area (security, documentation, cicd, dependencies, branch-protection, license, repository-metadata, iot), each a subclass of `lib/engine/Checker.js`; a finding is fixable only when its id is in the checker's `fixableFindingIds` and the checker implements `plan()` (`lib/engine/Checker.js:4-38`).
- **Control**: `lib/control/Planner.js` (deterministic plans), `lib/control/Executor.js` (preview or approved apply), `lib/control/Inventory.js` (local or organisation inventory).
- **Interfaces**: the CLI `bin/repo-manager.js` (`check` alias `evaluate`, `plan`, `apply`, `fix`, `verify`, `inventory`, `config`); the MCP server `mcp-server/index.js` (`repo-manager-mcp`, [mcp-server/README.md](../../../mcp-server/README.md)); the GitHub Action `action.yml`; the library `index.js` ([docs/development/API.md](../../../docs/development/API.md)).
- **Consumers**: other Alteriom repositories run `repo-manager` from the npm package in a "Repository Metadata Compliance" job; Alteriom/alteriom-docker-images, for one, pins `^2.1.0` in its `package.json`, so a 3.x release does not reach it until that range moves. The command-center integration is [docs/COMMAND_CENTER.md](../../../docs/COMMAND_CENTER.md).
- **Planning documents**: `docs/superpowers/specs/2026-03-27-core-engine-rewrite-design.md` and `docs/superpowers/plans/2026-03-27-core-engine-rewrite.md` record the v2 rewrite (March 2026), before the v3 control layer.
