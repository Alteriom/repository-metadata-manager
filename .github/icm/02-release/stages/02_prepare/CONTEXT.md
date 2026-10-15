# 02_prepare — the release pull request

One job: put the approved version's notes in a pull request, with the checks the release workflow will run.

## Inputs
- Working (this run): `.github/icm/02-release/stages/01_plan/output/plan.md`
- Reference (every run): `.github/icm/_shared/release.md`
- Reference (every run): `.github/icm/_shared/build-and-test.md`

Do NOT load: the other pipelines, other runs' output.

## Process
1. Move `CHANGELOG.md` "Unreleased" under the approved version and date; add migration notes where `plan.md` lists consumer steps (README, `docs/guides/`).
2. Change `package.json` and `package-lock.json` "version" only when the plan's path is a tag and they do not already hold the number.
3. Run `npm ci`, `npm run lint`, `npm run test:core`, `npm pack --dry-run` and the CLI smoke ([build-and-test.md](../../../_shared/build-and-test.md)); the release workflow runs lint and `test:core` again before publishing.
4. Open the pull request with `gh pr create --base main` titled `chore: prepare v<version>`; note that it needs an administrator's `/approve-command-center` comment.

## Outputs
- release-pr.md → output/ — the pull request URL; the notes added; the command output; the exact step a person takes after the merge (the tag to push, or the dispatch input).

## Human check
A person reads `release-pr.md` and the notes, merges the pull request, and then takes the step it names.
