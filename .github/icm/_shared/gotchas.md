---
verified_at: 2026-10-15
verified_commit: 6600a74a243c9dc9e8c49af0f61f282ce7cca7e0
---

# Gotchas — traps that have already cost something

- **Jest upgrades can break the trusted-runner test.** Jest 30.5 routes the sandbox's `process.getBuiltinModule` through its module registry, which made "trusted candidate test runner › rejects locally emitted Jest worker requests" fail after #144 until #152 adjusted the test (`test/workflows/trusted-runner.test.js:106`). After a Jest bump, run that file first.
- **`npm audit` at moderate gates two required checks** ("Test & Lint" and "Security Summary"), and the daily `Security Scanning` fails on any advisory published since the last lock update. #152 cleared it: `npm audit fix` within the declared ranges, `@modelcontextprotocol/sdk` raised to `^1.31.0`, and an `overrides` entry pinning `js-yaml` 4 under `@istanbuljs/load-nyc-config` (`package.json` "overrides"), because the `sprintf-js` advisory in jest's coverage chain has no patched release. A new red audit is a lock update in its own pull request.
- **Non-documentation pull requests wait for an administrator.** "Resolve Immutable Candidate" (`.github/workflows/ai-agent-compliance.yml`) fails, and the trusted test and compliance jobs after it are skipped, until a repository administrator comments exactly `/approve-command-center <head sha>`. The workflow runs only on pull-request events, not on comments, so after the comment the failed run has to be re-run; every push moves the head and needs a new comment ([build-and-test.md](build-and-test.md)).
- **The version is ahead of npm.** `package.json` is `3.0.0` and npm `latest` is `2.1.0` ([release.md](release.md)); `npm version` in a dispatched release bumps from 3.0.0.
- **`test/fixtures/` holds deliberate fake secrets** for the security checker's tests (`test/fixtures/insecure-project/config.js:1`); this repository's own policy ignores the folder (`.repo-manager.json`, "security"). Never copy them anywhere.
- **`.gitignore` ignores every `config.json`** (`.gitignore:61`), the workspace's `.github/icm/_system/config.json` included. That file is tracked (it was added with `git add -f`), so edits to it are committed normally; a new `config.json` anywhere else stays ignored.
