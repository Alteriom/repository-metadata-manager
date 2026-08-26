# Versioning and release

The package follows semantic versioning. Version 3 is a major release because it changes remediation from implicit `fix` writes to explicit plan and approved apply.

Releases are created only by `.github/workflows/release.yml` from `main` or by pushing an already-reviewed version tag. Local `npm publish` convenience scripts are intentionally not provided.

## Release checklist

1. Update `CHANGELOG.md` and migration documentation.
2. Confirm `npm ci`, lint, tests, coverage, package smoke tests, and audits pass.
3. Merge the reviewed release content to `main`.
4. Dispatch `Release and Publish` with the semantic version increment.
5. Verify the npm package, GitHub release, installed CLI, and MCP server.

The workflow serializes releases, updates both package manifests using `npm version --no-git-tag-version`, creates the version commit and tag, publishes to npm, and creates a GitHub release.

Required secret: `NPM_TOKEN`. `GITHUB_TOKEN` is provided by GitHub Actions and receives only the workflow permissions declared in the release workflow.
