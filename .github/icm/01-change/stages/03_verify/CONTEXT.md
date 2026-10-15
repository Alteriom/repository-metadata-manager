# 03_verify — checks and the pull request

One job: prove the change the way CI will, and propose it.

## Inputs
- Working (this run): `.github/icm/01-change/stages/02_change/output/change.md`
- Reference (every run): `.github/icm/_shared/build-and-test.md`
- Reference (every run): `.github/icm/_shared/gotchas.md`

Do NOT load: the other pipelines, other runs' output.

## Process
1. Run what CI runs ([build-and-test.md](../../../_shared/build-and-test.md)): `npm ci`, `npm run lint`, `npm run test:core`, the CLI smoke, `npm pack --dry-run`, `npm audit --audit-level moderate`.
2. Branch from `main`, commit with a Conventional Commit message (`fix:`, `feat:`, `docs:`), open the pull request with `gh pr create --base main`: the definition, the change, the tests, the invariants touched, and the command output.
3. Read every check. A failure caused by the change is fixed and pushed. A failure already on `main` (the trusted-runner test, `npm audit`) is named with the run on `main` that shows it ([gotchas.md](../../../_shared/gotchas.md)).
4. Say in the pull request that "Compliance Check" needs an administrator's `/approve-command-center <head sha>` comment; never post it.

## Outputs
- pull-request.md → output/ — the pull request URL; each check's result, with known failures marked and their evidence; the head sha the administrator must approve.

## Human check
A repository administrator reads `pull-request.md` and the diff, comments `/approve-command-center <sha>` if satisfied, and decides whether to merge.
