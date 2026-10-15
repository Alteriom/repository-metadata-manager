---
verified_at: 2026-10-15
verified_commit: d5daf2275e14b98526f8b4b61ac7bda226efa9da
---

# Gotchas — traps that have already cost something

- **One test fails on `main`.** "trusted candidate test runner › rejects locally emitted Jest worker requests" (`test/workflows/trusted-runner.test.js:105`) fails on the push run of `d5daf22` (2026-09-28) and on Windows locally; every pull request's "Test & Lint" is red for it until it is fixed. Compare a red run against `main` before calling it new.
- **`npm audit` fails the daily `Security Scanning`.** Advisories published after the last lock update fail the audit step on every scheduled run since at least 2026-09-06 (one critical, one high in the `--only security` report); CI's audit step fails the same way once the test passes.
- **Non-documentation pull requests wait for an administrator.** "Compliance Check" stays red until a repository administrator comments `/approve-command-center <sha>` for the exact head; every push moves the head and needs a new comment ([build-and-test.md](build-and-test.md)).
- **The version is ahead of npm.** `package.json` is `3.0.0` and npm `latest` is `2.1.0` ([release.md](release.md)); `npm version` in a dispatched release bumps from 3.0.0.
- **`test/fixtures/` holds deliberate fake secrets** for the security checker's tests (`test/fixtures/insecure-project/config.js:1`); this repository's own policy ignores the folder (`.repo-manager.json`, "security"). Never copy them anywhere.
- **`CONTRIBUTING.md` names scripts that no longer exist** (`npm run docs`, `security`, `branchprotection`, `cicd`, `test:features`) and a 2-space indent the formatter does not use (`.prettierrc` sets 4); the scripts are in `package.json`.
- **`.gitignore` ignores every `config.json`** (`.gitignore:61`), the workspace's `.github/icm/_system/config.json` included. That file is tracked (it was added with `git add -f`), so edits to it are committed normally; a new `config.json` anywhere else stays ignored.
