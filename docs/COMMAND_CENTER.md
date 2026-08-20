# Command Center Integration

## Trust model

Use a GitHub App with separate read and write installations or tokens. Evaluation requires repository contents and metadata read access. Apply capability should be issued only to the executor after a plan is approved.

Do not provide user-supplied tokens to CLI or MCP arguments. Inject short-lived credentials through the executor environment.

For GitHub Actions, mint the evaluation token with the official `actions/create-github-app-token` action and scope it to the repository being checked. The app needs `Administration: read` for branch protection and security settings plus `Contents: read` for repository evaluation. This repository expects these organization Actions secrets:

- `APP_ID`
- `APP_PRIVATE_KEY`

`APP_INSTALLATION_ID` may remain available for other integrations, but the official action discovers the installation from the app and repository owner.

## Solo-maintainer controls

A solo maintainer cannot provide an independent approval. Use zero required approvals and compensate with controls that do not create a self-approval deadlock:

- require strict, up-to-date status checks;
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
