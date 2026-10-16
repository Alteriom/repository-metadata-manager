---
verified_at: 2026-10-15
verified_commit: 418b42fe2f2b88d9b9606e27c261ea7ac7a69386
---

# Gotchas — traps that have already cost something

- **Jest upgrades can break the trusted-runner test.** Jest 30.5 routes the sandbox's `process.getBuiltinModule` through its module registry, which made "trusted candidate test runner › rejects locally emitted Jest worker requests" fail after #144 until #152 adjusted the test (`test/workflows/trusted-runner.test.js:106`). After a Jest bump, run that file first.
- **`npm audit` at moderate gates two required checks** ("Test & Lint" and "Security Summary"), and the daily `Security Scanning` fails on any advisory published since the last lock update. #152 cleared it: `npm audit fix` within the declared ranges, `@modelcontextprotocol/sdk` raised to `^1.31.0`, and an `overrides` entry pinning `js-yaml` 4 under `@istanbuljs/load-nyc-config` (`package.json` "overrides"), because the `sprintf-js` advisory in jest's coverage chain has no patched release. A new red audit is a lock update in its own pull request.
- **Non-documentation pull requests wait for an administrator.** "Resolve Immutable Candidate" (`.github/workflows/ai-agent-compliance.yml`) fails, and the trusted test and compliance jobs after it are skipped, until a repository administrator comments exactly `/approve-command-center <head sha>`. The workflow does not run on comments, so after the comment re-run the failed job, or send the `repository-compliance` dispatch for the pull request (`docs/COMMAND_CENTER.md`); every push moves the head and needs a new comment. Since #154 the resolver reads the pull request when it runs and waits for GitHub's test merge of the current head, so a re-run right after a push or a reopen no longer audits a stale merge ([build-and-test.md](build-and-test.md)).
- **The version is ahead of npm.** `package.json` is `3.0.0` and npm `latest` is `2.1.0` ([release.md](release.md)); `npm version` in a dispatched release bumps from 3.0.0.
- **`test/fixtures/` holds deliberate fake secrets** for the security checker's tests (`test/fixtures/insecure-project/config.js:1`); this repository's own policy ignores the folder (`.repo-manager.json`, "security"). Never copy them anywhere.
- **`.gitignore` ignores every `config.json`** (`.gitignore:61`), the workspace's `.github/icm/_system/config.json` included. That file is tracked (it was added with `git add -f`), so edits to it are committed normally; a new `config.json` anywhere else stays ignored.
