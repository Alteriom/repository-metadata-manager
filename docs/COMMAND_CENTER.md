# Command Center Integration

## Trust model

Use a GitHub App with separate read and write installations or tokens. Evaluation requires repository contents and metadata read access. Apply capability should be issued only to the executor after a plan is approved.

Do not provide user-supplied tokens to CLI or MCP arguments. Inject short-lived credentials through the executor environment.

For GitHub Actions, mint the evaluation token with the official `actions/create-github-app-token` action and scope it to the repository being checked. The app needs `Administration: write` to audit ruleset bypass actors, `Checks: write` to publish the trusted compliance result under its own App identity, and `Contents: read` for repository evaluation. This repository expects these organization Actions secrets:

- `APP_ID`
- `APP_PRIVATE_KEY`

`APP_PRIVATE_KEY` can contain the PEM text or its base64 encoding. The workflow normalizes either representation without printing the key.

The workflow uses the v3 action's legacy `app-id` input because the organization currently exposes `APP_ID`. A future credential rotation can migrate this to the recommended GitHub App client ID without changing the token's repository or permission scope.

`APP_INSTALLATION_ID` may remain available for other integrations, but the official action discovers the installation from the app and repository owner.

Dependabot or any context without App secrets runs a secret-free local checker scope covering CI/CD, dependencies, documentation, IoT applicability, licensing, and security. Its result is published as `Compliance Check (restricted)` by GitHub Actions and cannot satisfy the protected `Compliance Check` context. A maintainer can request the trusted, default-branch workflow for an open PR with `gh api repos/OWNER/REPOSITORY/dispatches -f event_type=repository-compliance -F 'client_payload[pull_request_number]=123'`. The dispatcher resolves the PR's current immutable merge SHA for evaluation and publishes the App-sourced result on its head SHA. Authoritative branch-protection and repository-metadata verification, the protected App-sourced checks, and PR report comments require the App-backed context.

The same default-branch workflow runs candidate code in a separate secret-free job. It replaces candidate tests with the protected branch's tests, uses the protected lint configuration and test runner, disables lifecycle scripts, and exposes no App credentials. On the hosted Linux runner, the protected supervisor and Jest controller run as root while every Jest worker is dropped to the unprivileged `nobody` UID/GID; Node's SIGUSR1 inspector activation is disabled. Candidate workers therefore cannot signal, trace, or attach a debugger to the controller that owns result authority. The supervisor first records the exact test-file/name multiset from a clean baseline run and freezes Jest registration/assertion globals before candidate modules load. The worker's original Jest IPC send function is captured, bound, frozen, and installed as a non-writable/non-configurable property before candidate code loads. A protected reporter in the separate Jest controller sends the authoritative result directly to the supervisor over parent IPC, with no candidate-visible result-file path. The candidate result must contain the identical identities with every suite and assertion passed. Premature termination, exit-handler forgery, worker-channel replacement, replaced globals, dummy tests, skipped assertions, missing output, and duplicate authority messages all fail the job. A different job receives only that job's GitHub result and publishes `Trusted Test & Lint` with the dedicated App. Candidate-defined `Test & Lint` and `Security Summary` workflows remain useful feedback, but they are not merge-authority controls because a pull request can edit their workflow definitions.

Both trusted jobs check out the evaluator, policy, tests, and test supervisor from the exact 40-character commit stored in the repository variable `REPOSITORY_MANAGER_CONTROL_SHA`; branch names and event SHAs are rejected as control-plane selectors. The App-backed workflow has no `push`, `schedule`, or `workflow_dispatch` trigger, so merged candidate code cannot receive credentials automatically. If a pull request adds, removes, renames, or edits any file below `.github/workflows/`, the default-branch resolver fails before secrets are loaded unless a repository administrator comments `/approve-command-center HEAD_SHA` on that exact pull-request head. A later push changes the SHA and invalidates the attestation. This provides an explicit trusted-review action without requiring the solo maintainer to approve their own pull request. Update the pinned SHA only after reviewing and releasing a new control-plane commit, and record both actions as command-center audit events.

Trusted reruns and scheduled command-center audits use only `repository_dispatch`, whose workflow definition is always loaded from the default branch and whose payload must identify an open pull request. The App-backed workflow intentionally has no `workflow_dispatch` trigger because GitHub permits manual dispatch against a collaborator-controlled branch ref.

## Solo-maintainer controls

A solo maintainer cannot provide an independent approval. Set both the minimum and maximum required approvals to zero, prohibit code-owner reviews, and prohibit administrator enforcement so those live rules are verified exactly. Then compensate with controls that do not create a self-approval deadlock:

- require strict, up-to-date status checks;
- bind both `Compliance Check` and `Trusted Test & Lint` to the dedicated compliance App, and bind `CodeQL` to GitHub's Advanced Security App (ID `57789`), rather than accepting those contexts from any producer;
- require an exact-head `/approve-command-center HEAD_SHA` administrator attestation for workflow changes, and pin `REPOSITORY_MANAGER_CONTROL_SHA` to an audited immutable commit;
- prohibit last-push approval so the sole maintainer is never required to obtain another person's review;
- require all review conversations to be resolved;
- require verified `branch-protection` and `repository-metadata` checker results;
- keep critical and high-severity compliance gates at zero;
- enable secret scanning and Dependabot security updates; and
- retain administrator bypass for emergency recovery.

This profile makes automation and evidence the merge authority. It does not treat a maintainer's approval of their own change as an independent control.

## Reconciliation flow

1. Inventory repositories and assign policy profiles.
2. Checkout an immutable commit or create an isolated evaluation workspace.
3. Evaluate and store the complete versioned report.
4. Generate a deterministic plan.
5. Present the plan, evidence, and expected changes for approval.
6. Prefer a pull request for repository-file operations.
7. Use scoped GitHub API operations only for settings that cannot be changed through a PR.
8. Verify the resulting state and append an audit record.

## Storage keys

Recommended identity:

```text
organization/repository + commit SHA + policy id/version + tool version
```

Store reports, plans, approvals, execution results, verification results, and exceptions separately. A plan ID is content-derived and can be used as an idempotency key.

## MCP deployment

Run one MCP process with an explicit allowed-root set:

```bash
REPO_MANAGER_ALLOWED_ROOTS=/srv/evaluations repo-manager-mcp
```

Keep apply disabled for general agents. A dedicated executor may use:

```bash
REPO_MANAGER_ALLOWED_ROOTS=/srv/approved-workspaces \
REPO_MANAGER_ENABLE_APPLY=true \
repo-manager-mcp
```

The executor should receive only an already-approved plan and an isolated workspace.

## Current write scope

The v3 executor supports controlled file writes. GitHub settings remain evaluation-only. Add future settings executors as typed operations with least-privilege scopes, current-state preconditions, idempotency, and rollback metadata; do not call legacy organization mutation scripts.
