# 02-release — cut a version and confirm it reached npm

One run is one version of `@alteriom/repository-metadata-manager`: its number decided, `CHANGELOG.md` and migration notes prepared in a pull request, the release started by a person, and what reached npm and GitHub confirmed. Releases v1.2.0 to v1.2.4 and v2.1.0 were runs of this job; v3.0.0 is waiting for one.

Stages, in order; inputs, outputs and checks for each are in [CONTEXT.md](CONTEXT.md):

1. [Plan](stages/01_plan/CONTEXT.md) — the version number, the path, and what consumers must do.
2. [Prepare](stages/02_prepare/CONTEXT.md) — the changelog and migration notes, as a pull request.
3. [Publish](stages/03_publish/CONTEXT.md) — a person starts the release; the agent confirms npm and the GitHub release.

No stage dispatches the workflow, pushes a tag or runs `npm publish`.
