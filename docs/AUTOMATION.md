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

# With trend analysis
npm run automation:org-health-trending

# Or use the CLI directly
repository-manager automation --org-health --report

# With trend analysis and parallel processing
repository-manager automation --org-health --report --trending

# Adjust parallel processing concurrency
repository-manager automation --org-health --concurrency 10
```

#### Automated Workflow

The health monitor runs automatically via GitHub Actions:

-   **Schedule**: Daily at 6 AM UTC
-   **Workflow**: `.github/workflows/organization-health-monitor.yml`
-   **Outputs**: Health reports, artifact uploads, and intelligent issue management
-   **Performance**: Parallel processing with concurrency control (5 repos at a time by default)
-   **Historical Tracking**: Automatically saves and compares health data over time

#### Issue Management

The workflow intelligently manages GitHub issues to avoid duplicates:

-   **Single Issue**: Only one health alert issue is maintained at a time (identified by `automation` and `health-monitor` labels)
-   **Updates**: If unhealthy repositories are found and an issue exists, it updates the existing issue with current data
-   **Auto-Creation**: If no issue exists, creates a new one with unhealthy repository details
-   **Auto-Closure**: When all repositories become healthy, automatically closes the existing issue with a success comment

#### Health Criteria

-   **Documentation** (25% weight): README, CHANGELOG, LICENSE, CONTRIBUTING
-   **Security** (30% weight): Security policies, vulnerability scans, secrets detection
-   **Branch Protection** (20% weight): Protected branches, review requirements
-   **CI/CD** (25% weight): Active workflows, test coverage, build status

#### Trend Analysis & Historical Tracking ✨ NEW

Track repository health over time with automatic trend analysis:

-   **Historical Data**: Automatically saved to `.health-history/` directory
-   **Trend Indicators**: Shows improvement (📈), decline (📉), or stable (➡️) trends
-   **Comparison Period**: Compares with the most recent previous audit
-   **Repository-Level Trends**: Individual repository score changes
-   **Organization-Level Trends**: Overall average score and unhealthy repo count changes

**Example Output**:
```
📈 Trend Analysis:
Comparing with data from 1 days ago (2025-11-04)

📈 Average Score: +2.3 points
✅ Unhealthy Repos: -2

✨ Improved (5):
  ↗ alteriom-firmware: +5.2 points
  ↗ alteriom-mqtt-schema: +3.1 points
  ↗ repository-metadata-manager: +2.8 points
  ...

⚠️  Declined (2):
  ↘ alteriom-data-analytics: -4.5 points
  ↘ alteriom-config-manager: -1.2 points
```

#### Performance Optimization ✨ NEW

Parallel processing dramatically improves audit speed for large organizations:

-   **Parallel Mode**: Process multiple repositories simultaneously (default)
-   **Concurrency Control**: Limit parallel operations to avoid rate limiting (default: 5)
-   **Sequential Mode**: Available via `--sequential` flag for constrained environments
-   **Speed Improvement**: Up to 5x faster for organizations with 20+ repositories

**Performance Example**:
- 27 repositories, sequential: ~3-4 minutes
- 27 repositories, parallel (concurrency=5): ~45-60 seconds
- 27 repositories, parallel (concurrency=10): ~30-45 seconds

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

### 5. Repository Categorization ✨ NEW

Automatically categorize repositories by type and characteristics for better organization and targeted management.

#### Usage

```bash
# Categorize all repositories
npm run automation:categorize

# Export as JSON
repository-manager automation --categorize --json
```

#### Categories

The system detects and categorizes repositories into:

-   **🎨 Frontend**: Web UIs, React/Vue/Angular applications
-   **⚙️ Backend**: Servers, APIs, backend services
-   **🔌 IoT**: IoT platforms, sensor networks
-   **💾 Firmware**: Embedded systems, ESP32/Arduino code
-   **📚 Library**: SDKs, utilities, schemas
-   **📖 Documentation**: Documentation repositories
-   **🏗️ Infrastructure**: Configuration, deployment tools
-   **🔧 Tools**: Automation, CLI tools, managers
-   **📦 Other**: Miscellaneous repositories

#### Example Output

```
🏷️  Categorizing Repositories...

🔧 TOOLS: 3 repos
  - repository-metadata-manager
  - alteriom-ai-agent
  - alteriom-webhook-server

💾 FIRMWARE: 2 repos
  - alteriom-firmware
  - painlessMesh

🔌 IOT: 4 repos
  - alteriom-IoT-server
  - alteriom-mqtt-schema
  - EByte_LoRa_E220_Series_Library
  - alteriom-pcb
```

### 6. Smart Prioritization ✨ NEW

Automatically prioritize fixes based on impact, effort, and repository health to maximize efficiency.

#### Usage

```bash
# Show prioritized fixes
npm run automation:prioritize

# With batch suggestions
repository-manager automation --prioritize --batch-suggestions

# Group similar issues
repository-manager automation --prioritize --group-by-similarity

# Show top 20 priorities
repository-manager automation --prioritize --top-n 20
```

#### Priority Calculation

Fixes are prioritized using the formula:
```
Priority = (Impact × 2 - Effort) × Score Multiplier
```

**Impact Factors** (0-10):
-   Security vulnerabilities: 10
-   Missing critical docs: 9
-   Branch protection: 8
-   Missing CI/CD: 8
-   Documentation quality: 6
-   Code quality: 4

**Effort Factors** (0-10):
-   Low effort (1-3): Quick wins like adding files
-   Medium effort (4-6): Configuration changes
-   High effort (7-10): Major refactoring or security fixes

**Score Multiplier**:
-   Repositories < 50: 1.5x
-   Repositories < 60: 1.2x
-   Repositories ≥ 60: 1.0x

#### Example Output

```
🎯 Prioritizing Fixes...

Found 5 repositories needing attention

🔝 Top 10 Priority Fixes:

alteriom-data-analytics [F] (45/100)
  1. [P:22.5] 🟢 Missing LICENSE file
     Impact: 9/10, Effort: 3/10, Category: documentation
  2. [P:18.0] 🟡 No branch protection configured
     Impact: 8/10, Effort: 2/10, Category: branch-protection
  3. [P:15.0] 🟡 Missing CI/CD workflows
     Impact: 8/10, Effort: 5/10, Category: cicd

📊 Issues Grouped by Category (for batch fixes):

📖 DOCUMENTATION
   12 issues across 5 repositories
   Avg Priority: 18.3
   Repos: alteriom-data-analytics, alteriom-config-manager...

💡 Batch Fix Suggestions:

1. Generate missing documentation files across repositories
   Affects: 5 repositories
   Command: repository-manager automation --auto-fix

2. Enable branch protection rules across repositories
   Affects: 4 repositories
   Command: repository-manager branches --enforce
```

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
