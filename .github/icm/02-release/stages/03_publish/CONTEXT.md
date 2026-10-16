# 03_publish — confirm what was published

One job: after a person pushed the tag or dispatched the release, confirm what reached npm and GitHub.

## Inputs
- Working (this run): `.github/icm/02-release/stages/02_prepare/output/release-pr.md`
- Reference (every run): `.github/icm/_shared/release.md`

Do NOT load: the other pipelines, other runs' output, the source tree.

## Process
1. A person pushes the reviewed tag or dispatches "Release and Publish"; the agent does neither. On the `release-check` route the input is the run the person names.
2. Read the run (`gh run list --repo Alteriom/repository-metadata-manager --workflow release.yml --limit 3`, then `gh run view <id>`): test, publish, and the GitHub release step.
3. Confirm npm (`npm view @alteriom/repository-metadata-manager dist-tags`), the GitHub release (`gh release view v<version>`), and that the published CLI runs (`npx -y @alteriom/repository-metadata-manager@<version> config` in a scratch folder) ([release.md](../../../_shared/release.md)).
4. Say what is missing: a GitHub release the dispatch path did not create, a `latest` tag not moved, a failed step.

## Outputs
- publish.md → output/ — the run and each job's result; npm dist-tags; the GitHub release; the CLI output; what a person must still do.

## Human check
A person reads `publish.md`, checks the npm page once, and decides whether anything missing must be done by hand.
