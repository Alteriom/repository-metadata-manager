# 01_plan — the version and the path

One job: propose the version number and how it will be published, with what consumers must do.

## Inputs
- Working (this run): the request — a person's ask, or the "Unreleased" section of `CHANGELOG.md`.
- Reference (every run): `.github/icm/_shared/release.md`
- Reference (every run): `.github/icm/_shared/architecture.md`
- Reference (only when `main` has red checks): `.github/icm/_shared/gotchas.md`

Do NOT load: the other pipelines, other runs' output, `docs/releases/`.

## Process
1. Read `CHANGELOG.md` "Unreleased", `package.json` "version", npm's `dist-tags` and the newest tag ([release.md](../../../_shared/release.md)).
2. Propose the number by semantic versioning: major for a changed command, report shape, policy schema or default.
3. Choose the path: a reviewed tag when `package.json` already holds the number (as 3.0.0 does today), a dispatch with `patch`, `minor` or `major` otherwise; say the exact version each would produce.
4. Say what consumers must do: the range they pin (Alteriom/alteriom-docker-images pins `^2.1.0`), commands or policy properties that changed, migration steps.
5. Name what blocks a release today: red checks on `main` that the workflow's lint and `test:core` would also fail.

## Outputs
- plan.md → output/ — current versions; the proposed number and why; the path and the version it produces; consumer impact and migration steps; blockers.

## Human check
A person reads `plan.md` and approves the version number and the path, or names others.
