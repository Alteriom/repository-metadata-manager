# 02_change — the code and its tests

One job: make the change, with tests, keeping every invariant.

## Inputs
- Working (this run): `.github/icm/01-change/stages/01_define/output/definition.md`
- Reference (every run): `.github/icm/_shared/invariants.md`
- Reference (every run): `.github/icm/_shared/build-and-test.md`
- Reference (only when the change adds a checker, a command or a policy property): `.github/icm/_shared/architecture.md`

Do NOT load: the other pipelines, other runs' output, files outside the layer `definition.md` names.

## Process
1. Write or keep the failing test first: the reproduction for a defect, the spec's behaviour for a capability.
2. Change the cause in the layer named. A new checker subclasses `lib/engine/Checker.js` and marks a finding fixable only if it implements `plan()`; a new policy property is validated in `lib/policy/Policy.js` and fails closed on bad input ([invariants.md](../../../_shared/invariants.md)).
3. A change in `lib/control/`, `lib/policy/`, `mcp-server/`, `bin/` or a workflow adds tests for policy validation, path containment, stale state and authorization as they apply.
4. Update `README.md`, the guide under `docs/` that covers the surface, and `CHANGELOG.md` "Unreleased".
5. Run `npm run lint` and `npm test`; the new test passes and nothing else turned red beyond the failure already on `main`.

## Outputs
- change.md → output/ — the cause or the design in one paragraph; the files changed and why each; the tests added; the invariants touched and how each still holds; the command output.

## Human check
A person reads the diff beside `definition.md`: it does what was defined, every invariant touched has a test, and nothing outside the layer moved.
