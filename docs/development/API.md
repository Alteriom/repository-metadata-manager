# API Reference

This document provides detailed API reference for the Repository Metadata Manager.

## Core Classes

### RepositoryManager

Base class providing GitHub API interactions and repository management.

#### Methods

##### `constructor(config)`
Initialize the repository manager with configuration.

**Parameters:**
- `config` (Object): Configuration object
  - `token` (string): GitHub personal access token
  - `owner` (string): Repository owner
  - `repo` (string): Repository name

##### `getContents(path)`
Retrieve repository file contents.

**Parameters:**
- `path` (string): File path in repository

**Returns:** Promise<Object|null> - File content object or null if not found

##### `createOrUpdateFile(path, content, message)`
Create or update a file in the repository.

**Parameters:**
- `path` (string): File path
- `content` (string): File content
- `message` (string): Commit message

### DocumentationManager

Extends RepositoryManager for documentation analysis and management.

#### Methods

##### `auditDocumentation()`
Perform comprehensive documentation audit.

**Returns:** Promise<Object> - Audit results with score and recommendations

##### `validateReadme(content)`
Validate README.md content structure.

**Parameters:**
- `content` (string): README content

**Returns:** Promise<Object> - Validation results

##### `generateMissingDocs(options)`
Generate missing documentation files.

**Parameters:**
- `options` (Object): Generation options
  - `autoGenerate` (boolean): Whether to auto-generate files

**Returns:** Promise<Object> - Generation results

### SecurityManager

Manages repository security settings and audits.

#### Methods

##### `auditSecurity()`
Perform security audit of repository.

**Returns:** Promise<Object> - Security audit results

##### `enableVulnerabilityAlerts()`
Enable vulnerability alerts for the repository.

**Returns:** Promise<boolean> - Success status

### BranchProtectionManager

Manages branch protection rules.

#### Methods

##### `auditBranchProtection()`
Audit current branch protection settings.

**Returns:** Promise<Object> - Branch protection audit results

##### `applyProtectionRules(branch, rules)`
Apply protection rules to a branch.

**Parameters:**
- `branch` (string): Branch name
- `rules` (Object): Protection rules configuration

### CICDManager

Manages CI/CD workflows and configurations.

#### Methods

##### `auditCICD()`
Audit CI/CD pipeline configuration.

**Returns:** Promise<Object> - CI/CD audit results

##### `generateWorkflowTemplate(type)`
Generate workflow template.

**Parameters:**
- `type` (string): Workflow type ('node', 'python', 'docker', etc.)

**Returns:** string - Workflow YAML content

### HealthScoreManager

Calculates overall repository health scores.

#### Methods

##### `calculateHealthScore()`
Calculate comprehensive repository health score.

**Returns:** Promise<Object> - Health score breakdown

##### `generateHealthReport()`
Generate detailed health report.

**Returns:** Promise<Object> - Detailed health report

## Configuration

### Basic Configuration

```javascript
const config = {
  organizationTag: "myorg",
  packagePath: "./package.json",
  repositoryType: "auto-detect",
  customTopics: {
    "api": ["api", "backend", "server"],
    "frontend": ["frontend", "ui", "web"]
  },
  organizationName: "My Organization",
  descriptionTemplate: "{description} - {organizationName} project"
};
```

### Advanced Configuration

```javascript
const advancedConfig = {
  // Basic settings
  organizationTag: "myorg",
  
  // Repository settings
  repositoryType: "library", // or "application", "api", "cli-tool"
  
  // Topic management
  customTopics: {
    "category": ["topic1", "topic2"]
  },
  
  // Security settings
  security: {
    enableVulnerabilityAlerts: true,
    enableDependabot: true,
    requireStatusChecks: true
  },
  
  // Branch protection
  branchProtection: {
    main: {
      requirePullRequest: true,
      requireApprovals: 2,
      requireStatusChecks: true,
      enforceAdmins: false
    }
  },
  
  // Documentation requirements
  documentation: {
    requireReadme: true,
    requireChangelog: true,
    requireContributing: true,
    requireCodeOfConduct: true,
    requireLicense: true
  }
};
```

## Error Handling

All API methods return Promises and should be wrapped in try-catch blocks:

```javascript
try {
  const manager = new DocumentationManager(config);
  const audit = await manager.auditDocumentation();
  console.log('Audit results:', audit);
} catch (error) {
  console.error('Error during audit:', error.message);
}
```

## Examples

### Basic Usage

```javascript
const { DocumentationManager } = require('@alteriom/repository-metadata-manager');

const config = {
  token: process.env.GITHUB_TOKEN,
  owner: 'myorg',
  repo: 'myrepo'
};

async function auditDocs() {
  const manager = new DocumentationManager(config);
  const results = await manager.auditDocumentation();
  
  console.log(`Documentation Score: ${results.score}/100`);
  
  if (results.recommendations.length > 0) {
    console.log('Recommendations:');
    results.recommendations.forEach(rec => console.log(`- ${rec}`));
  }
}

auditDocs().catch(console.error);
```

### Comprehensive Health Check

```javascript
const { HealthScoreManager } = require('@alteriom/repository-metadata-manager');

async function healthCheck() {
  const manager = new HealthScoreManager(config);
  const health = await manager.calculateHealthScore();
  
  console.log(`Overall Health: ${health.overall}/100`);
  console.log(`Documentation: ${health.documentation}/100`);
  console.log(`Security: ${health.security}/100`);
  console.log(`CI/CD: ${health.cicd}/100`);
}
```

## CLI Integration

The package includes CLI commands that utilize these APIs:

```bash
# Documentation audit
repo-health docs --audit

# Security audit  
repo-health security --audit

# Comprehensive health check
repo-health health

# Interactive mode
repo-health interactive
```

For more CLI documentation, see the [CLI Guide](../guides/CLI.md).
