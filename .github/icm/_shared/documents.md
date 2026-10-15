---
verified_at: 2026-10-15
verified_commit: d5daf2275e14b98526f8b4b61ac7bda226efa9da
---

# Documents — what a contributor reads, and who owns its facts

The agent-facing files are `CLAUDE.md` (the entry) and this `_shared/` folder; `.github/copilot-instructions.md` points back to them. The documents below are read by people; each restates facts the code owns, and the code is right when they disagree.

## Pinned

| Document | What it answers | Owner of the facts | Last changed |
|---|---|---|---|
| [README.md](../../../README.md) | what v3 does, usage, policy example, checks, Action, MCP, API | `bin/repo-manager.js`, `lib/`, `action.yml`, `mcp-server/index.js` | 2026-08-20 |
| [CHANGELOG.md](../../../CHANGELOG.md) | what changed, including the unreleased v3 work | itself | 2026-08-20 |
| [docs/guides/POLICY.md](../../../docs/guides/POLICY.md) | the policy schema, gates, organisation layering, security exclusions | `lib/policy/Policy.js` | 2026-08-20 |
| [docs/guides/CLI.md](../../../docs/guides/CLI.md) | evaluate, plan, apply, inventory, configuration | `bin/repo-manager.js` | 2026-08-19 |
| [docs/development/API.md](../../../docs/development/API.md) | the library API and a custom checker | `index.js`, `lib/engine/` | 2026-08-19 |
| [docs/development/VERSIONING.md](../../../docs/development/VERSIONING.md) | how a release is cut | `.github/workflows/release.yml` | 2026-08-19 |
| [docs/COMMAND_CENTER.md](../../../docs/COMMAND_CENTER.md) | the trust model, solo-maintainer controls, reconciliation, MCP deployment | `.github/workflows/ai-agent-compliance.yml`, `.repo-manager.json`, `mcp-server/index.js` | 2026-08-20 |
| [mcp-server/README.md](../../../mcp-server/README.md) | configuring the MCP server and its apply capability | `mcp-server/index.js` | 2026-08-19 |

## Not pinned, on purpose

- `docs/releases/RELEASE_NOTES_v1.*.md` describe 1.x releases; history only.
- `docs/superpowers/` holds the March 2026 v2 rewrite's design and plan ([architecture.md](architecture.md)).
- `CONTRIBUTING.md` is pinned nowhere until its drift is fixed (below).

## Known drift

| Where | What it says | What is true, and who owns it |
|---|---|---|
| `CONTRIBUTING.md` "Development Setup" | `npm run docs`, `security`, `branchprotection`, `cicd`, `test:features`; copy `config.example.json` to `config.json` | none of those scripts exist (`package.json` "scripts"); policy lives in `.repo-manager.json` ([docs/guides/POLICY.md](../../../docs/guides/POLICY.md)) |
| `CONTRIBUTING.md` "Use a Consistent Coding Style" | 2-space indentation | 4 (`.prettierrc`) |
