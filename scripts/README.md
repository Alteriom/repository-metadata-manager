# Scripts Directory

This directory contains utility scripts for managing the repository metadata manager package.

## Scripts Overview

### `setup-check.js`

**Purpose**: Environment verification and setup guidance  
**Usage**: `npm run env:check`

- Verifies that required environment variables are set (NPM_TOKEN, GITHUB_TOKEN)
- Checks optional environment variables
- Tests NPM authentication
- Provides instructions for GitHub repository secrets setup
- Shows current package version and available release commands

### `release.js`

**Purpose**: Release management and versioning helper  
**Usage**:

- `npm run release:status` - Show current version and git status
- `npm run release:check` - Check if ready for release (lint + test)
- `node scripts/release.js preview <type>` - Preview next version
- `node scripts/release.js release <type>` - Create and publish release

**Version Types**:

- `patch` - Bug fixes (1.0.0 → 1.0.1)
- `minor` - New features (1.0.0 → 1.1.0)
- `major` - Breaking changes (1.0.0 → 2.0.0)

### `github-secrets-setup.js`

**Purpose**: GitHub repository secrets setup helper  
**Usage**: `npm run env:setup`

- Opens GitHub secrets management page
- Provides step-by-step instructions for adding NPM_TOKEN secret
- Shows the exact token value to copy
- Cross-platform browser opening support

### `test-features.js`

**Purpose**: Local testing of repository management features  
**Usage**: `npm run test:features`

- Tests documentation analysis locally (without GitHub API)
- Demonstrates health score calculation
- Shows template generation capabilities
- Provides offline feature validation

## Environment Dependencies

All scripts automatically load environment variables from `.env` file using dotenv.

Required environment variables:

- `NPM_TOKEN` - NPM authentication token for publishing
- `GITHUB_TOKEN` - GitHub API token for repository management

Optional environment variables:

- `AGENT_ORG_TOKEN` - Alternative GitHub token for organization-wide operations
- `GITHUB_REPOSITORY_OWNER` - Repository owner name
- `GITHUB_REPOSITORY_NAME` - Repository name

## Development Workflow

1. **Environment Setup**: `npm run env:check`
2. **Feature Testing**: `npm run test:features`
3. **Development**: Make changes, add tests
4. **Pre-release Check**: `npm run release:check`
5. **Release**: `npm run release:patch|minor|major`

## File Structure

```text
scripts/
├── README.md              # This documentation
├── setup-check.js         # Environment verification
├── release.js             # Release management
├── github-secrets-setup.js # GitHub secrets helper
└── test-features.js       # Local feature testing
```
