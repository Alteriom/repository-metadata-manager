# Repository Metadata Manager

`@alteriom/repository-metadata-manager` v3: a policy evaluator and controlled-remediation engine for GitHub repositories (Node.js 24+). It observes a repository against `.repo-manager.json`, plans fixes deterministically, applies a plan only with explicit approval, and verifies. It is used through a CLI (`repo-manager`), an MCP server (`repo-manager-mcp`), a GitHub Action and a library. Other Alteriom repositories run it in their "Repository Metadata Compliance" job. What leaves here is a reviewed pull request on `main`, and an npm release that a person starts.

## Where things live

| Path | What it holds |
|---|---|
| `lib/` | policy, engine, checkers, planner and executor — mapped in [architecture.md](.github/icm/_shared/architecture.md); its trust boundaries in [invariants.md](.github/icm/_shared/invariants.md) |
| `bin/`, `mcp-server/`, `action.yml`, `index.js` | the CLI, the MCP server, the GitHub Action, the library entry |
| `test/` | Jest suites per layer, workflow-design tests, fixtures (`insecure-project/` holds fake secrets on purpose) |
| `scripts/` | the supervised Jest runner the compliance workflow uses for candidate code |
| `.github/workflows/` | CI, security scanning, the administrator-gated compliance check, release, `ICM check` |
| `docs/`, `README.md`, `CHANGELOG.md` | guides for policy, CLI, API, command-center integration, versioning; see [documents.md](.github/icm/_shared/documents.md) |
| `.github/copilot-instructions.md` | GitHub Copilot's file: points back here |
| [`.github/icm/_shared/`](.github/icm/_shared/CONTEXT.md) | what every job below draws on, one file per question |
| [`.github/icm/01-change/`](.github/icm/01-change/CLAUDE.md) | fix a defect or add a capability (checker, command, policy option) |
| [`.github/icm/02-release/`](.github/icm/02-release/CLAUDE.md) | cut a version and confirm what reached npm |
| [`.github/icm/03-deps/`](.github/icm/03-deps/CLAUDE.md) | review a Dependabot pull request |

## Route by what just happened

| Route | If | Go to | Then stop at |
|---|---|---|---|
| triage | an issue or report arrives and its kind is unclear | read it whole (`gh issue view <n> --comments`) and take the row below that fits | the row chosen, said to the person |
| fix | a check, a plan, an apply, the CLI, the MCP server or the Action gives the wrong answer | [01_define](.github/icm/01-change/stages/01_define/CONTEXT.md) | a person has seen the reproduction fail |
| ci-red | a workflow is red on `main` or on a pull request | [01_define](.github/icm/01-change/stages/01_define/CONTEXT.md), with the run log as the report, after reading [gotchas.md](.github/icm/_shared/gotchas.md) | a person has seen the reproduction fail |
| feature | a new checker, command, policy option or interface is asked for | [01_define](.github/icm/01-change/stages/01_define/CONTEXT.md) | a person approves the spec |
| release | a version is to be cut and published | [01_plan](.github/icm/02-release/stages/01_plan/CONTEXT.md) | a person approves the version number |
| release-check | a release workflow ran and npm must be confirmed | [03_publish](.github/icm/02-release/stages/03_publish/CONTEXT.md), with the run as the input | a person has seen the published version |
| deps | Dependabot opened a pull request | [01_review](.github/icm/03-deps/stages/01_review/CONTEXT.md) | a person decides to merge it or not |
| next | a stage's output was approved | the next numbered stage of the same job | a person reads that stage's output |
| status | asked for status | scan `.github/icm/*/stages/*/output/` | report what exists |

## Agents connecting remotely

This repository is the MemoryRelay workspace `repository-metadata-manager`, which a person creates from this repository's `main`; the Alteriom hub `portfolio` delegates to it once both exist. Until the workspace exists, an agent reads these files on a clone. An agent on a clone needs nothing: this file is the entry and the table above is the route. An agent that is not on a clone reaches the same files over MCP at `https://api.memoryrelay.net/mcp` through the `repository-metadata-manager` workspace, with a key in `MEMORYRELAY_API_KEY` (Claude Code, Codex) or as a connector that signs in (claude.ai, Claude Desktop). None of it holds a secret.

- Start with `icm_context_build` for the route that fits, not with the whole repository: a route is a few thousand tokens.
- Report what you read with `icm_report_reads` when a stage ends, and what the task came to with `icm_report_outcome`.
- Never write through MCP: a change is a branch and a pull request here, read and merged by a person.

## Rules

- Nothing moves to the next stage until a person has read the output of the last one.
- A stage writes to its own `output/`, which is not committed: one run per worktree or branch, and clear that job's `stages/*/output/` when its pull request merges or is abandoned.
- A job reads only its own run's output; moving to another job is a route above, started by the person.
- A change that touches a trust boundary keeps every invariant in [invariants.md](.github/icm/_shared/invariants.md) and adds tests for it. Run `npm run lint` and `npm test` before proposing anything.
- No agent dispatches a release, pushes a tag, runs `npm publish`, posts `/approve-command-center`, or passes a token as an argument.
- `.github/icm/` points at the files that own each fact. When they disagree, the owning file is right: correct `.github/icm/` in the same pull request, and bump its `verified_commit`.
