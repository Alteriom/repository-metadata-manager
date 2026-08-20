# Policy Guide

Policy schema version 1 has these top-level areas:

| Property | Purpose |
| --- | --- |
| `schemaVersion` | Policy document schema; currently `1` |
| `id`, `version` | Stable policy identity recorded in reports and plans |
| `checkers` | Enablement and non-negative score weights |
| `gates` | Minimum score, maximum severity counts, checker minimums |
| `branchProtection` | Desired effective default-branch controls |
| `repositoryMetadata` | Desired GitHub description, topics, merge hygiene, and security features |
| `security` | Recursive scan size and exclusion controls |

Use [config.example.json](../../config.example.json) as the complete starting point.

## Gates versus scores

Weights produce a summary score. Gates express non-negotiable controls. For example, `maxCritical: 0` fails a repository containing one critical finding even when all other checker scores are perfect.

Command-center profiles should set `requireVerifiedCheckers` to `branch-protection` and `repository-metadata` when authenticated GitHub facts are mandatory. Local developer profiles can leave it empty for offline evaluation.

Checker-specific runs created with `--only` apply score and severity gates to that scoped result, but apply checker-specific verification gates only when the required checker is in the requested scope. A complete evaluation still requires every configured verified checker.

For a solo-maintainer repository, set both `requiredApprovals` and `maximumRequiredApprovals` to `0`, set `prohibitCodeOwnerReviews` and `prohibitAdminEnforcement` to `true`, and retain strict status checks plus conversation resolution. List every mandatory check by its exact GitHub context name in `requiredStatusCheckContexts`; `requireStatusChecks` alone only proves that at least one check exists. The minimum preserves the existing baseline semantics; the optional maximum and prohibition controls prove that live rules have not drifted back to an approval deadlock or removed the emergency recovery path.

Classic branch protection and every active ruleset that applies to the default branch are evaluated together. For `prohibitAdminEnforcement`, every applicable ruleset must expose an organization-administrator or built-in repository-admin bypass that applies outside pull requests. GitHub hides ruleset bypass actors from tokens without write access to the ruleset, so hosted verification requires a GitHub App token with repository Administration write permission; the checker reports the control as unverified instead of guessing when those actors are unavailable. Record any administrator bypass outside the repository as a command-center audit event.

The effective branch-rules query must also succeed even when classic branch protection is readable. A failed or unavailable ruleset query makes branch-protection verification fail closed because an unseen organization ruleset could impose stricter controls.

## Organization layering

The command center should materialize one resolved policy in each evaluation workspace:

```text
organization baseline
  + repository-type overlay
  + risk-tier overlay
  + approved, expiring exception
  = resolved .repo-manager.json
```

Exceptions should be stored by the command center with an owner, rationale, approval, and expiry. The v3 engine intentionally does not silently suppress findings.

## Security exclusions

`ignoredPaths` is intended for controlled fixtures containing synthetic credentials. Keep it narrow. `ignoredDirectories` skips generated or vendored trees by directory name. Files larger than `maxFileSizeBytes` are not read by the built-in scanner.
