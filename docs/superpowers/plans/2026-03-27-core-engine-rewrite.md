# Core Engine Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 13 feature manager architecture with a pluggable checker engine (v2.0 breaking change).

**Architecture:** Engine orchestrates self-contained Checker plugins via a standard interface (check/fix). Context provides project info. Report aggregates results. CLI/MCP/JSON are thin interfaces over the engine. All checkers work locally by default, enhanced by GitHub API when available.

**Tech Stack:** Node.js (CommonJS), Jest 30, Commander 14

**Spec:** `docs/superpowers/specs/2026-03-27-core-engine-rewrite-design.md`

---

## Execution Order

Tasks build on each other — execute in order:

1. **Test fixtures** — create fixture projects for all checkers to test against
2. **Engine core** — Checker base class, Context, Cache, Report, Engine
3. **Security checker** — first real checker, validates the full pipeline
4. **Documentation checker** — second checker
5. **CI/CD checker** — third checker
6. **Branch protection checker** — fourth checker
7. **Dependencies checker** — fifth checker (NEW)
8. **IoT checker** — sixth checker
9. **CLI interface** — new `bin/repo-manager.js`
10. **MCP server** — update to use Engine API
11. **Package migration** — update index.js, package.json, README for v2.0
12. **Remove old code** — delete lib/features/, lib/core/, old bin files, scripts/

---

## Task 1: Create Test Fixtures

**Files to create:**
- `test/fixtures/healthy-project/` — passes all checks
- `test/fixtures/insecure-project/` — fails security
- `test/fixtures/undocumented-project/` — fails docs
- `test/fixtures/no-ci-project/` — fails CI/CD
- `test/fixtures/iot-project/` — IoT-specific

Each fixture is a minimal directory with just enough files to test checkers against.

### healthy-project/
- [ ] **Step 1:** Create `test/fixtures/healthy-project/` with:
  - `package.json` (name, version, scripts with test, dependencies, license)
  - `package-lock.json` (minimal valid lockfile)
  - `README.md` (has description, installation, usage, license sections, badge)
  - `CHANGELOG.md` (follows Keep a Changelog format)
  - `CONTRIBUTING.md` (meaningful content)
  - `SECURITY.md` (vulnerability reporting instructions)
  - `LICENSE` (MIT)
  - `.gitignore` (includes node_modules, .env)
  - `.github/workflows/ci.yml` (runs tests on PR, pinned actions)
  - `.github/CODEOWNERS` (assigns reviewers)
  - `.github/PULL_REQUEST_TEMPLATE.md`
  - `.github/dependabot.yml`

### insecure-project/
- [ ] **Step 2:** Create `test/fixtures/insecure-project/` with:
  - `package.json` (no license field)
  - `.env` (contains FAKE_API_KEY=sk-test-12345)
  - NO `.gitignore`
  - NO `SECURITY.md`
  - NO `.github/dependabot.yml`
  - `.github/workflows/ci.yml` with `actions/checkout@main` (unpinned)

### undocumented-project/
- [ ] **Step 3:** Create `test/fixtures/undocumented-project/` with:
  - `package.json` (minimal)
  - `README.md` (just one line: "# My Project")
  - NO `CHANGELOG.md`, `CONTRIBUTING.md`, `LICENSE`

### no-ci-project/
- [ ] **Step 4:** Create `test/fixtures/no-ci-project/` with:
  - `package.json`
  - `README.md`
  - NO `.github/` directory at all

### iot-project/
- [ ] **Step 5:** Create `test/fixtures/iot-project/` with:
  - `platformio.ini` (basic ESP32 config)
  - `README.md` with hardware section
  - `firmware_version.json`
  - `src/main.cpp` (minimal)

- [ ] **Step 6: Commit fixtures**
```bash
git add test/fixtures/
git commit -m "test: add fixture projects for all checkers"
```

---

## Task 2: Engine Core

**Files to create:**
- `lib/engine/Checker.js` — base class
- `lib/engine/Context.js` — project context builder
- `lib/engine/Cache.js` — shared cache
- `lib/engine/Report.js` — result aggregation
- `lib/engine/Engine.js` — orchestrator

**Tests:**
- `test/engine/checker.test.js`
- `test/engine/context.test.js`
- `test/engine/report.test.js`
- `test/engine/engine.test.js`

### Checker.js
- [ ] **Step 1:** Write `test/engine/checker.test.js` testing:
  - Constructor stores name, version, description, defaultWeight
  - `check()` throws "not implemented" on base class
  - `fix()` returns empty result by default (optional method)
  - `grade(score)` returns correct letter grade (A/B/C/D/F)
  - Score capping: grade(150) returns 'A' not an error

- [ ] **Step 2:** Implement `lib/engine/Checker.js`:
  - Constructor takes `{ name, version, description, defaultWeight }`
  - `async check(context)` — throws "Not implemented"
  - `async fix(context, findings)` — returns `{ checker: this.name, applied: [], skipped: findings.map(...) }`
  - `grade(score)` — static, returns A(90+)/B(80+)/C(70+)/D(50+)/F(<50)
  - `createResult(score, findings, metadata)` — helper that builds a complete CheckResult with capped score, grade, duration

- [ ] **Step 3:** Run tests, verify pass. Commit.

### Context.js
- [ ] **Step 4:** Write `test/engine/context.test.js` testing:
  - Detects `node` project type from `package.json`
  - Detects `python` from `requirements.txt`
  - Detects `iot` from `platformio.ini`
  - Defaults to `generic` when nothing detected
  - Reads `package.json` contents when present
  - Reads git info (branch, remote) when `.git/` exists
  - Sets `github` to null when no token provided
  - Loads `.repo-manager.json` config when present
  - Provides `getCheckerConfig(name)` returning merged defaults + overrides

- [ ] **Step 5:** Implement `lib/engine/Context.js`:
  - `static async build({ projectRoot, token, configPath })` — factory method
  - Auto-detect project type from files on disk
  - Parse package.json if exists
  - Read git info via `git rev-parse`, `git remote get-url origin`
  - Init Octokit if token provided, null otherwise
  - Load and parse `.repo-manager.json` if exists
  - `getCheckerConfig(checkerName)` — returns `{ weight, enabled, ...overrides }` merged from defaults + config file

- [ ] **Step 6:** Run tests against fixture directories. Commit.

### Cache.js
- [ ] **Step 7:** Write `test/engine/cache.test.js` testing:
  - `get(key)` returns null for missing keys
  - `set(key, value)` stores and `get` retrieves
  - `getOrSet(key, asyncFn)` calls fn on miss, returns cached on hit
  - Second call to `getOrSet` with same key does NOT call fn again

- [ ] **Step 8:** Implement `lib/engine/Cache.js`:
  - Simple Map-based cache
  - `get(key)`, `set(key, value)`, `has(key)`
  - `async getOrSet(key, asyncFn)` — if cached return it, else call fn, cache, return

- [ ] **Step 9:** Run tests. Commit.

### Report.js
- [ ] **Step 10:** Write `test/engine/report.test.js` testing:
  - `aggregate(checkResults, config)` computes weighted score capped at 100
  - Grade matches the score
  - Findings are merged from all checkers
  - Summary counts by severity are correct
  - Recommendations generated from high/critical findings
  - Handles empty checkers (no results = score 0)
  - Weights normalize to 100 if they don't sum correctly

- [ ] **Step 11:** Implement `lib/engine/Report.js`:
  - `static aggregate(checkResults, checkerConfigs)` — returns full Report object
  - Weighted average: `sum(score * weight) / sum(weight)`, capped at 100
  - Grade from aggregated score
  - Merge all findings into flat array
  - Count by severity
  - Generate recommendations from findings with severity >= high

- [ ] **Step 12:** Run tests. Commit.

### Engine.js
- [ ] **Step 13:** Write `test/engine/engine.test.js` testing against `test/fixtures/healthy-project/`:
  - Engine constructs with projectRoot
  - `engine.register(checker)` adds a checker
  - `engine.run()` returns a Report with all registered checkers
  - `engine.run(['security'])` runs only named checkers
  - Disabled checkers (via config) are skipped
  - All checkers receive the same Context
  - Checkers run in parallel (not sequential)
  - `engine.fix({ dryRun: true })` calls fix() on checkers with fixable findings

- [ ] **Step 14:** Implement `lib/engine/Engine.js`:
  - Constructor: `{ projectRoot, token, config }` — stores options, does NOT build context yet
  - `register(checker)` — adds to internal checkers list
  - `async run(only)` — builds Context, filters checkers, runs in parallel via `Promise.all`, aggregates via Report
  - `async fix({ dryRun })` — runs check first, then calls `checker.fix()` for each with fixable findings
  - Auto-registers built-in checkers from `lib/checkers/` directory

- [ ] **Step 15:** Run tests. Commit.

```bash
git add lib/engine/ test/engine/
git commit -m "feat: implement engine core — Checker, Context, Cache, Report, Engine"
```

---

## Task 3: Security Checker

**Files:**
- Create: `lib/checkers/security.js`
- Test: `test/checkers/security.test.js`

- [ ] **Step 1:** Write `test/checkers/security.test.js` testing against fixtures:
  - Against `healthy-project/`: score >= 80, no critical findings
  - Against `insecure-project/`: score < 50, finds `.env` file, finds missing `.gitignore`, finds missing `SECURITY.md`, finds unpinned action
  - `fix()` on insecure-project: returns fixable items (add .env to .gitignore)

- [ ] **Step 2:** Implement `lib/checkers/security.js` extending Checker:
  - Check SECURITY.md exists and has content
  - Check .gitignore exists and covers .env, credentials, secrets
  - Scan for .env files in project root
  - Scan files for secret patterns (API keys, tokens, passwords) using regex
  - Check dependabot/renovate config exists
  - Run `npm audit --json` if package.json exists (use cache)
  - Check Docker files for security issues if Dockerfile exists
  - Each check produces findings with appropriate severity
  - Score: start at 100, deduct per finding (critical: -25, high: -15, medium: -10, low: -5), cap at 0
  - `fix()`: can add .env to .gitignore, can create SECURITY.md template

- [ ] **Step 3:** Run tests. Commit.

---

## Task 4: Documentation Checker

**Files:**
- Create: `lib/checkers/documentation.js`
- Test: `test/checkers/documentation.test.js`

- [ ] **Step 1:** Write tests against fixtures:
  - `healthy-project/`: score >= 90
  - `undocumented-project/`: score < 40, finds missing sections in README, missing CHANGELOG/CONTRIBUTING/LICENSE

- [ ] **Step 2:** Implement `lib/checkers/documentation.js`:
  - Check README.md: exists, has required sections (# heading, description, ## Installation, ## Usage, ## License), length > 100 chars
  - Check CHANGELOG.md: exists, follows Keep a Changelog (has ## [Unreleased] or ## [x.y.z])
  - Check CONTRIBUTING.md: exists, length > 50 chars
  - Check LICENSE: exists, content matches known SPDX patterns
  - Score: each doc is worth points (README: 40, CHANGELOG: 20, CONTRIBUTING: 15, LICENSE: 25), deduct for quality issues
  - `fix()`: can create template CHANGELOG.md, CONTRIBUTING.md

- [ ] **Step 3:** Run tests. Commit.

---

## Task 5: CI/CD Checker

**Files:**
- Create: `lib/checkers/cicd.js`
- Test: `test/checkers/cicd.test.js`

- [ ] **Step 1:** Write tests:
  - `healthy-project/`: score >= 80, finds pinned actions
  - `no-ci-project/`: score 0, finding: "No CI/CD workflows found"
  - `insecure-project/`: finds unpinned actions

- [ ] **Step 2:** Implement `lib/checkers/cicd.js`:
  - Read `.github/workflows/` from filesystem
  - Parse YAML files
  - Check: at least one workflow exists
  - Check: workflow triggers on PR
  - Check: actions are pinned (not @main or @master)
  - Check: workflow has proper permissions block
  - Check: no secrets in `run:` commands (simple regex)
  - Score: 0 if no workflows, then deduct per issue

- [ ] **Step 3:** Run tests. Commit.

---

## Task 6: Branch Protection Checker

**Files:**
- Create: `lib/checkers/branch-protection.js`
- Test: `test/checkers/branch-protection.test.js`

- [ ] **Step 1:** Write tests:
  - `healthy-project/`: score >= 70, finds CODEOWNERS, PR template
  - `no-ci-project/`: low score, missing all branch protection files

- [ ] **Step 2:** Implement `lib/checkers/branch-protection.js`:
  - Check CODEOWNERS exists
  - Check PR template exists
  - Check if GitHub API available: query branch protection rules
  - If no API: score based on local indicators only
  - Score: CODEOWNERS 30pts, PR template 20pts, API protection rules 50pts (or 50pts local heuristics)

- [ ] **Step 3:** Run tests. Commit.

---

## Task 7: Dependencies Checker (NEW)

**Files:**
- Create: `lib/checkers/dependencies.js`
- Test: `test/checkers/dependencies.test.js`

- [ ] **Step 1:** Write tests:
  - `healthy-project/`: score >= 70, has lock file
  - `insecure-project/`: missing lock file finding

- [ ] **Step 2:** Implement `lib/checkers/dependencies.js`:
  - Check lock file exists (package-lock.json, yarn.lock, pnpm-lock.yaml)
  - Run `npm audit --json` (use cache, shared with security checker)
  - Check dependency count (flag if > 100 direct deps)
  - Check for license field in package.json
  - Score: lock file 30pts, no vulnerabilities 40pts, license 15pts, reasonable dep count 15pts

- [ ] **Step 3:** Run tests. Commit.

---

## Task 8: IoT Checker

**Files:**
- Create: `lib/checkers/iot.js`
- Test: `test/checkers/iot.test.js`

- [ ] **Step 1:** Write tests:
  - `iot-project/`: score >= 60, detects IoT project
  - `healthy-project/`: checker detects non-IoT, returns score 100 with info finding "Not an IoT project"

- [ ] **Step 2:** Implement `lib/checkers/iot.js`:
  - Detect IoT project (platformio.ini, firmware_version.json, Arduino files)
  - If not IoT: return 100 with info-level finding "Not an IoT project — skipped"
  - If IoT: check firmware versioning, OTA config, hardware docs, sensor schemas
  - Score based on applicable checks

- [ ] **Step 3:** Run tests. Commit.

---

## Task 9: CLI Interface

**Files:**
- Create: `bin/repo-manager.js`
- Create: `lib/interfaces/cli.js` — formatting functions
- Create: `lib/interfaces/json.js` — JSON output
- Test: `test/interfaces/cli.test.js`

- [ ] **Step 1:** Implement `lib/interfaces/cli.js`:
  - `formatReport(report)` — returns colored terminal string with summary table, per-checker scores, top findings
  - `formatFixResult(fixResults)` — shows applied/skipped fixes
  - Uses `lib/utils/colors.js` for ANSI colors

- [ ] **Step 2:** Implement `lib/interfaces/json.js`:
  - `formatReport(report)` — returns `JSON.stringify(report, null, 2)`

- [ ] **Step 3:** Implement `bin/repo-manager.js`:
  - Uses Commander for CLI
  - `check` command: creates Engine, runs, formats output (cli or json based on --format)
  - `fix` command: creates Engine, runs fix, shows results
  - `dashboard` command: creates Engine, runs, generates HTML
  - `config` command: shows loaded config
  - All commands wrapped in try/catch with user-friendly errors
  - Exit code 1 if score < threshold.fail, exit code 0 otherwise

- [ ] **Step 4:** Write `test/interfaces/cli.test.js`:
  - `formatReport` produces output containing checker names and scores
  - `formatReport` includes findings count
  - JSON format produces valid JSON

- [ ] **Step 5:** Run tests. Commit.

---

## Task 10: MCP Server

**Files:**
- Modify: `mcp-server/index.js`

- [ ] **Step 1:** Rewrite `mcp-server/index.js` to use Engine:
  - `check` tool: `new Engine({ projectRoot, token }).run(only)` → return report
  - `fix` tool: `engine.fix({ dryRun })` → return fix results
  - `findings` tool: run check, filter findings by severity/checker
  - Remove all direct feature manager imports
  - Keep ESM format (it's a separate package with `"type": "module"`)

- [ ] **Step 2:** Test MCP server loads:
```bash
cd mcp-server && timeout 5 node -e "import('./index.js').then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); })"
```

- [ ] **Step 3:** Commit.

---

## Task 11: Package Migration

**Files:**
- Modify: `index.js`
- Modify: `package.json`
- Modify: `README.md`

- [ ] **Step 1:** Replace `index.js` with new entry point:
```javascript
const Engine = require('./lib/engine/Engine');
const Checker = require('./lib/engine/Checker');
const Context = require('./lib/engine/Context');
const Report = require('./lib/engine/Report');

module.exports = { Engine, Checker, Context, Report };
```

- [ ] **Step 2:** Update `package.json`:
  - Version: `"2.0.0"`
  - `"bin"`: `{ "repo-manager": "./bin/repo-manager.js" }` (remove old entries)
  - `"main"`: `"index.js"` (unchanged)
  - Update `"files"` array: `["lib/", "bin/", "index.js", "mcp-server/"]`
  - Remove `scripts/` from files
  - Update `"scripts"` to use new CLI commands

- [ ] **Step 3:** Update `README.md`:
  - New v2.0 API examples
  - New CLI commands
  - Installation instructions
  - Keep concise (this is sub-project 1, deeper docs come later)

- [ ] **Step 4:** Run full test suite:
```bash
npm test
npm run lint
node bin/repo-manager.js check
node bin/repo-manager.js check --format json
```

- [ ] **Step 5:** Commit.

---

## Task 12: Remove Old Code

**Files to delete:**
- `lib/core/` (entire directory)
- `lib/features/` (entire directory)
- `lib/utils/TokenManager.js`
- `lib/utils/EnvironmentDetector.js`
- `bin/cli.js`
- `bin/enhanced-cli.js`
- `scripts/*-local.js` (7 files)
- `scripts/test-features.js`
- `scripts/test-docs-tokens.js`
- `debug-docs.js` (if still exists)
- `debug-local-docs.js` (if still exists)

**Keep:**
- `lib/utils/colors.js` (used by CLI interface)
- `scripts/release.js`, `scripts/setup-check.js` (operational)
- All test fixtures and new tests

- [ ] **Step 1:** Delete old files:
```bash
rm -rf lib/core/ lib/features/
rm -f lib/utils/TokenManager.js lib/utils/EnvironmentDetector.js
rm -f bin/cli.js bin/enhanced-cli.js
rm -f scripts/*-local.js scripts/test-features.js scripts/test-docs-tokens.js
rm -f debug-docs.js debug-local-docs.js
```

- [ ] **Step 2:** Delete old test files:
```bash
rm -f tests/feature-managers.test.js tests/enhanced-cli.test.js tests/repository-manager.test.js
rm -f tests/ai-agent.test.js
```

Keep `tests/setup.js` if it has useful Jest configuration.

- [ ] **Step 3:** Run all tests to verify nothing references deleted code:
```bash
npm test
npm run lint
node bin/repo-manager.js check
```

- [ ] **Step 4:** Commit.

```bash
git add -A
git commit -m "chore: remove old v1.x code — lib/features/, lib/core/, old CLI, scripts

Replaced by v2.0 engine architecture. See lib/engine/ and lib/checkers/."
```

---

## Task 13: Push and Create PR

- [ ] **Step 1:** Push and create PR:
```bash
git push -u origin fix/broken-features
gh pr create -R Alteriom/repository-metadata-manager \
  --title "feat: v2.0 — pluggable checker engine (breaking change)" \
  --body "..."
```
