---
verified_at: 2026-10-15
verified_commit: d5daf2275e14b98526f8b4b61ac7bda226efa9da
---

# Release — how a version reaches npm

The package is `@alteriom/repository-metadata-manager` on the public npm registry (`package.json` "name", "publishConfig"). Only `.github/workflows/release.yml` publishes; there is no local publish script ([docs/development/VERSIONING.md](../../../docs/development/VERSIONING.md)). A person starts it; no agent dispatches it, pushes a tag or runs `npm publish`.

- **Two paths** (`.github/workflows/release.yml`): a person dispatches "Release and Publish" on `main` with `patch`, `minor`, `major` or `prerelease`; the job runs `npm version <type>` from the version already in `package.json`, commits, tags, pushes both to `main`, and publishes (`.github/workflows/release.yml:40-78`). Or a person pushes a reviewed tag `v*.*.*`; that publishes `package.json` as it is and creates the GitHub release (`.github/workflows/release.yml:80-97`). Both run lint and `test:core` first. Secret: `NPM_TOKEN`.
- **Before a release**: `CHANGELOG.md` "Unreleased" moves under the version, migration notes are written, and the checklist in [docs/development/VERSIONING.md](../../../docs/development/VERSIONING.md) holds.
- **State today**: `package.json` says `3.0.0`, while npm's `latest` and the newest tag are `2.1.0`, and `CHANGELOG.md` keeps the v3 work under "Unreleased". A dispatch would publish the next version after 3.0.0, so 3.0.0 itself goes out through a reviewed `v3.0.0` tag.
- **Confirming a release**: `npm view @alteriom/repository-metadata-manager dist-tags`, `gh release view v<version> --repo Alteriom/repository-metadata-manager`, and `npx -y @alteriom/repository-metadata-manager@<version> config` in a scratch folder.
