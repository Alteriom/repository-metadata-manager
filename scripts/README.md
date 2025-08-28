# Scripts Directory

This directory contains utility scripts and local auditing tools for the Repository Metadata Manager package.

## 🔍 Local Auditing Scripts (Primary Tools)

These scripts provide comprehensive repository health assessment without requiring GitHub API access or admin permissions.

### `docs-compliance-check.js`

**Purpose**: Documentation compliance auditing and auto-generation  
**Usage**: `npm run docs`

**Features**:
- Validates README.md, CHANGELOG.md, CONTRIBUTING.md, LICENSE, and other essential files
- Checks content quality and completeness (100/100 score achieved)
- Auto-generates missing documentation templates
- Provides detailed scoring breakdown and recommendations
- Supports --fix flag for automatic improvements

**Scoring Categories**: README validation, changelog compliance, contributing guidelines, code of conduct, license verification, PR templates, issue templates, documentation structure

### `security-audit-local.js`

**Purpose**: Local security assessment and vulnerability detection  
**Usage**: `npm run security`

**Features**:
- Local npm audit integration without API dependencies
- SECURITY.md policy validation and generation
- Dependency vulnerability scanning
- File permission analysis
- Secrets detection patterns
- Security best practices compliance (90/100 score achieved)

**Security Checks**: npm audit, security policy, dependency analysis, file permissions, vulnerability patterns, license compliance

### `branch-protection-local.js`

**Purpose**: Branch protection policies and Git workflow analysis  
**Usage**: `npm run branchprotection`

**Features**:
- Local Git workflow validation
- CODEOWNERS file analysis
- Dependabot configuration verification
- Branch protection policy assessment
- CI/CD integration checking (100/100 score achieved)

**Protection Areas**: Git workflow, code ownership, dependency management, CI configuration, contribution workflow

### `cicd-audit-local.js`

**Purpose**: CI/CD pipeline analysis and workflow optimization  
**Usage**: `npm run cicd`

**Features**:
- GitHub Actions workflow analysis
- NPM scripts validation
- Testing framework verification
- Automation assessment
- Performance optimization recommendations (96/100 score achieved)

**Audit Categories**: GitHub Actions workflows, NPM scripts, CI/CD best practices, testing setup, process automation

### `test-features.js`

**Purpose**: Comprehensive repository health assessment  
**Usage**: `npm run health`

**Features**:
- Integrates all local auditing tools
- Calculates overall health score (96/100 Grade A achieved)
- Weighted scoring across 4 categories
- Template generation testing
- Complete feature validation

**Health Categories**: Documentation (25%), Security (30%), Branch Protection (20%), CI/CD (25%)

## 📚 Documentation Management

### `docs-navigator.js`

**Purpose**: Documentation structure management and navigation  
**Usage**: `npm run docs:nav`

**Features**:
- Documentation directory organization
- Link validation and structure checking
- Navigation improvement suggestions
- Cross-reference validation

## 🚀 Release & Environment Management

### `setup-check.js`

**Purpose**: Environment verification and setup guidance  
**Usage**: `npm run env:check`

**Features**:
- Verifies required environment variables (NPM_TOKEN, GITHUB_TOKEN)
- Checks optional environment variables
- Tests NPM authentication
- Provides setup instructions
- Shows current package version and available commands

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

**Features**:
- Opens GitHub secrets management page
- Provides step-by-step instructions for adding NPM_TOKEN secret
- Shows exact token value to copy
- Cross-platform browser opening support

## 📊 Current Repository Health Metrics

**Overall Health Score: 96/100 (Grade A)**

- **📚 Documentation**: 100/100 (Perfect)
- **🔒 Security**: 90/100 (Excellent)
- **🛡️ Branch Protection**: 100/100 (Perfect)
- **⚙️ CI/CD**: 96/100 (Excellent)

## Environment Dependencies

All scripts automatically load environment variables from `.env` file using dotenv.

**Required environment variables:**
- `NPM_TOKEN` - NPM authentication token for publishing
- `GITHUB_TOKEN` - GitHub API token for repository management (optional for local auditing)

**Optional environment variables:**
- `AGENT_ORG_TOKEN` - Alternative GitHub token for organization-wide operations
- `GITHUB_REPOSITORY_OWNER` - Repository owner name (auto-detected from git)
- `GITHUB_REPOSITORY_NAME` - Repository name (auto-detected from git)

## 🛠️ Development Workflow

### Complete Health Assessment
```bash
# Run all auditing tools
npm run docs           # Documentation compliance (100/100)
npm run security       # Security assessment (90/100)
npm run branchprotection # Branch protection (100/100)
npm run cicd          # CI/CD analysis (96/100)
npm run health        # Overall health score (96/100)
```

### Development Cycle
1. **Environment Setup**: `npm run env:check`
2. **Health Assessment**: `npm run health`
3. **Category-specific Audits**: Run individual audit scripts
4. **Development**: Make improvements based on recommendations
5. **Pre-release Check**: `npm run release:check`
6. **Release**: `npm run release:patch|minor|major`

### Local Auditing Benefits
- **🚀 No API Dependencies**: Works without GitHub API access or admin permissions
- **⚡ Fast Execution**: Local file system analysis
- **🔒 Secure**: No token exposure or external calls required
- **📊 Comprehensive**: Covers all major repository health categories
- **🎯 Actionable**: Provides specific recommendations for improvements

## 📁 File Structure

```text
scripts/
├── README.md                     # This comprehensive documentation
├── docs-compliance-check.js      # Documentation auditing (100/100)
├── security-audit-local.js       # Security assessment (90/100)
├── branch-protection-local.js    # Branch protection (100/100)
├── cicd-audit-local.js          # CI/CD analysis (96/100)
├── test-features.js             # Health score integration (96/100)
├── docs-navigator.js            # Documentation management
├── setup-check.js               # Environment verification
├── release.js                   # Release management
└── github-secrets-setup.js      # GitHub secrets helper
```

## 🎯 Usage Examples

### Quick Health Check
```bash
npm run health
# Output: 96/100 Grade A overall health score
```

### Detailed Category Analysis
```bash
npm run docs && npm run security && npm run branchprotection && npm run cicd
# Output: Detailed breakdown of all categories with specific recommendations
```

### Environment Verification
```bash
npm run env:check
# Output: Environment status and setup guidance
```

### Release Preparation
```bash
npm run release:check
# Output: Pre-release validation and readiness assessment
```

These scripts form the backbone of the Repository Metadata Manager's enterprise-grade repository health assessment capabilities.
