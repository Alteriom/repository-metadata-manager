# Enhanced Automation Features

## Overview

The Repository Metadata Manager now includes powerful automation features designed to streamline management across all repositories in the Alteriom organization. These features leverage GitHub Apps integration to provide comprehensive cross-repository operations.

## Features

### 1. Organization-Wide Health Monitoring

Automatically monitor the health of all repositories in your organization with daily audits and alerts.

#### Usage

```bash
# Run organization health audit
npm run automation:org-health

# Or use the CLI directly
repository-manager automation --org-health --report
```

#### Automated Workflow

The health monitor runs automatically via GitHub Actions:

-   **Schedule**: Daily at 6 AM UTC
-   **Workflow**: `.github/workflows/organization-health-monitor.yml`
-   **Outputs**: Health reports, artifact uploads, and issue creation for unhealthy repositories

#### Health Criteria

-   **Documentation** (25% weight): README, CHANGELOG, LICENSE, CONTRIBUTING
-   **Security** (30% weight): Security policies, vulnerability scans, secrets detection
-   **Branch Protection** (20% weight): Protected branches, review requirements
-   **CI/CD** (25% weight): Active workflows, test coverage, build status

### 2. Missing Workflow Detection

Automatically detect repositories missing critical CI/CD workflows and generate recommendations.

#### Usage

```bash
# Detect missing workflows
npm run automation:detect-workflows

# With detailed report
repository-manager automation --detect-workflows --report --json
```

#### Features

-   Analyzes existing workflows across all repositories
-   Identifies missing CI, security scanning, and release workflows
-   Recommends templates based on repository language and type
-   Provides actionable suggestions for each repository

#### Template Recommendations

The system automatically suggests appropriate templates based on:

-   **Language**: JavaScript/TypeScript → `node-ci.yml`, Python → `python-ci.yml`, C++ → `cpp-ci.yml`
-   **IoT Projects**: Enhanced templates with firmware-specific checks
-   **AI Agents**: Specialized workflows for automation projects

### 3. Dependency Version Tracking

Track and analyze dependencies across all organization repositories to identify version conflicts and coordinate updates.

#### Usage

```bash
# Track dependencies
npm run automation:track-deps

# Export as JSON
repository-manager automation --track-deps --json > dependencies.json
```

#### Capabilities

-   Discovers all dependencies in JavaScript/TypeScript projects
-   Identifies version conflicts across repositories
-   Tracks dependency usage patterns
-   Generates compatibility reports
-   Helps coordinate breaking change rollouts

#### Output Example

```
📦 Tracking Dependencies Across Organization...

✓ repository-metadata-manager: 89 dependencies
✓ alteriom-mqtt-schema: 45 dependencies
✓ alteriom-firmware: 32 dependencies

📊 Dependency Analysis Summary:
Total dependencies tracked: 245
Repositories analyzed: 12
Dependencies with version conflicts: 8

⚠️  Version Conflicts:
  - @octokit/rest: 22.0.0, 21.0.0
  - chalk: 5.6.2, 5.3.0, 4.1.2
  - commander: 14.0.2, 13.0.0
```

### 4. Compliance Auto-Fix

Automatically fix common compliance issues across repositories, such as missing documentation files.

#### Usage

```bash
# Dry run (preview changes)
npm run automation:dry-run

# Apply fixes
npm run automation:auto-fix
```

#### Auto-Fix Capabilities

-   **Documentation**: Generate missing README, LICENSE, SECURITY.md
-   **Configuration**: Add .gitignore, .editorconfig, .prettierrc
-   **CI/CD**: Create basic workflow templates
-   **Security**: Add SECURITY.md policy files

#### Safety Features

-   **Dry Run Mode**: Preview all changes before applying
-   **Selective Application**: Target specific repositories or apply organization-wide
-   **Rollback Support**: All changes are tracked and reversible
-   **Review Required**: Critical changes require PR approval

## Workflow Integration

### Organization Health Monitor

Automated daily health monitoring with GitHub Actions:

```yaml
# .github/workflows/organization-health-monitor.yml
name: Organization Health Monitor

on:
    schedule:
        - cron: '0 6 * * *' # Daily at 6 AM UTC
    workflow_dispatch:

jobs:
    health-audit:
        # Runs comprehensive health checks
        # Creates issues for unhealthy repositories
        # Uploads detailed reports as artifacts
```

### Manual Triggers

All automation features can be triggered manually:

```bash
# Via GitHub Actions UI
# 1. Go to Actions tab
# 2. Select "Organization Health Monitor"
# 3. Click "Run workflow"
# 4. Configure options (report format, auto-fix)

# Via CLI
repository-manager automation --org-health
repository-manager automation --detect-workflows
repository-manager automation --track-deps
repository-manager automation --auto-fix --dry-run
```

## Configuration

### Environment Variables

```bash
# Required for GitHub API access
GITHUB_TOKEN=ghp_your_token_here

# Organization configuration
GITHUB_REPOSITORY_OWNER=Alteriom
ORGANIZATION_TAG=alteriom
ORGANIZATION_NAME="Alteriom Organization"
```

### Config File

Create `metadata-config.json`:

```json
{
    "owner": "Alteriom",
    "organizationTag": "alteriom",
    "organizationName": "Alteriom Organization",
    "automationSettings": {
        "healthThreshold": 70,
        "autoFixEnabled": true,
        "notificationsEnabled": true
    }
}
```

## Advanced Usage

### Custom Health Audits

```javascript
const AutomationManager = require('./lib/features/AutomationManager');

const config = {
    owner: 'Alteriom',
    token: process.env.GITHUB_TOKEN,
};

const automation = new AutomationManager(config);

// Run custom health audit
const results = await automation.runOrganizationHealthAudit({
    report: true,
});

// Filter unhealthy repositories
const critical = results.unhealthyRepos.filter((r) => r.score < 50);
```

### Workflow Template Application

```javascript
// Detect repositories needing workflows
const missing = await automation.detectMissingWorkflows({ report: true });

// Generate recommendations
for (const repo of missing.missingWorkflows) {
    console.log(`${repo.name} needs:`);
    repo.recommendations.forEach((rec) => {
        console.log(`  - ${rec.description}: ${rec.template}`);
    });
}
```

### Dependency Coordination

```javascript
// Track specific dependency
const deps = await automation.trackDependencies({ report: true });

// Find repos using old version
const outdatedRepos = deps.conflicts
    .find((c) => c.dependency === '@octokit/rest')
    .repos.filter((r) => r.version === '21.0.0');

// Coordinate update across repos
```

## Best Practices

### Health Monitoring

1. **Regular Audits**: Run health audits at least weekly
2. **Threshold Alerts**: Set appropriate health score thresholds (70-80)
3. **Action Items**: Address unhealthy repositories promptly
4. **Trend Analysis**: Track health scores over time

### Workflow Management

1. **Template Standardization**: Use consistent workflow templates
2. **Language-Specific**: Customize templates per language/framework
3. **Security First**: Always include security scanning workflows
4. **Testing Requirements**: Enforce test coverage in CI/CD

### Dependency Management

1. **Version Pinning**: Use exact versions for critical dependencies
2. **Regular Updates**: Review and update dependencies quarterly
3. **Breaking Changes**: Coordinate major version updates across repositories
4. **Compatibility Matrix**: Maintain compatibility documentation

### Compliance

1. **Documentation Standards**: Ensure all repositories have required docs
2. **Security Policies**: Apply security policies consistently
3. **Branch Protection**: Enforce branch protection on all production branches
4. **Review Process**: Require code reviews for all changes

## Troubleshooting

### Common Issues

#### No Repositories Found

**Issue**: Automation features can't discover repositories

**Solutions**:

-   Verify `GITHUB_TOKEN` has correct permissions
-   Check organization access in GitHub Apps settings
-   Ensure token has `repo` and `read:org` scopes

#### Health Audit Failures

**Issue**: Some repositories fail health audits

**Solutions**:

-   Check repository permissions (may be private or archived)
-   Verify API rate limits (GitHub provides 5000 requests/hour)
-   Run with `--report` flag for detailed error information

#### Auto-Fix Not Working

**Issue**: Compliance auto-fix doesn't apply changes

**Solutions**:

-   Ensure not in dry-run mode (`--dry-run` flag)
-   Verify write permissions on target repositories
-   Check branch protection rules (may block automated commits)

## API Reference

### AutomationManager

#### Methods

-   `runOrganizationHealthAudit(options)`: Run health audit across all repos
-   `detectMissingWorkflows(options)`: Find repos without CI/CD
-   `trackDependencies(options)`: Analyze dependency versions
-   `autoFixComplianceIssues(options)`: Fix common compliance issues

#### Options

-   `report`: boolean - Show detailed report
-   `dryRun`: boolean - Preview changes without applying
-   `target`: string - 'all' or 'current' repository
-   `json`: boolean - Output as JSON

## Examples

### Daily Health Report Script

```javascript
#!/usr/bin/env node
const AutomationManager = require('./lib/features/AutomationManager');
const fs = require('fs').promises;

async function dailyHealthReport() {
    const config = {
        owner: 'Alteriom',
        token: process.env.GITHUB_TOKEN,
    };

    const automation = new AutomationManager(config);

    // Run all audits
    const health = await automation.runOrganizationHealthAudit({
        report: true,
    });
    const workflows = await automation.detectMissingWorkflows({ report: true });
    const deps = await automation.trackDependencies({ report: true });

    // Generate report
    const report = {
        date: new Date().toISOString(),
        health,
        workflows,
        deps,
    };

    // Save to file
    await fs.writeFile('daily-report.json', JSON.stringify(report, null, 2));

    console.log('✓ Daily health report generated');
}

dailyHealthReport().catch(console.error);
```

### Auto-Fix Script

```javascript
#!/usr/bin/env node
const AutomationManager = require('./lib/features/AutomationManager');

async function autoFix() {
    const config = {
        owner: 'Alteriom',
        token: process.env.GITHUB_TOKEN,
    };

    const automation = new AutomationManager(config);

    // Fix current repository
    const results = await automation.autoFixComplianceIssues({
        dryRun: false,
        target: 'current',
    });

    console.log(`Fixed ${results.fixedCount} compliance issues`);
}

autoFix().catch(console.error);
```

## Roadmap

### Planned Features

-   **Automated PR Creation**: Create PRs for workflow templates
-   **Cross-Repository CI/CD**: Coordinate CI/CD across dependent repos
-   **IoT-Specific Automation**: Firmware version tracking, MQTT schema validation
-   **AI-Powered Recommendations**: ML-based suggestions for repository improvements
-   **Real-Time Monitoring**: Dashboard with live health metrics
-   **Custom Rules Engine**: Define custom compliance rules

### Integration Plans

-   Slack/Discord notifications
-   Email alerts for critical issues
-   Jira integration for issue tracking
-   Custom webhook endpoints

## Support

For issues or questions:

-   **GitHub Issues**: <https://github.com/Alteriom/repository-metadata-manager/issues>
-   **Documentation**: <https://github.com/Alteriom/repository-metadata-manager/blob/main/README.md>
-   **Examples**: See `examples/` directory

## License

MIT License - see LICENSE file for details
