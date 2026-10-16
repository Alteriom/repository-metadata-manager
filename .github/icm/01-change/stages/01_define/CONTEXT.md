# 01_define — reproduction or spec

One job: for a defect, a reproduction that fails for the reported reason; for a capability, a spec a person can approve.

## Inputs
- Working (this run): the report or request — an issue, a red run (`gh run view <id> --log-failed`), a consumer's compliance output, or a person's ask.
- Reference (every run): `.github/icm/_shared/architecture.md`
- Reference (every run): `.github/icm/_shared/invariants.md`
- Reference (every run): `.github/icm/_shared/gotchas.md`
- Reference (only when the report is a red workflow run): `.github/icm/_shared/build-and-test.md`

Do NOT load: the other pipelines, other runs' output, `docs/releases/`, `docs/superpowers/`, `test/fixtures/` beyond the fixture a test names.

## Process
1. Restate the report as observed versus expected: the interface (CLI, MCP, Action, library), the command or call, the policy in force, the repository it ran on.
2. For a red run, check [gotchas.md](../../../_shared/gotchas.md) first: the administrator gate is known, and a red `npm audit` means an advisory newer than the lock.
3. For a defect: find the layer ([architecture.md](../../../_shared/architecture.md)): policy, context, a checker, scoring, planner, executor, interface. Reproduce with a Jest test against a fixture in `test/fixtures/`, or with the CLI on a scratch folder; keep the failing output.
4. For a capability: write the spec: behaviour, the interfaces it appears in, policy properties and their validation, whether it plans fixes, and which invariants it touches ([invariants.md](../../../_shared/invariants.md)).
5. If nothing fails, the reproduction or the report is wrong: say which, and stop.

## Outputs
- definition.md → output/ — the restated report or request; the layer; the failing test or command and its output, or the spec; the invariants touched; what this does not cover.

## Human check
A person runs the reproduction and confirms it fails for the reported reason, or reads the spec and approves it, before any code changes.
