# Version Management & Release Workflow

This document outlines the version management and release process for the Repository Metadata Manager.

## 📋 Overview

We use [Semantic Versioning](https://semver.org/) with automated release workflows:

- **PATCH** (1.0.0 → 1.0.1): Bug fixes, documentation updates
- **MINOR** (1.0.0 → 1.1.0): New features, backwards compatible
- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **PRERELEASE** (1.0.0 → 1.0.1-beta.0): Pre-release versions

## 🚀 Quick Release Commands

### Using npm scripts:

```bash
# Check if ready for release
npm run release:check

# Create releases
npm run release:patch    # Bug fixes
npm run release:minor    # New features
npm run release:major    # Breaking changes

# Pre-release (beta)
npm run release:prerelease
```

### Using the release helper:

```bash
# Check status
node release.js status

# Preview next version
node release.js preview patch
node release.js preview minor
node release.js preview major

# Check if ready for release
node release.js check

# Create releases
node release.js release patch
node release.js release minor
node release.js release major

# Dry run mode
DRY_RUN=true node release.js release patch
```

## 🔄 Release Workflow

Each release follows this automated workflow:

1. **Pre-release checks**: Lint and test validation
2. **Version bump**: Updates package.json version
3. **Git tagging**: Creates and pushes git tag (v1.0.1)
4. **Formatting**: Runs prettier on all files
5. **Git commit**: Commits version changes
6. **Git push**: Pushes changes and tags to repository
7. **NPM publish**: Publishes to npm registry
8. **GitHub release**: Creates GitHub release (via workflow)

## 📁 File Structure

```
├── .github/workflows/
│   └── release.yml          # GitHub Actions workflow
├── release.js               # Release helper script
├── CHANGELOG.md             # Version history
├── VERSIONING.md            # This file
└── package.json             # npm scripts & version
```

## 🛠️ Setup Requirements

### For Local Releases:

1. **Git configured**: User name and email set
2. **NPM authenticated**: `npm login` completed
3. **GitHub token**: For repository access (if needed)
4. **Clean working directory**: All changes committed

### For GitHub Actions:

1. **NPM_TOKEN secret**: Set in repository secrets
2. **GITHUB_TOKEN**: Automatically provided by GitHub

## 📖 Usage Examples

### Example 1: Bug Fix Release

```bash
# Make your bug fixes...
git add .
git commit -m "fix: resolve CLI argument parsing issue"

# Check if ready
npm run release:check

# Create patch release
npm run release:patch
```

### Example 2: Feature Release

```bash
# Develop new feature...
git add .
git commit -m "feat: add new validation rules"

# Preview version
node release.js preview minor

# Create minor release
npm run release:minor
```

### Example 3: Preview Before Release

```bash
# Check current status
node release.js status

# See what next version would be
node release.js preview patch

# Dry run (no actual changes)
DRY_RUN=true node release.js release patch

# Actually release
node release.js release patch
```

## 🔍 Release Process Details

### What happens during `npm run release:patch`:

1. **`prerelease` script runs**:
    - `npm run lint` - Validates code style
    - `npm run test` - Runs all tests

2. **`npm version patch`**:
    - Increments version in package.json (1.0.0 → 1.0.1)
    - Runs `version` script (formatting)
    - Creates git commit with version change
    - Creates git tag (v1.0.1)
    - Runs `postversion` script (pushes to git)

3. **`npm publish --access public`**:
    - Runs `prepublishOnly` (lint + test again)
    - Publishes to npm registry
    - Runs `postpublish` (success message)

4. **GitHub Actions** (if tag pushed):
    - Creates GitHub release
    - Updates release notes

## 🏷️ Version Tags

All releases create git tags in the format `v{version}`:

- `v1.0.0` - Initial release
- `v1.0.1` - Patch release
- `v1.1.0` - Minor release
- `v2.0.0` - Major release
- `v1.0.1-beta.0` - Pre-release

## 📝 Changelog Management

Update `CHANGELOG.md` before releases:

1. Move items from `[Unreleased]` to new version section
2. Add new `[Unreleased]` section for future changes
3. Follow [Keep a Changelog](https://keepachangelog.com/) format

## 🔐 Security & Access

### Required Permissions:

- **Repository**: Push access for tags and commits
- **NPM Registry**: Publish access for @alteriom scope
- **GitHub Actions**: Repository secrets configured

### Secrets Configuration:

```bash
# In GitHub repository settings > Secrets and variables > Actions
NPM_TOKEN=npm_your_token_here
```

## 🆘 Troubleshooting

### Common Issues:

1. **"Working directory not clean"**:

    ```bash
    git status
    git add .
    git commit -m "your changes"
    ```

2. **"npm login required"**:

    ```bash
    npm login
    # Enter your npm credentials
    ```

3. **"Permission denied"**:
    - Check NPM token has publish permissions
    - Verify you're a member of @alteriom organization

4. **"Git push failed"**:
    - Check GitHub authentication
    - Verify push permissions to repository

### Recovery Commands:

```bash
# If release fails after version bump but before publish
npm publish --access public

# If git tag wasn't pushed
git push --tags

# Check what tags exist
git tag -l

# Check current version
npm version
```

## 🎯 Best Practices

1. **Always test before releasing**:

    ```bash
    npm run release:check
    ```

2. **Use semantic commit messages**:

    ```bash
    git commit -m "feat: add new feature"
    git commit -m "fix: resolve bug"
    git commit -m "docs: update README"
    ```

3. **Update changelog regularly**:
    - Don't let changes accumulate
    - Write clear, user-focused descriptions

4. **Use pre-releases for testing**:

    ```bash
    npm run release:prerelease
    ```

5. **Verify releases**:

    ```bash
    # Check npm
    npm view @alteriom/repository-metadata-manager

    # Check GitHub
    # Visit: https://github.com/Alteriom/repository-metadata-manager/releases
    ```

This automated workflow ensures consistent, reliable releases while maintaining proper version control and documentation.
