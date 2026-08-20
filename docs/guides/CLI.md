# CLI Guide

## Evaluate and verify

`check` and its alias `evaluate` run enabled checkers and return a versioned compliance report. Policy gates control the exit code.

```bash
repo-manager check --format cli --verbose
repo-manager check --format json --only security,cicd
repo-manager check --format github --fail-below 85
repo-manager verify --format github
```

Formats are `cli`, `json`, and `github`. Unknown formats, scores, checker names, and invalid policies are errors.

## Plan and apply

```bash
repo-manager plan --output plan.json
repo-manager apply plan.json
repo-manager apply plan.json --approve --audit-log /secure/audit/repository.jsonl
repo-manager verify
```

The first apply command is a preview. `--approve` applies the exact plan. If a target file changed after planning, apply stops without overwriting it.

## Inventory

```bash
repo-manager inventory --output local.json
GITHUB_TOKEN=... repo-manager inventory --organization alteriom --output organization.json
```

Organization inventory uses Octokit's pagination and returns every visible repository. It does not mutate GitHub.

## Configuration

```bash
repo-manager config
repo-manager check --policy policies/high-risk.json
```

Policy paths must remain inside the selected project root. Use centrally synchronized policy files rather than passing arbitrary external paths.
