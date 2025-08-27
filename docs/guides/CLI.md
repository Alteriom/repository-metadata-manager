# CLI Usage Guide

Complete guide for using the Repository Metadata Manager command-line interface.

## Installation

```bash
# Local installation (recommended)
npm install --save-dev @alteriom/repository-metadata-manager

# Global installation
npm install -g @alteriom/repository-metadata-manager
```

## Quick Start

```bash
# Run interactive mode for guided setup
npx repository-manager interactive

# Or use the enhanced CLI
npx repository-manager health
```

## Available Commands

### Health Management

#### Overall Health Check
```bash
# Comprehensive repository health analysis
repository-manager health

# Get detailed health report
repository-manager health --detailed

# Export health report to JSON
repository-manager health --output health-report.json
```

#### Documentation Audit
```bash
# Audit documentation compliance
repository-manager docs

# Audit with automatic fixes
repository-manager docs --audit --fix

# Generate missing documentation files
repository-manager docs --generate
```

#### Security Audit
```bash
# Security compliance check
repository-manager security

# Detailed security audit
repository-manager security --audit

# Apply security recommendations
repository-manager security --audit --apply
```

#### Branch Protection
```bash
# Audit branch protection rules
repository-manager branches

# Apply recommended protection rules
repository-manager branches --audit --apply

# Configure specific branch
repository-manager branches --branch main --apply
```

#### CI/CD Management
```bash
# Audit CI/CD pipelines
repository-manager cicd

# Generate workflow templates
repository-manager cicd --audit --generate

# Apply recommended workflows
repository-manager cicd --audit --apply
```

### Compliance Management

#### Full Compliance Check
```bash
# Run all compliance checks
repository-manager compliance

# Compliance with auto-fix
repository-manager compliance --fix

# Compliance report export
repository-manager compliance --output compliance-report.json
```

#### Interactive Mode
```bash
# Guided interactive setup
repository-manager interactive

# Interactive with specific focus
repository-manager interactive --focus security
repository-manager interactive --focus documentation
```

## Configuration

### Using Configuration File

Create `metadata-config.json`:

```json
{
  "organizationTag": "myorg",
  "repositoryType": "library",
  "customTopics": {
    "api": ["api", "backend", "server"],
    "frontend": ["frontend", "ui", "web"]
  },
  "organizationName": "My Organization"
}
```

### Environment Variables

```bash
# GitHub token (required for GitHub operations)
export GITHUB_TOKEN=your_github_token

# Repository information (auto-detected if not provided)
export GITHUB_OWNER=your-org
export GITHUB_REPO=your-repo
```

### Command Line Options

#### Global Options

```bash
--config <path>      # Custom config file path
--token <token>      # GitHub token override
--owner <owner>      # Repository owner override
--repo <repo>        # Repository name override
--verbose           # Verbose output
--quiet             # Quiet mode (minimal output)
--dry-run           # Show what would be done without making changes
```

#### Output Options

```bash
--output <file>     # Export results to file
--format <format>   # Output format: json, csv, markdown
--no-color          # Disable colored output
```

## Advanced Usage

### Scripting and Automation

#### Package.json Scripts

```json
{
  "scripts": {
    "health": "repository-manager health",
    "docs:audit": "repository-manager docs --audit",
    "security:check": "repository-manager security --audit",
    "compliance": "repository-manager compliance --fix",
    "setup:repo": "repository-manager interactive"
  }
}
```

#### CI/CD Integration

```yaml
# GitHub Actions example
name: Repository Health Check
on: [push, pull_request]

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm install @alteriom/repository-metadata-manager
      
      - name: Run Health Check
        run: npx repository-manager health --output health-report.json
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Upload Health Report
        uses: actions/upload-artifact@v3
        with:
          name: health-report
          path: health-report.json
```

### Batch Operations

#### Multiple Repositories

```bash
# Using with GitHub CLI for multiple repos
gh repo list myorg --limit 50 --json name | \
  jq -r '.[].name' | \
  xargs -I {} repository-manager health --owner myorg --repo {}
```

#### Organization-wide Setup

```bash
# Setup script for all repositories
#!/bin/bash
for repo in $(gh repo list myorg --json name -q '.[].name'); do
  echo "Processing $repo..."
  repository-manager compliance --owner myorg --repo $repo --fix
done
```

## Output Examples

### Health Check Output

```
🏥 REPOSITORY HEALTH ANALYSIS
========================================
Repository: myorg/myrepo
Overall Score: 85/100 🟢

📊 COMPONENT SCORES:
  Documentation: 92/100 🟢
  Security: 78/100 🟡
  CI/CD: 85/100 🟢
  Branch Protection: 90/100 🟢
  Code Quality: 80/100 🟡

💡 TOP RECOMMENDATIONS:
1. Enable vulnerability alerts
2. Add security policy (SECURITY.md)
3. Configure branch protection for develop branch
4. Add code coverage reporting

📈 IMPROVEMENT TRACKING:
  Score improved by +12 points since last check
  5 recommendations completed
  3 new recommendations identified
```

### Documentation Audit Output

```
📋 DOCUMENTATION COMPLIANCE AUDIT
==================================
Overall Score: 95/100 🟢

📁 FILE STATUS:
✅ README.md           100% (30/30)
✅ CHANGELOG.md        100% (15/15)
✅ CONTRIBUTING.md     90% (13/15)
✅ LICENSE            100% (15/15)
❌ CODE_OF_CONDUCT.md  0% (0/10)

💡 RECOMMENDATIONS:
1. Create CODE_OF_CONDUCT.md
2. Add development setup to CONTRIBUTING.md
3. Consider adding API documentation
```

## Troubleshooting

### Common Issues

#### Authentication Errors

```bash
# Verify token has required permissions
repository-manager health --verbose

# Use token from environment
export GITHUB_TOKEN=your_token
repository-manager health
```

#### Configuration Issues

```bash
# Validate configuration
repository-manager --config metadata-config.json health --dry-run

# Use default configuration
repository-manager health --config-reset
```

#### Rate Limiting

```bash
# Check rate limit status
repository-manager --verbose health

# Use authenticated requests to increase limits
export GITHUB_TOKEN=your_token
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=repository-manager:* repository-manager health

# Verbose output
repository-manager health --verbose --debug
```

## Integration Examples

### Pre-commit Hooks

```bash
# .githooks/pre-commit
#!/bin/bash
npx repository-manager docs --audit --quiet
if [ $? -ne 0 ]; then
  echo "Documentation compliance check failed"
  exit 1
fi
```

### VS Code Tasks

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Repository Health Check",
      "type": "shell",
      "command": "npx",
      "args": ["repository-manager", "health"],
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always"
      }
    }
  ]
}
```

For more information, see the [API Reference](../development/API.md) and [Configuration Guide](../guides/ENVIRONMENT.md).
