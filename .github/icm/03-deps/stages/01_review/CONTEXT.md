# 01_review — review the bump

One job: decide whether the bump is safe for what uses it, with evidence.

## Inputs
- Working (this run): the pull request — `gh pr view <n> --repo Alteriom/repository-metadata-manager --comments` and its diff.
- Reference (every run): `.github/icm/_shared/build-and-test.md`
- Reference (every run): `.github/icm/_shared/gotchas.md`
- Reference (only when the bump touches a workflow action or `@modelcontextprotocol/sdk`): `.github/icm/_shared/invariants.md`

Do NOT load: the other pipelines, other runs' output, `test/fixtures/`.

## Process
1. Name each package or action that moved, from and to, and whether it crosses a major version.
2. Find what uses it: `grep` `lib/`, `bin/`, `mcp-server/` and `scripts/` for the import and the calls made on it; for an action, the workflows and the inputs passed; actions are pinned by commit sha with the version in a comment, and the bump must keep that form.
3. Read the release notes between the two versions for breaking changes in those calls and for the Node versions supported (CI runs 24).
4. Check out the branch and run `npm ci`, `npm run lint`, `npm test`, `npm audit --audit-level moderate` ([build-and-test.md](../../../_shared/build-and-test.md)).
5. Read the checks against `main`'s known failures ([gotchas.md](../../../_shared/gotchas.md)); say which red results are the bump's and which were already there.
6. Recommend merge, hold or close; note that "Compliance Check" needs an administrator's approval comment.

## Outputs
- review.md → output/ — what moved with versions; what uses it; breaking changes that touch it (or none found, with the notes read); commands run and their output; each check against `main`; the recommendation.

## Human check
A person reads `review.md` and the CI result, approves the head with `/approve-command-center` if satisfied, and decides to merge, hold or close.
