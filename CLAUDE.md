# Repository Metadata Manager contributor context

This is the v3 policy and controlled-remediation engine.

## Architecture

```text
Context + Policy
      ↓
Engine → Checkers → Compliance Report
      ↓
Planner → reviewed plan → Executor → Audit record
      ↓
CLI / GitHub Action / MCP
```

## Safety invariants

- Evaluation and planning never mutate repository state.
- Apply defaults to preview and requires explicit approval for writes.
- Every write is relative to, and contained within, the selected project root.
- Apply rejects a plan when the target content has changed since planning.
- Tokens come from process environment or workload identity, never command/tool arguments.
- MCP is read-only unless its process enables the apply capability.
- Configuration errors fail closed.

## Commands

```bash
repo-manager check|evaluate
repo-manager inventory
repo-manager plan
repo-manager apply <plan> [--approve]
repo-manager verify
repo-manager config
```

Use Node.js 24 or newer. Run `npm run lint && npm test` before proposing changes.
