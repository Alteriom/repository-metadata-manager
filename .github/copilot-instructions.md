# Copilot instructions

The entry for this repository, for every agent, is [CLAUDE.md](../CLAUDE.md): what the repository is, where things live, and the route to take for what just happened. Each route names the stage contract to follow and the shared facts in [`.github/icm/_shared/`](icm/_shared/CONTEXT.md) to load. When this file and a file it points at disagree, the file pointed at is right.

What is specific to Copilot:

- **Trust boundaries.** Before suggesting a change in `lib/control/`, `lib/policy/`, `mcp-server/`, `bin/` or a workflow, read [invariants.md](icm/_shared/invariants.md); add tests for policy validation, path containment, stale state and authorization whenever a change touches one.
- **Checks.** `npm ci`, `npm run lint`, `npm test`, `npm run test:coverage`, `npm pack --dry-run` ([build-and-test.md](icm/_shared/build-and-test.md)); one test fails on `main` today ([gotchas.md](icm/_shared/gotchas.md)).
- **MCP for the coding agent.** `.github/copilot-mcp.json` starts this repository's own MCP server read-only (`REPO_MANAGER_ENABLE_APPLY` is `false`); keep it so.
