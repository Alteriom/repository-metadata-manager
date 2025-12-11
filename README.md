# Repository Metadata Manager

[![npm version](https://img.shields.io/npm/v/@alteriom/repository-metadata-manager.svg)](https://www.npmjs.com/package/@alteriom/repository-metadata-manager)
[![npm downloads](https://img.shields.io/npm/dt/%40alteriom%2Frepository-metadata-manager.svg)](https://www.npmjs.com/package/@alteriom/repository-metadata-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![CI](https://github.com/Alteriom/repository-metadata-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/Alteriom/repository-metadata-manager/actions/workflows/ci.yml)
[![Security](https://github.com/Alteriom/repository-metadata-manager/actions/workflows/security.yml/badge.svg)](https://github.com/Alteriom/repository-metadata-manager/actions/workflows/security.yml)
[![Release](https://github.com/Alteriom/repository-metadata-manager/actions/workflows/release.yml/badge.svg)](https://github.com/Alteriom/repository-metadata-manager/actions/workflows/release.yml)
[![Repository Health](<https://img.shields.io/badge/health-A%20(96%25)-brightgreen.svg>)](https://github.com/Alteriom/repository-metadata-manager)

## 🚀 Complete Repository Compliance and Health Management Suite for GitHub Organizations

A comprehensive utility for managing GitHub repository metadata, security, documentation, CI/CD pipelines, and overall repository health to ensure compliance with organization standards.

## 🎯 Purpose

This enterprise-grade tool addresses comprehensive repository management needs:

- **📊 Repository Health Scoring**: Calculate overall repository health with weighted scoring
- **🔒 Security Management**: Security audits, vulnerability detection, and policy enforcement
- **🛡️ Branch Protection**: Automated branch protection rule management
- **📚 Documentation Standards**: Quality analysis and auto-generation of documentation
- **⚙️ CI/CD Pipeline Management**: Workflow analysis and template generation
- **🎯 Compliance Automation**: Full compliance checking with auto-fix capabilities
- **🤖 AI Agent Mode**: Zero-configuration automation for CI/CD and AI agents
- **🔄 Cross-Repository Automation**: Organization-wide health monitoring and dependency tracking
- **📋 Interactive Management**: User-friendly CLI with guided workflows
- **🧠 MCP Server**: Model Context Protocol server for AI assistants (GitHub Copilot, Claude) ✨ NEW

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

### 6. Organization Analytics

```bash
# Generate comprehensive organization report
npm run analytics

# Export analytics to file
repository-manager analytics --save organization-report.json
```

### 7. Project Templates

```bash
# List available templates
npm run template -- --list

# Generate IoT firmware project
npm run template -- --type iot-firmware --name my-sensor-project

# Generate AI agent project
npm run template -- --type ai-agent --name my-automation-agent
```

### 8. Enhanced Automation ✨ NEW

```bash
# Run organization-wide health audit
npm run automation:org-health

# Detect missing workflows across all repos
npm run automation:detect-workflows

# Track dependencies across organization
npm run automation:track-deps

# Generate compliance report with auto-save
npm run automation:compliance

# Generate security vulnerability dashboard
npm run automation:security

# Run automated maintenance tasks
npm run automation:maintenance

# Auto-fix compliance issues (dry-run)
npm run automation:dry-run

# Auto-fix compliance issues (apply changes)
npm run automation:auto-fix
```

### 9. MCP Server for AI Assistants ✨ NEW

**Use repository management tools directly in GitHub Copilot, Claude, and other AI assistants** via Model Context Protocol:

```bash
# Install MCP server dependencies
cd mcp-server && npm install

# Server automatically activates in VS Code
# Open GitHub Copilot Chat → Agent mode → Tools icon
# You'll see 13 repository management tools available

# Example prompts:
"Calculate health score for this repository"
"What documentation is missing?"
"Run security audit"
"Auto-fix compliance issues (dry-run first)"
```

**Features:**
- 13 tools for health, security, docs, CI/CD, compliance
- Natural language interface through AI assistants
- Organization-wide operations
- Auto-fix capabilities with dry-run
- See `mcp-server/README.md` for full documentation

### 10. AI Agent Mode ✨ NEW

**Zero-configuration compliance automation** for AI agents and CI/CD environments:

```bash
# Detect environment and token availability
repository-manager ai-agent --detect

# Run in local-only mode (no GitHub API required)
repository-manager ai-agent --local-only

# Dry-run mode - show what would be fixed
repository-manager ai-agent --dry-run

# Auto-fix compliance issues
repository-manager ai-agent --auto-fix

# Full automation (local fixes + API checks)
repository-manager ai-agent --auto-fix
```

**Key Features:**

- 🔑 **Automatic Token Detection**: Hierarchical token detection (Environment → GitHub Actions → .env file)
- 🤖 **GitHub Actions Integration**: Automatic detection and configuration when running in CI/CD
- 📁 **Local File Fixes**: Create missing documentation (SECURITY.md, CONTRIBUTING.md, etc.)
- 🔧 **Auto-Fix Capabilities**: Automated compliance fixes without manual intervention
- 🛡️ **Graceful Degradation**: Works even without GitHub API access

**Example: GitHub Actions Workflow**

```yaml
name: Compliance Check
on: [pull_request, push]

jobs:
  compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install -g @alteriom/repository-metadata-manager
      - run: repository-manager ai-agent --auto-fix
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

See [AI Agent Workflow](.github/workflows/ai-agent-compliance.yml) for the complete automated workflow.

## 📋 Enhanced Commands

| Command           | Description                                                         |
| ----------------- | ------------------------------------------------------------------- |
| `health`          | Calculate overall repository health score (0-100)                   |
| `security`        | Security audit and vulnerability detection                          |
| `branches`        | Branch protection analysis and enforcement                          |
| `docs`            | Documentation quality assessment and generation                     |
| `cicd`            | CI/CD workflow analysis and template generation                     |
| `iot`             | IoT-specific compliance and template generation                     |
| `compliance`      | Full compliance check with auto-fix capabilities                    |
| `ai-agent`        | AI agent mode with automatic token detection and local fixes ✨ NEW |
| `automation`      | Cross-repository operations and organization-wide automation        |
| `interactive`     | Interactive wizard for guided repository management                 |
| `analytics`       | Organization-wide analytics and insights                            |
| `template`        | Generate new projects from comprehensive templates                  |
| `security-policy` | Generate and manage security policies                               |

## 🎨 Project Template Engine

The Repository Metadata Manager now includes a comprehensive template engine for rapid project scaffolding, specifically designed for Alteriom organization patterns.

### Available Templates

| Template Type  | Language   | Description                                          |
| -------------- | ---------- | ---------------------------------------------------- |
| `iot-firmware` | C++        | ESP32/ESP8266 firmware with sensors, LoRa, WiFi mesh |
| `ai-agent`     | JavaScript | AI-powered automation and repository management      |
| `iot-platform` | TypeScript | Multi-tenant IoT platform with React + FastAPI       |
| `cli-tool`     | JavaScript | Command-line tools with comprehensive features       |

### Template Features

**IoT Firmware Template:**

- Complete PlatformIO configuration for ESP32/ESP8266
- Sensor management (DHT22, BMP280, custom sensors)
- WiFi connectivity with automatic reconnection
- MQTT communication for telemetry
- LoRa mesh networking support
- OTA update capabilities
- Hardware documentation templates
- Security and encryption modules

**AI Agent Template:**

- GitHub API integration with Octokit
- Automated compliance monitoring
- Issue and PR creation capabilities
- Configurable automation workflows
- Comprehensive test suite
- Docker deployment configuration

**IoT Platform Template:**

- React TypeScript frontend with modern UI
- FastAPI Python backend with async support
- MQTT integration for real-time data
- InfluxDB time-series data storage
- Redis caching and session management
- Multi-tenant architecture
- Grafana dashboard configurations
- Docker Compose for local development

### Usage Examples

```bash
# Interactive template generation
npm run interactive
# Select "🎨 Generate New Project"

# Command line usage
npm run template -- --type iot-firmware --name weather-station
npm run template -- --type ai-agent --name compliance-bot
npm run template -- --type iot-platform --name sensor-dashboard

# List all available templates
npm run template -- --list
```

| `iot` | IoT-specific compliance and template generation |
| `compliance` | Full compliance check with auto-fix capabilities |
| `interactive` | Interactive wizard for guided repository management |

## 🔌 IoT Repository Management

Specialized features for IoT/embedded systems development, designed for organizations like Alteriom with extensive IoT portfolios.

### IoT Repository Types

The tool automatically detects and handles four types of IoT repositories:

- **🔧 IoT Firmware** (`iot-firmware`): ESP32/ESP8266, Arduino, PlatformIO projects
- **🖥️ IoT Server** (`iot-server`): MQTT backends, sensor data processing, telemetry
- **📚 IoT Documentation** (`iot-documentation`): Hardware specs, API docs, setup guides
- **🐳 IoT Infrastructure** (`iot-infrastructure`): Docker containers, deployment configs

### IoT Commands

```bash
# Run IoT-specific compliance audit
npm run iot

# Generate IoT project templates
repository-manager iot --template firmware    # ESP32/Arduino firmware
repository-manager iot --template server      # Python/FastAPI MQTT server
repository-manager iot --template infrastructure  # Docker deployment
repository-manager iot --template documentation   # IoT project docs
```

### IoT Compliance Scoring

IoT repositories get specialized scoring based on:

- **Firmware Projects**: PlatformIO config, security headers, OTA updates, hardware docs
- **Server Projects**: MQTT handlers, database schemas, API documentation, monitoring
- **Documentation**: Hardware specs, setup guides, troubleshooting, examples
- **Infrastructure**: Container configs, monitoring, security policies, deployment scripts

### IoT Template Structures

**Firmware Template Features:**

- PlatformIO configuration for ESP32/ESP8266
- Security and encryption modules
- WiFi and MQTT connectivity
- Sensor management and calibration
- OTA update mechanisms
- Hardware documentation templates

**Server Template Features:**

- FastAPI with MQTT integration
- InfluxDB time-series data storage
- Redis caching and session management
- Grafana dashboard configurations
- Docker containerization
- API documentation and testing

**Example IoT Audit Output:**

```bash
🔌 Starting IoT-Specific Compliance Audit...

✅ IoT repository detected

📊 IoT Compliance Score: 85/100
🎯 Repository Type: iot-firmware

🔧 IoT Files Detected:
  • platformio.ini
  • src/main.cpp
  • include/config.h
  • lib/sensors/

✅ Compliance Findings:
  ✅ PlatformIO configuration found
  ✅ Main firmware file found
  ✅ Header files directory found
  ✅ Documentation found

💡 Recommendations:
  • Add security header file (include/security.h)
  • Add OTA update configuration
  • Include hardware compatibility matrix

🔒 Security Recommendations:
  • Consider adding cryptographic functions
  • Implement WiFi credential security
  • Add MQTT authentication
```

## 📊 Organization Analytics

Comprehensive analytics and insights across all repositories in your organization, providing detailed visibility into health, compliance, and technology adoption patterns.

### Analytics Features

- **Repository Health Overview**: Aggregated health scores and grade distribution
- **Language & Technology Analysis**: Usage patterns and technology adoption
- **IoT Portfolio Insights**: Specialized analysis for IoT/embedded projects
- **Security Posture Assessment**: Organization-wide security metrics
- **Compliance Trends**: Tracking compliance improvements over time
- **Actionable Recommendations**: Prioritized suggestions for improvement

### Analytics Commands

```bash
# Generate comprehensive organization report
npm run analytics

# Export analytics to JSON
repository-manager analytics --export json --save org-report.json

# Export analytics to CSV for spreadsheet analysis
repository-manager analytics --export csv --save org-metrics.csv
```

### Sample Analytics Output

```
🏢 ALTERIOM ORGANIZATION ANALYTICS REPORT
============================================================

📊 ORGANIZATION OVERVIEW
Total Repositories: 12
Private/Public: 8/4
Average Health Score: 87/100
Total Stars: 156
Total Forks: 23
Open Issues: 14

💻 LANGUAGE DISTRIBUTION
  JavaScript: 5 repositories (42%)
  C++: 4 repositories (33%)
  TypeScript: 2 repositories (17%)
  Python: 1 repositories (8%)

🔌 IOT PORTFOLIO ANALYSIS
Total IoT Repositories: 6
Average IoT Health: 92/100
Top IoT Technologies:
  • esp32: 4 projects
  • mqtt: 4 projects
  • platformio: 3 projects
  • sensors: 3 projects

🎯 KEY RECOMMENDATIONS
  1. 🔴 [Security] Implement organization-wide security policies
  2. 🟡 [Documentation] 3 repositories missing descriptions
  3. 🟡 [IoT] Consider creating shared IoT libraries
```

## 🤖 Enhanced Automation ✨ NEW

Powerful cross-repository automation features for organization-wide management and monitoring.

### Automation Features

- **Organization Health Monitoring**: Daily automated health audits across all repositories
- **Workflow Detection**: Automatically detect repositories missing critical CI/CD workflows
- **Dependency Tracking**: Monitor and coordinate dependency versions across all repositories
- **Compliance Reporting**: Generate org-wide compliance reports with critical issue tracking ✨ NEW
- **Security Dashboard**: Track security vulnerabilities across all repositories ✨ NEW
- **Automated Maintenance**: Run scheduled maintenance tasks (stale issues, outdated deps, unused workflows) ✨ NEW
- **Compliance Auto-Fix**: Automatically fix common compliance issues
- **Automated Reporting**: Generate comprehensive reports and create GitHub issues for issues needing attention

### Automation Commands

```bash
# Run organization-wide health audit
npm run automation:org-health

# Detect missing workflows across all repositories
npm run automation:detect-workflows

# Track dependencies and identify version conflicts
npm run automation:track-deps

# Generate compliance report (saved to compliance-report-YYYY-MM-DD.json)
npm run automation:compliance

# Generate security vulnerability dashboard (saved to security-dashboard-YYYY-MM-DD.json)
npm run automation:security

# Run automated maintenance tasks (stale issues, outdated deps, unused workflows)
npm run automation:maintenance

# Auto-fix compliance issues (preview mode)
npm run automation:dry-run

# Auto-fix compliance issues (apply changes)
npm run automation:auto-fix
```

### New Automation Features ✨

#### 📋 Compliance Report Generation

Generate comprehensive organization-wide compliance reports with:

- **Health Score Analysis**: Average health scores across all repositories
- **Compliance Status**: Count of compliant (≥80) vs non-compliant (<80) repositories
- **Critical Issue Tracking**: Identifies repositories with critical security issues
- **Auto-Save Reports**: Reports saved to `compliance-report-YYYY-MM-DD.json`

**Example Output:**
```
📊 Compliance Summary:
Total Repositories: 29
Compliant (≥80): 1
Non-Compliant (<80): 28
Average Health Score: 38.7
Critical Security Issues: 25
```

#### 🔒 Security Dashboard

Generate security vulnerability dashboards tracking:

- **Security Scoring**: Categorize repositories by security level (secure ≥80, critical <50)
- **Vulnerability Count**: Track total vulnerable repositories
- **Priority Levels**: High priority (<70) and critical (<50) repositories
- **Actionable Recommendations**: Specific security improvements needed
- **Auto-Save Dashboards**: Saved to `security-dashboard-YYYY-MM-DD.json`

**Example Output:**
```
🔒 Security Overview:
Total Repositories: 29
Secure (≥80): 3
Vulnerable (<80): 26
Critical Issues (<50): 22

💡 Recommendations:
  1. Immediate action required for repositories with critical security issues
  2. Review and update security policies for vulnerable repositories
```

#### 🔧 Automated Maintenance Tasks

Run scheduled maintenance tasks across all repositories:

- **Stale Issue Detection**: Find issues inactive for 90+ days
- **Outdated Dependency Tracking**: Identify repositories with outdated dependencies
- **Unused Workflow Detection**: Find unused or obsolete CI/CD workflows
- **Configurable Tasks**: Run specific tasks with `--tasks` parameter

**Task Options:**
```bash
# Run all maintenance tasks (default)
npm run automation:maintenance

# Run specific tasks only
repository-manager automation --maintenance --tasks stale-issues,outdated-deps
repository-manager automation --maintenance --tasks unused-workflows
```

**Example Output:**
```
📌 Running task: stale-issues
Found 0 stale issues

📌 Running task: outdated-deps
Checked 5 repositories for outdated dependencies

📌 Running task: unused-workflows
Found 31 workflows across repositories
```

### Automated Workflow

The organization health monitor runs automatically via GitHub Actions:

- **Schedule**: Daily at 6 AM UTC
- **Monitors**: All repositories in the organization
- **Reports**: Health scores, missing workflows, dependency conflicts, compliance status
- **Alerts**: Automatic GitHub issues for repositories below health threshold

### Automation Output Example

```
🔍 Running Organization-Wide Health Audit...

Found 27 repositories

[A] repository-metadata-manager: 96/100
[B] alteriom-mqtt-schema: 88/100
[C] alteriom-firmware: 72/100
[F] alteriom-data-analytics: 45/100

📊 Health Audit Summary:
Total Repositories: 27
Unhealthy (< 70): 5
Average Health Score: 82.3

⚠️  Unhealthy Repositories:
  - alteriom-data-analytics (45/100): 8 issues
  - alteriom-config-manager (52/100): 6 issues
```

For complete automation documentation, see [AUTOMATION.md](docs/AUTOMATION.md).

## 🛡️ Security Policy Management

Comprehensive security policy generation and management for enterprise-grade security standards across all repository types.

### Security Policy Types

| Policy Type    | Description                               | Use Case              |
| -------------- | ----------------------------------------- | --------------------- |
| `organization` | Standard organizational security policy   | All repositories      |
| `iot`          | Enhanced IoT device and firmware security | IoT/embedded projects |
| `ai-agent`     | AI agent and automation security          | AI/automation systems |
| `web-platform` | Web application security policy           | Web applications      |

### Security Policy Features

**Organization Policy:**

- Vulnerability disclosure procedures
- Incident response planning
- Security contact information
- Compliance guidelines
- Supported versions matrix

**IoT Policy:**

- Hardware security requirements
- Firmware security standards
- Device authentication protocols
- Secure communication guidelines
- OTA update security

**AI Agent Policy:**

- API security standards
- Data privacy protection
- Automation security controls
- GitHub integration security

**Web Platform Policy:**

- Authentication and authorization
- Data protection standards
- Web application security
- HTTPS/TLS requirements

### Security Commands

```bash
# Audit existing security policies
npm run security-policy -- --audit

# Generate organization security policy
npm run security-policy -- --generate --type organization

# Generate IoT-specific security policy
npm run security-policy -- --generate --type iot --contact security@yourorg.com
```

### Generated Security Files

**Standard Organization Policy:**

- `SECURITY.md` - Main security policy
- `.github/SECURITY.md` - GitHub security integration
- `docs/security/SECURITY_GUIDELINES.md` - Detailed guidelines
- `docs/security/VULNERABILITY_DISCLOSURE.md` - Disclosure procedures
- `docs/security/INCIDENT_RESPONSE.md` - Response procedures

**IoT-Specific Policy:**

- Enhanced device security requirements
- Firmware security standards
- Hardware security guidelines
- Secure communication protocols

### Usage Examples

```bash
# Interactive security policy management
npm run interactive
# Select "🛡️ Security Policy Management"

# Command line usage
repository-manager security-policy --audit
repository-manager security-policy --generate --type iot
repository-manager security-policy --generate --type organization --contact security@alteriom.com
```

### Sample Security Audit Output

```
🔒 Security Policy Score: 85/100

✅ SECURITY.md file
✅ GitHub security policy
✅ Security documentation
❌ Security workflow
   Fix: Add automated security scanning workflow

💡 Recommendations:
  1. Add vulnerability disclosure timeline section
  2. Include emergency contact procedures
  3. Implement automated security scanning
```

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

## 🧪 Testing & Development

### Test Suites

The project includes comprehensive testing with different levels:

```bash
# Run all tests (including unstable ones)
npm test

# Run only stable core functionality tests (used for releases)
npm run test:core

# Run unstable tests that need infrastructure fixes
npm run test:unstable

# Run feature integration tests
npm run test:features
```

### Test Categories

- **Core Tests** (92 tests): Stable tests covering essential functionality
- **Feature Manager Tests**: Testing individual feature modules (may have infrastructure dependencies)
- **CLI Integration Tests**: End-to-end command-line interface testing
- **Enhanced CLI Tests**: Advanced CLI functionality testing

### Development Workflow

1. **Core functionality** is thoroughly tested and stable
2. **Feature tests** may require additional infrastructure setup
3. **Release process** uses only stable core tests to ensure reliability
4. **All functionality** works as demonstrated by working npm scripts

## 📄 License

MIT License - feel free to use and modify for your organization.

## 📚 Documentation

### Central Documentation

For comprehensive documentation, guides, and organizational standards, visit the **Alteriom Documentation Repository**:

🔗 **[Alteriom Central Documentation](https://github.com/Alteriom/alteriom-documentation)**

### Local Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory and [`.github/DOCUMENTATION.md`](.github/DOCUMENTATION.md):

- **[Documentation Index](.github/DOCUMENTATION.md)** - Complete documentation hub with central links
- **[Local Documentation](docs/README.md)** - Complete local documentation overview
- **[Environment Setup](docs/guides/ENVIRONMENT.md)** - Development environment configuration
- **[Organization Setup](docs/guides/ORGANIZATION_SETUP.md)** - Organization-wide setup guide
- **[CLI Reference](docs/guides/CLI.md)** - Command-line interface guide
- **[Automation Guide](docs/AUTOMATION.md)** - Cross-repository automation features
- **[Implementation Details](docs/development/IMPLEMENTATION_SUMMARY.md)** - Technical architecture
- **[API Reference](docs/development/API.md)** - Detailed API documentation
- **[Versioning Guidelines](docs/development/VERSIONING.md)** - Release management
- **[Release Notes](docs/releases/)** - Version history and changelogs

## 🆘 Support

- **Issues**: Report bugs or request features via [GitHub Issues](https://github.com/Alteriom/repository-metadata-manager/issues)
- **Documentation**: Check our comprehensive [documentation](docs/)
- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines
- **Organization Standards**: Refer to Alteriom organization guidelines
