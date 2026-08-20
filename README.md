# Repository Metadata Manager v3

[![npm version](https://img.shields.io/npm/v/@alteriom/repository-metadata-manager.svg)](https://www.npmjs.com/package/@alteriom/repository-metadata-manager)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

A policy-driven repository compliance evaluator and controlled-remediation layer for GitHub command-center automation.

Version 3 separates observation, planning, approval, execution, and verification. Evaluation is read-only. A remediation is applied only from an exact plan, against the repository state for which it was created, after explicit approval.

## Requirements

- Node.js 24 or newer
- `GITHUB_TOKEN` only when GitHub-hosted settings or organization inventory are required

Tokens are read from the environment. They are not accepted as CLI or MCP tool arguments.

## Installation

```bash
npm install --save-dev @alteriom/repository-metadata-manager
```

## Usage

```bash
# Evaluate the current repository and enforce policy gates
npx repo-manager check

# Machine-readable evaluation
npx repo-manager check --format json --output compliance-report.json

# Produce a deterministic plan without changing files
npx repo-manager plan --output remediation-plan.json

# Preview the exact plan (still read-only)
npx repo-manager apply remediation-plan.json

# Apply after reviewing it
npx repo-manager apply remediation-plan.json --approve --audit-log ../command-center-audit.jsonl

# Verify the repository after remediation
npx repo-manager verify --format github

# Inventory one local repository or a complete GitHub organization
npx repo-manager inventory
GITHUB_TOKEN=... npx repo-manager inventory --organization my-org --output inventory.json
```

`fix` remains as a compatibility command, but it previews by default. Use the explicit `plan` and `apply` workflow for automation.

## Policy

Place `.repo-manager.json` in the repository root. Configuration is validated and malformed or unknown policy properties fail closed.

```json
{
  "schemaVersion": 1,
  "id": "my-org/repository-baseline",
  "version": "1.0.0",
  "gates": {
    "failBelow": 70,
    "maxCritical": 0,
    "maxHigh": 0,
    "checkerMinimums": {
      "security": 70,
      "cicd": 70
    },
    "requireVerifiedCheckers": []
  },
  "branchProtection": {
    "requiredApprovals": 1,
    "requireStatusChecks": true,
    "requireStrictStatusChecks": true,
    "requireCodeOwnerReviews": true,
    "requireConversationResolution": true,
    "enforceAdmins": true,
    "requireSignedCommits": false,
    "requireLinearHistory": false
  }
}
```

See [Policy Guide](docs/guides/POLICY.md) for the complete schema and inheritance guidance.

## Built-in checks

| Checker | Evaluates |
| --- | --- |
| `security` | Recursive secret patterns, environment-file exposure, policy, Docker controls, npm audit |
| `documentation` | README quality, changelog, contributing guide, license, exported-code documentation |
| `cicd` | Workflows and composite Actions, triggers, permissions, tests, matrices, injection patterns |
| `dependencies` | Lock files, runtime declaration, direct dependency health, registry hygiene |
| `branch-protection` | Local review assets and effective default-branch settings from GitHub |
| `license` | License presence, SPDX metadata, content consistency, dependency conflicts |
| `repository-metadata` | GitHub description, topics, merge hygiene, and hosted security controls |
| `iot` | PlatformIO and firmware conventions; excluded from scoring when not applicable |

Scores summarize posture; policy gates determine pass or fail. A critical or high finding can fail a repository even when its weighted score is high.

## Stable automation contracts

Reports, plans, inventory, and audit records include `schemaVersion`, `kind`, repository identity, policy identity, and timestamps.

```text
inventory → evaluate → plan → approval → apply → verify → audit
```

Plans include pre-change hashes. Apply rejects stale plans and paths outside the repository root.

## GitHub Action

```yaml
- uses: Alteriom/repository-metadata-manager@v3
  with:
    format: github
    fail-below: 70
    only: security,cicd,branch-protection
```

The Action installs the code from its pinned Action revision, validates every input, and returns `score` and `grade` outputs.

## MCP server

The package installs `repo-manager-mcp`. It is read-only by default.

```json
{
  "mcpServers": {
    "repository-manager": {
      "command": "repo-manager-mcp",
      "env": {
        "REPO_MANAGER_ALLOWED_ROOTS": "/workspace/repos"
      }
    }
  }
}
```

To expose `apply`, the server process must explicitly set `REPO_MANAGER_ENABLE_APPLY=true`; the caller must also submit the exact plan with `approved: true`. See [MCP Server](mcp-server/README.md).

## Programmatic API

```javascript
const { Engine } = require('@alteriom/repository-metadata-manager');

const engine = new Engine({ projectRoot: '/workspace/repository' });
const report = await engine.run();
const plan = await engine.plan();

// Read-only preview
const preview = await engine.applyPlan(plan);

// Explicit controlled apply
const audit = await engine.applyPlan(plan, { approved: true, dryRun: false });
```

See [API Reference](docs/development/API.md) and [Command Center Integration](docs/COMMAND_CENTER.md).

## Development

```bash
npm ci
npm run lint
npm test
npm run test:coverage
npm pack --dry-run
```

## License

MIT
