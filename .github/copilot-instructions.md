# Copilot instructions

Repository Metadata Manager v3 is a policy evaluator and controlled-remediation engine for Node.js 24+.

## Architecture

```text
lib/policy/Policy.js       validates and resolves policy
lib/engine/                builds context, runs checkers, aggregates reports
lib/checkers/              read-only repository and GitHub observations
lib/control/Planner.js     creates deterministic remediation plans
lib/control/Executor.js    previews or applies approved plans
lib/control/Inventory.js   normalizes local and organization inventory
bin/repo-manager.js        CLI
mcp-server/index.js        allowlisted MCP boundary
```

## Required invariants

- `check`, `inventory`, and `plan` are read-only.
- Writes require an exact plan plus explicit approval.
- All operation paths remain inside `projectRoot`.
- Apply verifies before-state hashes and rejects stale plans.
- Configuration failures are errors, not empty defaults.
- Tokens come from environment or workload identity, never arguments or logs.
- Only findings with a real `plan()` implementation may be marked fixable.
- Not-applicable checkers remain visible but do not affect weighted score.

## Development

```bash
npm ci
npm run lint
npm test
npm run test:coverage
npm pack --dry-run
```

Add tests for policy validation, path containment, stale state, and authorization whenever changing a trust boundary.
