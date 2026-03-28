# CLAUDE.md — repository-metadata-manager

Node.js CLI for repo health and compliance checking. v2.0+ uses a pluggable engine architecture.

## Architecture

```
Engine (lib/engine/) → Checkers (lib/checkers/) → Interfaces (lib/interfaces/)
```

- Engine orchestrates checker runs and scoring
- Each checker is independent, returns findings + score
- Interfaces: CLI, JSON, GitHub Annotations

## Built-in Checkers (lib/checkers/)

1. `security.js` — SECURITY.md, vulnerability policies
2. `documentation.js` — README, CONTRIBUTING, CHANGELOG presence
3. `cicd.js` — GitHub Actions workflows
4. `branch-protection.js` — branch rules (requires GitHub token)
5. `dependencies.js` — outdated/vulnerable deps
6. `iot.js` — Alteriom IoT-specific checks
7. `license.js` — LICENSE file presence and type

## CLI Usage

```bash
repo-manager check [--format cli|json|github] [--fail-below N] [--verbose] [--output file] [--token TOKEN]
repo-manager fix
repo-manager config
```

- `--format github` for CI annotation output
- Auto-detected when `GITHUB_ACTIONS=true`
- All checkers work locally **without** a GitHub token (branch-protection degrades gracefully)

## Reusable GitHub Action

Has `action.yml` at root — other repos can use:
```yaml
uses: Alteriom/repository-metadata-manager@v2
```

## Test

```bash
npx jest test/engine/ test/checkers/ test/interfaces/
```

Uses Jest 30.

## Version

Current: **2.1.0**
