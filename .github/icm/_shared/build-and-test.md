---
verified_at: 2026-10-15
verified_commit: d5daf2275e14b98526f8b4b61ac7bda226efa9da
---

# Build and test — locally, and the checks on a pull request

Node.js 24 or newer (`package.json` "engines", `.nvmrc`). No build step.

- **Locally**: `npm ci`, `npm run lint` (ESLint, `eslint.config.js`), `npm test` (Jest; CI runs `npm run test:core`, the same suite in band), `npm run test:coverage`, `npm pack --dry-run` (`package.json` "scripts"). The CLI smoke CI runs: `node bin/repo-manager.js check --only license --format json` and `node bin/repo-manager.js config` (`.github/workflows/ci.yml:44-49`).
- **`Continuous Integration`** (`.github/workflows/ci.yml`): on pushes and pull requests to `main` and `develop`, Node 24: lint, `test:core`, the CLI smoke, `npm pack --dry-run`, `npm audit --audit-level moderate`.
- **`Security Scanning`** (`.github/workflows/security.yml`): on pushes, pull requests and daily at 02:00 UTC: dependency review (pull requests), `npm audit` at moderate, `repo-manager check --only security`, secrets scanning, license compliance (`.github/workflows/security.yml`). `test/workflows/configuration.test.js` pins parts of it.
- **`AI Agent Compliance Check`** (`.github/workflows/ai-agent-compliance.yml`): on `pull_request_target` to `main`. It publishes "Compliance Check" and "Trusted Test & Lint" through a GitHub App. Any pull request that changes more than documentation needs a repository administrator's comment `/approve-command-center <sha>` naming the exact head before the check can pass (`.github/workflows/ai-agent-compliance.yml:115-170`). `AGENTS.md`, `CLAUDE.md`, workflows and code are never documentation for this rule.
- **Required status checks** for `main` are named in `.repo-manager.json` ("Trusted Test & Lint", "Compliance Check", "CodeQL").
- **`ICM check`** runs `generate.py --check` when the entry or `.github/icm/` changes (`.github/workflows/icm-check.yml`); `python .github/icm/_system/generate.py` regenerates `icm.source.json` and the stage tables.
