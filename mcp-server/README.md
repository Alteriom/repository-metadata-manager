# Repository Manager MCP Server

A **Model Context Protocol (MCP)** server that exposes the Repository Metadata Manager's capabilities to AI assistants like GitHub Copilot, Claude, and other MCP-compatible clients.

## Overview

This MCP server provides 13 powerful tools for managing GitHub repository metadata, health scoring, security auditing, compliance automation, and organization-wide analytics—all accessible through natural language conversations with AI assistants.

## Features

### 🎯 Repository Health & Compliance
- **Health Scoring**: Calculate weighted health scores across 4 categories (Documentation 25%, Security 30%, Branch Protection 20%, CI/CD 25%)
- **Compliance Reports**: Generate organization-wide compliance reports with trend analysis
- **Auto-Fix**: Automatically fix common compliance issues (missing docs, configurations)

### 📚 Documentation Management
- **Full Audits**: Comprehensive quality checks for all essential documentation
- **Missing File Detection**: Quickly identify missing required files
- **Template Generation**: Auto-generate missing documentation from templates

### 🔒 Security & Protection
- **Security Audits**: npm vulnerability scanning, file permission checks, secrets detection
- **Branch Protection**: Analyze and enforce branch protection policies
- **Security Dashboard**: Organization-wide vulnerability tracking and remediation priorities

### ⚙️ CI/CD & Automation
- **Workflow Analysis**: Audit GitHub Actions workflows for best practices
- **Missing Workflow Detection**: Identify repositories lacking essential CI/CD pipelines
- **Dependency Tracking**: Monitor dependency versions across organization

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- GitHub Personal Access Token with appropriate permissions
- Visual Studio Code 1.99+ (for VS Code integration)

### Setup Steps

1. **Install Dependencies**

```bash
cd mcp-server
npm install
```

2. **Configure Environment**

Create or update `.env` in the repository root:

```env
GITHUB_TOKEN=ghp_your_token_here
GITHUB_REPOSITORY_OWNER=your-org
GITHUB_REPOSITORY_NAME=your-repo
```

3. **Enable MCP in VS Code**

The `.vscode/mcp.json` file is already configured. Just restart VS Code and the server will be automatically available.

4. **Verify Installation**

Open GitHub Copilot Chat in VS Code:
- Click the Copilot icon in the activity bar
- Select "Agent" mode from the dropdown
- Click the tools icon (⚙️) to see available MCP tools
- You should see "repository-manager" with 13 tools

## Available Tools

### 1. `calculate_health_score`

Calculate overall repository health score with detailed breakdown.

**Inputs:**
- `owner` (optional): Repository owner
- `repo` (optional): Repository name
- `repositoryPath` (optional): Local path to repository

**Example:**
```
Calculate health score for this repository
```

**Output:**
- Overall score (0-100)
- Letter grade (A-F)
- Category scores with weights
- Detailed recommendations

---

### 2. `audit_documentation`

Perform comprehensive documentation quality audit.

**Checks:**
- README.md (sections, badges, examples)
- CHANGELOG.md (Keep a Changelog format)
- CONTRIBUTING.md (PR process, code style)
- CODE_OF_CONDUCT.md (Contributor Covenant)
- LICENSE (recognized license types)
- SECURITY.md (vulnerability reporting)
- Issue/PR templates

**Example:**
```
Audit documentation for this repository
```

---

### 3. `check_missing_documentation`

Quick check for missing required files.

**Example:**
```
What documentation files are missing?
```

**Output:**
```json
{
  "missing": ["SECURITY.md", "CONTRIBUTING.md"],
  "existing": ["README.md", "LICENSE", "CHANGELOG.md"]
}
```

---

### 4. `audit_security`

Audit repository security posture.

**Checks:**
- npm audit results (critical/high/moderate/low vulnerabilities)
- File permissions (executable scripts, config files)
- SECURITY.md policy presence
- Dependency health
- Secrets scanning readiness

**Example:**
```
Run security audit on this repository
```

---

### 5. `audit_cicd`

Analyze CI/CD workflows and automation.

**Checks:**
- GitHub Actions workflow files
- Test automation coverage
- Linting and code quality checks
- Security scanning (CodeQL, Snyk, etc.)
- Deployment automation
- Performance benchmarking
- Workflow security best practices

**Example:**
```
Analyze CI/CD workflows for this repository
```

---

### 6. `audit_branch_protection`

Check branch protection rules.

**Checks:**
- Required reviews before merge
- Required status checks
- Dismiss stale reviews
- Require code owner reviews
- Force push restrictions
- Deletion restrictions

**Requires:** GitHub API access with appropriate permissions

**Example:**
```
Check branch protection for Alteriom/repository-metadata-manager
```

---

### 7. `generate_health_report`

Generate human-readable health report.

**Example:**
```
Generate a health report for this repository
```

**Output:**
Formatted report with:
- Executive summary
- Score breakdown with grades
- Category-specific recommendations
- Priority action items

---

### 8. `run_org_health_audit`

Run health audit across all organization repositories.

**Inputs:**
- `owner` (required): Organization name
- `report` (optional): Generate detailed report (default: true)
- `parallel` (optional): Process in parallel (default: true)
- `concurrency` (optional): Concurrent operations (default: 5)
- `trending` (optional): Include trend analysis (default: false)

**Example:**
```
Run health audit for all Alteriom repositories
```

**Output:**
- Summary statistics
- Per-repository scores
- Organization-wide trends
- Compliance percentages

---

### 9. `detect_missing_workflows`

Detect repositories missing essential workflows.

**Example:**
```
Which Alteriom repositories are missing CI/CD workflows?
```

**Detects:**
- No test workflows
- No linting workflows
- No security scanning
- No deployment automation

---

### 10. `track_dependencies`

Track dependency versions across organization.

**Example:**
```
Track dependencies across Alteriom organization
```

**Output:**
- Dependency version matrix
- Outdated dependencies
- Vulnerability counts
- Update recommendations

---

### 11. `auto_fix_compliance`

Automatically fix compliance issues.

**Inputs:**
- `owner` (optional): Repository owner
- `repo` (optional): Repository name
- `dryRun` (optional): Preview changes (default: true)
- `target` (optional): 'current' or 'all' (default: current)

**Fixes:**
- Generate missing documentation (README, CHANGELOG, CONTRIBUTING, etc.)
- Create SECURITY.md from template
- Add issue/PR templates (planned)
- Configure basic workflows (planned)

**Examples:**
```
Preview fixes for this repository
```

```
Apply compliance fixes to all Alteriom repositories (dry run first)
```

**Safety:** Always runs in dry-run mode by default. Set `dryRun: false` explicitly to apply changes.

---

### 12. `generate_compliance_report`

Generate organization-wide compliance report.

**Inputs:**
- `owner` (required): Organization name
- `save` (optional): Save to file (default: false)
- `trending` (optional): Include trends (default: false)

**Example:**
```
Generate compliance report for Alteriom organization
```

**Output:**
- Compliance score (% of repos meeting standards)
- Critical issues count
- Repositories requiring attention
- Trend analysis (if enabled)
- Report saved to `compliance-report-YYYY-MM-DD.json` (if save=true)

---

### 13. `generate_security_dashboard`

Generate security vulnerability dashboard.

**Inputs:**
- `owner` (required): Organization name
- `save` (optional): Save to file (default: false)

**Example:**
```
Generate security dashboard for Alteriom
```

**Output:**
- Vulnerability counts by severity
- Affected repositories
- Remediation priorities
- MTTR (Mean Time To Remediate) metrics
- Dashboard saved to `security-dashboard-YYYY-MM-DD.json` (if save=true)

---

## Usage Examples

### Basic Repository Health Check

```
Hey Copilot, calculate the health score for this repository
```

**Copilot will:**
1. Invoke `calculate_health_score` tool
2. Analyze all health categories
3. Present results in natural language with actionable recommendations

---

### Organization-Wide Compliance Audit

```
Run a compliance audit across all Alteriom repositories and tell me which ones need attention
```

**Copilot will:**
1. Invoke `run_org_health_audit` with owner="Alteriom"
2. Process all repositories in parallel
3. Summarize repositories below compliance threshold
4. Suggest which repos to fix first

---

### Automated Compliance Fixing

```
What compliance issues can you auto-fix in this repository? Show me what would change first.
```

**Copilot will:**
1. Invoke `auto_fix_compliance` with dryRun=true
2. Show what files would be created/modified
3. Ask for confirmation before applying

**Then:**
```
Go ahead and apply those fixes
```

**Copilot will:**
1. Invoke `auto_fix_compliance` with dryRun=false
2. Create missing documentation files
3. Confirm what was fixed

---

### Security Analysis

```
Analyze the security posture of this repository and identify any vulnerabilities
```

**Copilot will:**
1. Invoke `audit_security` tool
2. Run npm audit locally
3. Check for security policy
4. Present findings with remediation steps

---

### Missing Workflow Detection

```
Which repositories in Alteriom don't have proper CI/CD workflows?
```

**Copilot will:**
1. Invoke `detect_missing_workflows` with owner="Alteriom"
2. Scan all repositories for workflow files
3. List repositories missing tests, linting, or deployment
4. Suggest workflow templates to add

---

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_TOKEN` | GitHub Personal Access Token | Yes |
| `GITHUB_REPOSITORY_OWNER` | Default repository owner/org | No |
| `GITHUB_REPOSITORY_NAME` | Default repository name | No |

### GitHub Token Permissions

For full functionality, your token needs:

- **Repository access:**
  - `repo` - Full control (for private repos)
  - `public_repo` - Public repository access (for public only)

- **Organization access:**
  - `read:org` - Read org and team membership

- **Actions (for workflow analysis):**
  - `workflow` - Update GitHub Action workflows

### VS Code MCP Configuration

The `.vscode/mcp.json` file automatically loads environment variables from your `.env` file:

```json
{
  "mcpServers": {
    "repository-manager": {
      "command": "node",
      "args": ["mcp-server/index.js"],
      "env": {
        "GITHUB_TOKEN": "${env:GITHUB_TOKEN}",
        "GITHUB_REPOSITORY_OWNER": "${env:GITHUB_REPOSITORY_OWNER}",
        "GITHUB_REPOSITORY_NAME": "${env:GITHUB_REPOSITORY_NAME}"
      }
    }
  }
}
```

## Troubleshooting

### Server Not Showing in VS Code

1. **Check MCP file exists:**
   ```bash
   ls .vscode/mcp.json
   ```

2. **Restart VS Code completely** (close all windows)

3. **Check Node.js version:**
   ```bash
   node --version  # Should be 18.0.0 or higher
   ```

4. **Verify environment variables:**
   ```bash
   echo $GITHUB_TOKEN
   ```

5. **Check VS Code output:**
   - View → Output
   - Select "Model Context Protocol" from dropdown
   - Look for connection errors

### Tool Execution Errors

**"Authentication failed" / "Bad credentials"**

- Check that `GITHUB_TOKEN` is set correctly in `.env`
- Verify token has required permissions
- Token may be expired (PATs expire after 90 days by default)

**"Repository not found"**

- Ensure `owner` and `repo` parameters are correct
- Check token has access to the repository
- For private repos, token needs `repo` scope

**"Rate limit exceeded"**

- GitHub API has rate limits (5,000/hour for authenticated requests)
- Wait for rate limit reset or use `concurrency` parameter to reduce parallel requests
- Check rate limit status: `curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/rate_limit`

### Organization-Wide Operations

**"Failed to fetch organization repositories"**

- Token needs `read:org` permission
- You must be a member of the organization
- For GitHub Apps, different endpoints are used (see authentication errors)

**Slow performance**

- Use `concurrency` parameter to adjust parallel processing
- Set `parallel: false` for sequential processing
- Large orgs (>100 repos) may take several minutes

## Development

### Running Locally

```bash
cd mcp-server
npm install
node index.js
```

The server communicates via STDIO and waits for JSON-RPC messages.

### Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node mcp-server/index.js
```

This opens a web interface for testing MCP tools directly.

### Adding New Tools

1. Add tool definition in `ListToolsRequestSchema` handler
2. Add tool implementation in `executeTool()` switch statement
3. Import any required feature managers
4. Update this README with documentation

## Architecture

```
repository-metadata-manager/
├── mcp-server/
│   ├── index.js          # MCP server implementation
│   ├── package.json      # Server dependencies
│   └── README.md         # This file
├── lib/
│   ├── features/
│   │   ├── HealthScoreManager.js
│   │   ├── DocumentationManager.js
│   │   ├── SecurityManager.js
│   │   ├── CICDManager.js
│   │   ├── BranchProtectionManager.js
│   │   └── AutomationManager.js
│   └── core/
│       └── RepositoryManager.js
├── .vscode/
│   └── mcp.json          # VS Code MCP configuration
└── .env                   # Environment variables
```

## Integration with Other MCP Clients

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "repository-manager": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/index.js"],
      "env": {
        "GITHUB_TOKEN": "your_token_here"
      }
    }
  }
}
```

### JetBrains IDEs

1. Open Copilot Chat
2. Click MCP icon
3. Click "Add MCP Tools"
4. Add configuration to `mcp.json`:

```json
{
  "servers": {
    "repository-manager": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/index.js"]
    }
  }
}
```

## Limitations

- **GitHub API Rate Limits**: 5,000 requests/hour for authenticated users
- **Local File Access**: Some tools require local repository access
- **Organization Permissions**: Org-wide tools require appropriate permissions
- **Parallel Processing**: Configurable but may hit rate limits with high concurrency

## Security Considerations

- **Never commit tokens** to version control
- **Use `.env` files** for local development
- **Rotate tokens regularly** (GitHub recommends 90 days)
- **Limit token scopes** to minimum required permissions
- **Review auto-fix changes** before applying to production repositories

## Support

- **Issues**: https://github.com/Alteriom/repository-metadata-manager/issues
- **Documentation**: See `/docs` directory in repository
- **MCP Protocol**: https://modelcontextprotocol.io/

## License

MIT License - See LICENSE file in repository root

---

**Built with ❤️ using Model Context Protocol**
