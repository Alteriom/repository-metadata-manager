# Core Engine Rewrite — Sub-project 1

**Date:** 2026-03-27
**Scope:** Replace the current feature manager architecture with a pluggable checker engine
**Breaking Change:** Yes — v2.0. New API, new CLI, new file structure.

---

## Goal

Redesign the repository-metadata-manager as a pluggable analysis engine where each check category is a self-contained checker with a standard interface. This replaces the current 13 feature manager files, eliminates the duplicate local scripts, and provides a foundation for deeper checks and new categories.

---

## Plugin Interface

Every checker implements one base class:

```javascript
const { Checker } = require('@alteriom/repository-metadata-manager');

class SecurityChecker extends Checker {
  constructor() {
    super({
      name: 'security',
      version: '2.0.0',
      description: 'Security vulnerability and policy checks',
      defaultWeight: 30,
    });
  }

  async check(context) {
    // Returns CheckResult
  }

  async fix(context, findings) {
    // Optional: auto-fix specific findings
    // Returns FixResult
  }
}
```

### Context Object

Provided by the engine to every checker:

```javascript
{
  projectRoot: '/path/to/repo',        // Always available
  projectType: 'node',                  // Auto-detected: node, python, iot, generic
  github: octokitClient || null,        // null if no token
  config: { weight: 30, ... },          // User overrides for this checker
  cache: SharedCache,                   // Shared across checkers for expensive ops
  packageJson: { ... } || null,         // Parsed package.json if exists
  gitInfo: { branch, remoteUrl, ... },  // Local git metadata
}
```

The `cache` prevents duplicate work — e.g., `npm audit` runs once even if both security and dependency checkers need it.

### CheckResult

Standard return type from every checker:

```javascript
{
  checker: 'security',
  score: 85,                           // 0-100, capped
  grade: 'B',                          // A(90+), B(80+), C(70+), D(50+), F(<50)
  findings: [
    {
      id: 'sec-001',
      severity: 'high',                // critical, high, medium, low, info
      message: 'Found .env file in repository',
      file: '.env',
      line: null,
      fixable: true,                   // Can auto-fix?
      fix: 'Add .env to .gitignore',   // Human-readable fix description
    }
  ],
  metadata: {                          // Checker-specific data
    vulnerabilities: 3,
    secretsFound: 0,
    policiesPresent: ['SECURITY.md'],
  },
  duration: 1234,                      // ms
}
```

### FixResult

Return type from the optional `fix()` method:

```javascript
{
  checker: 'security',
  applied: [
    { id: 'sec-001', action: 'Added .env to .gitignore', file: '.gitignore' }
  ],
  skipped: [
    { id: 'sec-005', reason: 'Requires manual review' }
  ],
}
```

---

## Engine Core

### Engine.js — Orchestrator

```javascript
const engine = new Engine({
  projectRoot: process.cwd(),
  token: process.env.GITHUB_TOKEN,     // Optional
  config: '.repo-manager.json',        // Optional config file path
});

const report = await engine.run();     // Run all enabled checkers
const report = await engine.run(['security', 'docs']); // Run specific checkers
const fixes = await engine.fix();      // Auto-fix all fixable findings
const fixes = await engine.fix({ dryRun: true }); // Preview fixes
```

The engine:
1. Builds the `Context` (auto-detect project type, init GitHub if available)
2. Loads checkers (built-in + any user-registered)
3. Runs enabled checkers in parallel
4. Aggregates into a `Report`

### Context.js — Project Context Builder

Detects:
- Project type from files on disk (package.json → node, requirements.txt → python, platformio.ini → iot)
- Git info from local `.git/` directory
- GitHub API availability
- Existing config file

### Report.js — Result Aggregation

Takes all CheckResults and produces:

```javascript
{
  score: 82,                           // Weighted average, capped at 100
  grade: 'B',
  timestamp: '2026-03-27T12:00:00Z',
  project: { name, type, path },
  checkers: {
    security: { score, grade, findings, metadata },
    documentation: { score, grade, findings, metadata },
    // ...
  },
  summary: {
    total_findings: 12,
    by_severity: { critical: 0, high: 2, medium: 5, low: 5 },
    fixable: 7,
  },
  recommendations: [
    'Add SECURITY.md with vulnerability reporting instructions',
    'Enable branch protection on main branch',
  ],
}
```

---

## Configuration

### .repo-manager.json

```json
{
  "checkers": {
    "security": { "weight": 30, "enabled": true },
    "documentation": { "weight": 25 },
    "cicd": { "weight": 20 },
    "branch-protection": { "weight": 15 },
    "dependencies": { "weight": 10 }
  },
  "thresholds": {
    "fail": 50,
    "warn": 70
  },
  "ignore": [
    "security:secret-detection:*.test.js",
    "documentation:missing-api-docs"
  ]
}
```

- Zero config works: engine uses defaults based on detected project type
- Weights must sum to 100 (engine normalizes if they don't)
- `ignore` uses `checker:finding-id:glob` pattern

---

## Built-in Checkers

### security.js
Migrated from SecurityManager + SecurityPolicyManager. Checks:
- `npm audit` / `pip audit` for real CVEs (not hardcoded list)
- Secret scanning of files (regex patterns for API keys, tokens, passwords)
- SECURITY.md presence and content
- .gitignore coverage (no .env, no credentials)
- Dependabot/Renovate configured
- Docker security (no `--privileged`, no root user)

### documentation.js
Migrated from DocumentationManager. Checks:
- README.md: required sections (description, install, usage, license), badges, length
- CHANGELOG.md: follows Keep a Changelog format
- CONTRIBUTING.md: exists with meaningful content
- API documentation: JSDoc/docstrings coverage
- LICENSE: exists and is valid SPDX

### cicd.js
Migrated from CICDManager. Checks:
- Workflow files exist and are valid YAML
- CI runs tests on PR
- Actions pinned to SHA or version tag (not @main)
- No secrets in workflow commands
- Proper permissions (least privilege)
- Matrix testing (multiple Node/Python versions)

### branch-protection.js
Migrated from BranchProtectionManager. Checks:
- CODEOWNERS file exists
- PR template exists
- Main branch protection (via API if available, config-based locally)
- Required reviews configured
- Status checks required

### dependencies.js (NEW)
- Dependency age (flag packages >2 years without update)
- Maintenance status (archived, deprecated)
- License compatibility
- Direct vs transitive vulnerability count
- Lock file present and up to date

### iot.js
Migrated from IoTManager. Checks IoT-specific:
- Firmware versioning scheme
- OTA update configuration
- Sensor data schema compliance
- MQTT schema integration
- Hardware platform documentation

---

## File Structure

```
lib/
  engine/
    Engine.js              — orchestrator (run checkers, aggregate)
    Checker.js             — base class for all checkers
    Context.js             — project type detection, context building
    Report.js              — result aggregation, grading, recommendations
    Cache.js               — shared cache for expensive operations
  checkers/
    security.js            — comprehensive security checks
    documentation.js       — doc quality and completeness
    cicd.js                — CI/CD workflow analysis
    branch-protection.js   — branch policies and review config
    dependencies.js        — dependency health (NEW)
    iot.js                 — IoT-specific compliance
  interfaces/
    cli.js                 — terminal output formatting
    json.js                — JSON output for CI
    html.js                — HTML dashboard generation
bin/
  repo-manager.js          — CLI entry point using commander
mcp-server/
  index.js                 — MCP server using engine API
index.js                   — npm package entry point (exports Engine)
```

### What Gets Removed

| Current File | Replacement |
|-------------|-------------|
| `lib/core/RepositoryManager.js` | `lib/engine/Context.js` |
| `lib/features/HealthScoreManager.js` | `lib/engine/Engine.js` + `Report.js` |
| `lib/features/SecurityManager.js` | `lib/checkers/security.js` |
| `lib/features/SecurityPolicyManager.js` | Merged into `lib/checkers/security.js` |
| `lib/features/DocumentationManager.js` | `lib/checkers/documentation.js` |
| `lib/features/CICDManager.js` | `lib/checkers/cicd.js` |
| `lib/features/BranchProtectionManager.js` | `lib/checkers/branch-protection.js` |
| `lib/features/IoTManager.js` | `lib/checkers/iot.js` |
| `lib/features/AutoFixManager.js` | `fix()` method on each checker |
| `lib/features/AutomationManager.js` (1774 lines) | Split across engine + checkers |
| `lib/features/DashboardGenerator.js` | `lib/interfaces/html.js` |
| `lib/features/TemplateEngine.js` | Removed (out of scope for v2.0) |
| `lib/features/MultiRepositoryManager.js` | Removed (out of scope for v2.0) |
| `lib/features/OrganizationAnalytics.js` | Removed (out of scope for v2.0) |
| `lib/utils/TokenManager.js` | Absorbed into `Context.js` |
| `lib/utils/colors.js` | Kept — used by `interfaces/cli.js` |
| `scripts/*-local.js` (7 files) | Logic moved into checkers |
| `bin/cli.js` | Removed (replaced by `bin/repo-manager.js`) |
| `bin/enhanced-cli.js` | Removed (replaced by `bin/repo-manager.js`) |

---

## CLI (v2.0)

```bash
# Run all checks
repo-manager check

# Run specific checkers
repo-manager check --only security,docs

# JSON output for CI
repo-manager check --format json

# Auto-fix
repo-manager fix
repo-manager fix --dry-run

# Generate HTML dashboard
repo-manager dashboard

# Show config
repo-manager config
```

All commands work without a GitHub token (local-only mode is the default, API enhances results when available).

---

## npm API (v2.0)

```javascript
const { Engine } = require('@alteriom/repository-metadata-manager');

const engine = new Engine({ projectRoot: '/path/to/repo' });
const report = await engine.run();

console.log(report.score);      // 82
console.log(report.grade);      // 'B'
console.log(report.findings);   // All findings across checkers
```

---

## MCP Server (v2.0)

Tools exposed:
- `check` — run all or specific checkers, returns Report
- `fix` — auto-fix findings, supports dry-run
- `findings` — list findings filtered by severity/checker

---

## Testing Strategy

### Test Fixtures

```
test/
  fixtures/
    healthy-project/        — all checks pass (has README, SECURITY, CI, etc.)
    insecure-project/       — .env committed, no SECURITY.md, vulnerable deps
    undocumented-project/   — missing README sections, no CHANGELOG
    no-ci-project/          — no .github/workflows/
    iot-project/            — platformio.ini, sensor schemas
  engine/
    engine.test.js          — integration: run engine on fixtures
    context.test.js         — project type detection
    report.test.js          — score aggregation, grading
  checkers/
    security.test.js
    documentation.test.js
    cicd.test.js
    branch-protection.test.js
    dependencies.test.js
    iot.test.js
  interfaces/
    cli.test.js
    json.test.js
```

Each checker is tested against real fixture directories, not mocks. This ensures checks are meaningful.

---

## Migration Path

- Bump to v2.0.0
- Old `RepositoryMetadataManager` class removed (breaking)
- Old CLI commands (`health`, `security --audit`, etc.) removed
- New CLI: `repo-manager check`, `repo-manager fix`, `repo-manager dashboard`
- npm entry point changes from class export to `{ Engine }` export
- package.json `bin` updated to new CLI

---

## Out of Scope for Sub-project 1

- **Deepening individual checks** — sub-project 2 (checkers start with current depth, then deepen)
- **New checker categories** — sub-project 3
- **PR comments / GitHub status checks** — sub-project 4
- **Multi-repo orchestration** — future (removed from v2.0)
- **Organization analytics** — future (removed from v2.0)
- **Template engine** — future (removed from v2.0)
