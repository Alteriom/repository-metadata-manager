# Environment Configuration

This document explains how to set up and manage environment variables for the Repository Metadata Manager.

## 🔧 Local Development Setup

### 1. Environment File Setup

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Then edit `.env` with your actual tokens:

```bash
# Repository Metadata Manager - Environment Variables

# NPM Authentication Token (for publishing packages)
NPM_TOKEN=npm_your_actual_token_here

# GitHub API Token (for repository metadata operations)  
GITHUB_TOKEN=ghp_your_github_token_here

# Repository identification (auto-detected from git if not set)
GITHUB_REPOSITORY_OWNER=Alteriom
GITHUB_REPOSITORY_NAME=repository-metadata-manager

# Organization settings
ORGANIZATION_TAG=alteriom
```

### 2. Token Setup

#### NPM Token
1. Go to https://www.npmjs.com/settings/tokens
2. Generate new token → "Automation" or "Publish"
3. Copy the token (starts with `npm_`)
4. Add to `.env` file

#### GitHub Token
1. Go to https://github.com/settings/tokens
2. Generate new token → "Fine-grained" or "Classic"
3. Select scopes: `repo` (full repository access)
4. Copy the token (starts with `ghp_`)
5. Add to `.env` file

### 3. Verification

Check that your environment is properly configured:

```bash
npm run env:check
```

This will verify:
- ✅ NPM authentication
- ✅ GitHub API access
- ✅ Package permissions
- ✅ Environment variables loaded

## 📁 File Structure

```
├── .env                 # Your local environment variables (DO NOT COMMIT)
├── .env.example         # Template for environment setup
├── .gitignore           # Ensures .env is not committed
└── package.json         # Contains env:check script
```

## 🚀 Usage

### CLI Commands (with .env loaded automatically)

```bash
# Generate compliance report
npm run metadata:report

# Validate current metadata
npm run metadata:validate

# Apply recommended changes
npm run metadata:apply

# Preview changes (dry run)
npm run metadata:dry-run

# Check environment setup
npm run env:check
```

### Direct Node.js Usage

```bash
# Load .env and run CLI directly
node -r dotenv/config bin/cli.js report --org-tag alteriom

# Load .env and run release helper
node -r dotenv/config release.js status
```

### Programmatic Usage

```javascript
// Load environment variables
require('dotenv').config();

const RepositoryMetadataManager = require('@alteriom/repository-metadata-manager');

// Environment variables are now available in process.env
const manager = new RepositoryMetadataManager({
    token: process.env.GITHUB_TOKEN,
    organizationTag: process.env.ORGANIZATION_TAG
});
```

## 🔐 Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NPM_TOKEN` | NPM authentication token for publishing | `npm_2xVDaCUbJMTIH1YKy...` |
| `GITHUB_TOKEN` | GitHub API token for repository access | `ghp_K6ttKQWjMJpSe4CY...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GITHUB_REPOSITORY_OWNER` | Repository owner | Auto-detected from git |
| `GITHUB_REPOSITORY_NAME` | Repository name | Auto-detected from git |
| `ORGANIZATION_TAG` | Default organization tag | None |
| `PACKAGE_PATH` | Path to package.json | `./package.json` |
| `AGENT_ORG_TOKEN` | Alternative GitHub token | None |

### Development Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DEBUG` | Enable debug output | `false` |
| `VERBOSE` | Enable verbose logging | `false` |
| `DRY_RUN` | Enable dry-run mode for testing | `false` |

## 🚨 Security Notes

### ⚠️ Important Security Practices

1. **Never commit `.env` files** - They contain sensitive tokens
2. **Use different tokens** for development vs production
3. **Rotate tokens regularly** - Generate new tokens periodically
4. **Limit token permissions** - Only grant necessary scopes
5. **Use organization secrets** for GitHub Actions

### 🔒 Token Permissions

#### NPM Token Scopes
- **Automation**: For CI/CD publishing
- **Publish**: For manual publishing
- **Read-only**: For checking package info

#### GitHub Token Scopes
- **repo**: Full repository access (required)
- **public_repo**: Public repository access only
- **admin:org**: Organization administration (if needed)

## 🔄 Environment Inheritance

The system loads environment variables in this order:

1. **System environment variables**
2. **Shell environment variables**  
3. **`.env` file** (overrides system vars)
4. **Command line arguments** (highest priority)

Example:
```bash
# System environment
export ORGANIZATION_TAG=system-org

# .env file
ORGANIZATION_TAG=env-file-org

# Command line (wins)
node bin/cli.js report --org-tag command-line-org
```

## 🧪 Testing Environment Setup

### Test Local Environment

```bash
# Check all environment variables
npm run env:check

# Test specific functionality
npm run metadata:validate

# Test release system
node release.js check
```

### Test Different Environments

```bash
# Test with custom .env file
node -r dotenv/config -e "require('dotenv').config({path: '.env.test'})" bin/cli.js report

# Test without .env (using system vars only)
node bin/cli.js report --org-tag test
```

## 🆘 Troubleshooting

### Common Issues

1. **"ENEEDAUTH" error**:
   ```bash
   # Check NPM authentication
   npm whoami
   # If not logged in:
   npm login
   ```

2. **"Token not accessible" error**:
   ```bash
   # Check GitHub token permissions
   curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
   ```

3. **".env file not loading"**:
   ```bash
   # Verify file exists and is readable
   ls -la .env
   # Check file contents (be careful with sensitive data)
   head -n 5 .env
   ```

4. **"Variables not set" error**:
   ```bash
   # Debug environment loading
   node -e "require('dotenv').config(); console.log(process.env.NPM_TOKEN ? 'NPM_TOKEN loaded' : 'NPM_TOKEN missing')"
   ```

### Recovery Commands

```bash
# Reset environment
rm .env
cp .env.example .env
# Edit .env with your tokens

# Regenerate tokens
# 1. NPM: https://www.npmjs.com/settings/tokens
# 2. GitHub: https://github.com/settings/tokens

# Test setup
npm run env:check
```

This environment setup ensures secure, flexible configuration management for both local development and production environments.
