# Repository Metadata Manager v2.0

[![npm version](https://img.shields.io/npm/v/@alteriom/repository-metadata-manager.svg)](https://www.npmjs.com/package/@alteriom/repository-metadata-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

A modular repository health and compliance analysis tool. Runs offline against any local repository -- no GitHub token required for core checks. Extensible via a checker plugin architecture.

## Installation

```bash
npm install -g @alteriom/repository-metadata-manager
```

Or as a dev dependency:

```bash
npm install --save-dev @alteriom/repository-metadata-manager
```

## Quick Start

```bash
# Run health checks on the current repository
repo-manager check

# Output as JSON (for CI pipelines)
repo-manager check --format json

# Auto-fix detected issues (dry run)
repo-manager fix --dry-run

# Apply fixes
repo-manager fix

# Show loaded configuration
repo-manager config
```

## CLI Commands

### `repo-manager check`

Run all health checkers and display a scored report.

| Flag | Description |
|------|-------------|
| `-o, --only <checkers>` | Comma-separated list of checkers to run |
| `-f, --format <format>` | Output format: `cli` (default) or `json` |
| `--project <path>` | Path to repository root (default: cwd) |

```bash
repo-manager check --only documentation,security
repo-manager check --format json --project /path/to/repo
```

### `repo-manager fix`

Auto-fix issues that have fixable remediation.

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview what would be fixed without writing |
| `--project <path>` | Path to repository root (default: cwd) |

### `repo-manager config`

Display the resolved configuration and detected project type.

## Programmatic API

```javascript
const { Engine } = require('@alteriom/repository-metadata-manager');

const engine = new Engine({ projectRoot: '/path/to/repo' });

// Run checks
const report = await engine.run();
console.log(report.score, report.grade);

// Run specific checkers
const partial = await engine.run(['documentation', 'security']);

// Fix issues
const { report: r, fixes } = await engine.fix({ dryRun: false });
```

### Custom Checkers

```javascript
const { Checker } = require('@alteriom/repository-metadata-manager');

class MyChecker extends Checker {
  constructor() {
    super({ name: 'my-check', version: '1.0.0', description: 'Custom check', defaultWeight: 10 });
  }

  async check(context) {
    const findings = [];
    if (!context.fileExists('CODEOWNERS')) {
      findings.push({
        id: 'missing-codeowners',
        severity: 'medium',
        message: 'No CODEOWNERS file',
        fixable: false,
        fix: null,
      });
    }
    return this.createResult(findings.length === 0 ? 100 : 60, findings);
  }
}

const engine = new Engine({ projectRoot: '.' });
engine.register(new MyChecker());
const report = await engine.run();
```

## Configuration

Create `.repo-manager.json` in your repository root:

```json
{
  "checkers": {
    "documentation": { "weight": 30 },
    "security": { "weight": 25 },
    "cicd": { "weight": 20 },
    "dependencies": { "weight": 15 },
    "branch-protection": { "weight": 10 },
    "iot": { "enabled": false }
  },
  "thresholds": {
    "fail": 50
  }
}
```

## Built-in Checkers

| Checker | Description |
|---------|-------------|
| `documentation` | Checks for README, CHANGELOG, CONTRIBUTING, LICENSE, SECURITY.md |
| `security` | npm audit, .env exposure, SECURITY.md policy, secrets scanning |
| `cicd` | GitHub Actions workflows, test/lint/build steps, workflow quality |
| `dependencies` | Lock file presence, outdated deps, dependency count |
| `branch-protection` | CODEOWNERS, protected branch config, review requirements |
| `iot` | PlatformIO config, firmware structure (auto-skips non-IoT projects) |

## MCP Server

An MCP server is included for integration with AI assistants (Claude, GitHub Copilot).

```bash
cd mcp-server && npm install
node mcp-server/index.js
```

Exposes three tools: `check`, `fix`, and `findings`. See `mcp-server/` for details.

## CI Integration

```yaml
name: Health Check
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm install
      - run: npx repo-manager check --format json
```

## License

MIT
