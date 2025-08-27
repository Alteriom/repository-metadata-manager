# Repository Metadata Manager

[![npm version](https://badge.fury.io/js/@alteriom%2Frepository-metadata-manager.svg)](https://badge.fury.io/js/@alteriom%2Frepository-metadata-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](https://github.com/Alteriom/repository-metadata-manager)
[![npm downloads](https://img.shields.io/npm/dm/@alteriom/repository-metadata-manager.svg)](https://www.npmjs.com/package/@alteriom/repository-metadata-manager)

**🚀 Complete Repository Compliance and Health Management Suite for GitHub Organizations**

A comprehensive utility for managing GitHub repository metadata, security, documentation, CI/CD pipelines, and overall repository health to ensure compliance with organization standards.

## 🎯 Purpose

This enterprise-grade tool addresses comprehensive repository management needs:

- **📊 Repository Health Scoring**: Calculate overall repository health with weighted scoring
- **🔒 Security Management**: Security audits, vulnerability detection, and policy enforcement  
- **🛡️ Branch Protection**: Automated branch protection rule management
- **📚 Documentation Standards**: Quality analysis and auto-generation of documentation
- **⚙️ CI/CD Pipeline Management**: Workflow analysis and template generation
- **🎯 Compliance Automation**: Full compliance checking with auto-fix capabilities
- **📋 Interactive Management**: User-friendly CLI with guided workflows

## 📦 Installation

### Option 1: Install as NPM Package (Recommended)

```bash
npm install --save-dev @alteriom/repository-metadata-manager
```

### Option 2: Global Installation

```bash
npm install -g @alteriom/repository-metadata-manager
```

## 🚀 Quick Start

### 1. Create Configuration File

Create a `metadata-config.json` file:

```json
{
    "organizationTag": "myorg"
}
```

### 2. Add to package.json scripts

```json
{
    "scripts": {
        "health": "repository-manager health",
        "security": "repository-manager security --audit",
        "compliance": "repository-manager compliance"
    }
}
```

### 3. Calculate repository health

```bash
npm run health
```

### 4. Run full compliance check

```bash
# View compliance report
npm run compliance

# Apply automatic fixes
npm run compliance --fix
```

### 5. Interactive mode

```bash
npm run interactive
```

## 📋 Enhanced Commands

| Command     | Description                                          |
| ----------- | ---------------------------------------------------- |
| `health`    | Calculate overall repository health score (0-100)   |
| `security`  | Security audit and vulnerability detection          |
| `branches`  | Branch protection analysis and enforcement          |
| `docs`      | Documentation quality assessment and generation     |
| `cicd`      | CI/CD workflow analysis and template generation     |
| `compliance`| Full compliance check with auto-fix capabilities    |
| `interactive`| Interactive wizard for guided repository management |

### Original Metadata Commands

| Command    | Description                                             |
| ---------- | ------------------------------------------------------- |
| `report`   | Generate compliance report with recommendations         |
| `validate` | Check if current metadata meets compliance requirements |
| `dry-run`  | Preview what changes would be made                      |
| `apply`    | Apply recommended changes (requires GitHub token)       |

## ⚙️ Configuration

### Environment Variables (.env file) - Recommended

Create a `.env` file for local development:

```bash
# Copy the example file
cp .env.example .env

# Edit with your tokens
NPM_TOKEN=npm_your_token_here
GITHUB_TOKEN=ghp_your_github_token_here
ORGANIZATION_TAG=alteriom
```

All CLI commands will automatically load the `.env` file. See [ENVIRONMENT.md](ENVIRONMENT.md) for detailed setup instructions.

### Configuration File (Alternative)

Create a `metadata-config.json` file:

```json
{
    "organizationTag": "myorg",
    "organizationName": "My Organization",
    "packagePath": "./package.json",
    "repositoryType": "auto-detect",
    "customTopics": {
        "ai-agent": ["automation", "github-integration", "compliance"],
        "api": ["api", "backend", "server"],
        "frontend": ["frontend", "ui", "web"],
        "cli-tool": ["cli", "tool", "command-line"],
        "library": ["library", "package", "sdk"],
        "general": ["utility"]
    }
}
```

### Environment Variables

```bash
# GitHub API access
GITHUB_TOKEN=ghp_your_token_here
# or
AGENT_ORG_TOKEN=ghp_your_token_here

# Repository identification (auto-detected from git if not set)
GITHUB_REPOSITORY_OWNER=your-org
GITHUB_REPOSITORY_NAME=your-repo-name
```

### Command Line Options

```bash
repository-metadata report --owner myorg --repo my-repo --org-tag myorg --token ghp_xxx
```

| Option           | Description                 | Default                       |
| ---------------- | --------------------------- | ----------------------------- |
| `--owner`        | Repository owner            | Auto-detected from git remote |
| `--repo`         | Repository name             | Auto-detected from git remote |
| `--token`        | GitHub API token            | From environment variables    |
| `--package-path` | Path to package.json        | `./package.json`              |
| `--org-tag`      | Organization tag for topics | **REQUIRED**                  |
| `--config`       | Configuration file path     | None                          |

## 🏗️ How It Works

1. **Reads** your `package.json` for description and keywords
2. **Analyzes** repository type (ai-agent, api, frontend, library, etc.)
3. **Generates** appropriate topics based on content and type
4. **Validates** current GitHub repository metadata
5. **Provides** exact values and instructions for fixes

## 📖 Example Output

```bash
$ npm run metadata:report

🔍 Generating repository metadata compliance report...

📋 Current Repository Metadata:
  Description: ""
  Topics: []

📦 Package.json Metadata:
  Description: "AI-powered repository review agent"
  Keywords: [ai-agent, automation, github]

❌ Compliance Issues Found:
  • Missing repository description
  • Missing repository topics/tags for discoverability

🎯 Recommended Changes:
  Description: "AI-powered repository review agent"
  Topics: [myorg, ai-agent, automation, github, github-integration, compliance]
```

- **ai-agent**: automation, github-integration, compliance
- **api**: api, backend, server
- **frontend**: frontend, ui, web
- **cli-tool**: cli, tool, command-line
- **library**: library, package, sdk
- **general**: utility

## 🎨 Manual Setup Instructions

If you can't use npm scripts, you can run the tool directly:

```bash
# Using npx
npx @alteriom/repository-metadata-manager report

# Using node (if files copied locally)
node scripts/utility/repository-metadata-manager.js report
```

## 🏢 Organization-Wide Deployment

### For Repository Maintainers

1. **Add to package.json**:

    ```bash
    npm install --save-dev @alteriom/repository-metadata-manager
    ```

2. **Add scripts**:

    ```json
    {
        "scripts": {
            "metadata:report": "alteriom-metadata report",
            "metadata:validate": "alteriom-metadata validate",
            "metadata:apply": "alteriom-metadata apply",
            "metadata:dry-run": "alteriom-metadata dry-run"
        }
    }
    ```

3. **Run compliance check**:
    ```bash
    npm run metadata:validate
    ```

### For Organization Admins

1. **Create organization template** with the tool pre-installed
2. **Add to CI/CD** to automatically check compliance
3. **Use in GitHub Actions** for automated compliance checking

## 📝 Example GitHub Actions Integration

```yaml
name: Repository Compliance Check
on: [push, pull_request]

jobs:
    metadata-compliance:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with:
                  node-version: '18'
            - run: npm install
            - run: npm run metadata:validate
              env:
                  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 🤝 Contributing

This tool is designed to be extended and customized for your organization's needs:

1. **Fork** or copy the package
2. **Modify** the `generateRecommendedTopics()` method for your topic strategy
3. **Update** the `organizationTag` configuration
4. **Customize** validation rules in `validateMetadata()`

## 📄 License

MIT License - feel free to use and modify for your organization.

## 🆘 Support

- **Issues**: Report bugs or request features
- **Documentation**: Check the main repository docs
- **Organization Standards**: Refer to Alteriom organization guidelines
