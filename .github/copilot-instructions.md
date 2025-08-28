# GitHub Copilot Custom Instructions for Repository Metadata Manager

## Project Overview

This is the **Repository Metadata Manager** - a comprehensive enterprise-grade tool for managing GitHub repository metadata, security, documentation, CI/CD pipelines, and overall repository health to ensure compliance with organization standards.

### Core Purpose
- **📊 Repository Health Scoring**: Calculate weighted health scores across multiple categories
- **🔒 Security Management**: Local security auditing without GitHub API dependencies  
- **🛡️ Branch Protection**: Automated branch protection and policy management
- **📚 Documentation Standards**: Quality analysis and auto-generation capabilities
- **⚙️ CI/CD Pipeline Management**: Workflow analysis and template generation
- **🎯 Compliance Automation**: Full compliance checking with auto-fix capabilities

## Architecture & Technology Stack

### **Core Technologies**
- **Runtime**: Node.js 18+ (supports 18.x, 20.x, 22.x)
- **Package Manager**: npm with package-lock.json
- **CLI Framework**: Commander.js for command-line interface
- **GitHub Integration**: @octokit/rest for GitHub API interactions
- **Styling**: Chalk for terminal output formatting
- **Interactive Prompts**: Inquirer for user interaction

### **Project Structure**
```
├── bin/                     # CLI executables
│   ├── cli.js              # Original metadata CLI
│   └── enhanced-cli.js     # Main enhanced CLI interface
├── lib/                    # Core libraries
│   ├── core/              
│   │   └── RepositoryManager.js  # Main repository management
│   └── features/          # Feature modules
│       ├── BranchProtectionManager.js
│       ├── CICDManager.js
│       ├── DocumentationManager.js
│       ├── HealthScoreManager.js
│       └── SecurityManager.js
├── scripts/               # Utility scripts and local auditors
│   ├── docs-compliance-check.js
│   ├── security-audit-local.js
│   ├── branch-protection-local.js
│   ├── cicd-audit-local.js
│   └── test-features.js
├── .github/               # GitHub configuration
│   ├── workflows/         # CI/CD workflows
│   ├── ISSUE_TEMPLATE/    # Issue templates
│   └── CODEOWNERS        # Code review assignments
└── docs/                  # Documentation
```

## Development Guidelines

### **Code Style & Standards**
- **ES6+ JavaScript**: Use modern JavaScript features
- **Async/Await**: Prefer async/await over Promises and callbacks
- **Error Handling**: Comprehensive try-catch blocks with meaningful error messages
- **Logging**: Use chalk for colored output and clear user feedback
- **Comments**: JSDoc-style comments for functions and classes
- **Naming**: Descriptive names following camelCase convention

### **Function Patterns**
```javascript
// Preferred function structure
async function auditRepositoryHealth(options = {}) {
  try {
    console.log(chalk.blue('🔍 Starting repository health audit...'));
    
    const results = {
      score: 0,
      categories: {},
      recommendations: []
    };
    
    // Implementation logic
    
    return results;
  } catch (error) {
    console.error(chalk.red(`❌ Audit failed: ${error.message}`));
    throw error;
  }
}
```

### **CLI Command Structure**
- Use Commander.js for command definition
- Include comprehensive help text
- Support both interactive and non-interactive modes
- Provide dry-run options where applicable
- Include verbose/debug output options

### **Local Auditing Philosophy**
This project emphasizes **local file system analysis** over GitHub API dependency:
- Parse local files directly (package.json, README.md, etc.)
- Analyze Git repository structure locally
- Minimize GitHub API calls to reduce rate limiting
- Provide functionality without requiring admin permissions

## Feature Implementation Guidelines

### **Health Score Calculation**
- Use weighted scoring across 4 categories:
  - Documentation (25% weight)
  - Security (30% weight) 
  - Branch Protection (20% weight)
  - CI/CD (25% weight)
- Scores range from 0-100 with letter grades (A: 90+, B: 80+, C: 70+, etc.)
- Provide detailed breakdown and actionable recommendations

### **Documentation Analysis**
- Check for essential files: README.md, CHANGELOG.md, CONTRIBUTING.md, LICENSE, etc.
- Validate content quality and completeness
- Auto-generate missing documentation when possible
- Support multiple documentation formats and standards

### **Security Auditing**
- Local npm audit integration
- File permission analysis
- Secrets scanning capabilities
- SECURITY.md policy validation
- Dependency vulnerability checking

### **CI/CD Management**
- GitHub Actions workflow analysis
- Template generation for common patterns
- Security best practices validation
- Performance optimization recommendations

## CLI Usage Patterns

### **Primary Commands**
```bash
# Health assessment
repository-manager health                 # Overall health score
repository-manager health --detailed      # Detailed breakdown

# Category-specific audits
repository-manager docs --audit          # Documentation compliance
repository-manager security --audit      # Security assessment
repository-manager branches --audit      # Branch protection analysis
repository-manager cicd --audit         # CI/CD workflow analysis

# Interactive mode
repository-manager interactive           # Guided workflow

# Compliance automation
repository-manager compliance           # Full compliance check
repository-manager compliance --fix     # Auto-fix issues
```

### **Local Auditing Scripts**
```bash
# Direct script execution for local analysis
npm run docs                           # Documentation audit
npm run security                       # Security audit  
npm run branchprotection              # Branch protection audit
npm run cicd                          # CI/CD audit
npm run health                        # Overall health check
```

## Testing & Quality Assurance

### **Testing Strategy**
- **Unit Tests**: Jest for individual function testing
- **Integration Tests**: End-to-end CLI testing
- **Local Auditing**: Comprehensive feature validation
- **Cross-Platform**: Windows, macOS, Linux compatibility

### **Quality Metrics**
- Maintain 96+ overall health score
- 100% documentation compliance
- 90+ security score
- 100% branch protection compliance
- 96+ CI/CD score

## Configuration Management

### **Environment Variables**
```bash
# Optional GitHub API access
GITHUB_TOKEN=ghp_your_token_here
AGENT_ORG_TOKEN=ghp_your_token_here

# Repository identification (auto-detected if not set)
GITHUB_REPOSITORY_OWNER=your-org
GITHUB_REPOSITORY_NAME=your-repo
```

### **Configuration Files**
- **metadata-config.json**: Repository metadata configuration
- **.env**: Environment variables (optional)
- **package.json**: NPM scripts and project metadata

## Common Development Tasks

### **Adding New Auditing Features**
1. Create feature manager in `lib/features/`
2. Implement local auditing logic in `scripts/`
3. Add CLI command in `bin/enhanced-cli.js`
4. Update health score calculation
5. Add comprehensive tests
6. Update documentation

### **Workflow Template Creation**
1. Analyze common patterns in `lib/features/CICDManager.js`
2. Create template with security best practices
3. Include proper permissions and error handling
4. Test across different repository types
5. Document usage and customization options

### **Issue Template Enhancement**
- Use comprehensive forms with specific categories
- Include environment collection commands
- Provide clear reproduction steps
- Add impact assessment criteria
- Link to relevant documentation

## Error Handling & User Experience

### **Error Messages**
- Provide clear, actionable error messages
- Include suggestions for resolution
- Use appropriate emoji and colors for visual clarity
- Offer verbose mode for debugging

### **User Feedback**
- Show progress indicators for long operations
- Provide clear success/failure states
- Include helpful tips and next steps
- Maintain consistent formatting across all outputs

## Security Considerations

### **API Token Handling**
- Never log or expose GitHub tokens
- Support multiple token sources (.env, environment, CLI)
- Graceful degradation when tokens unavailable
- Clear documentation about permission requirements

### **Local Processing**
- Prefer local file analysis over API calls
- Validate file paths to prevent directory traversal
- Handle file permission errors gracefully
- Sanitize user inputs appropriately

## Documentation Standards

### **Code Documentation**
- JSDoc comments for all public functions
- Clear parameter and return type documentation
- Usage examples in comments
- Error conditions and handling notes

### **User Documentation**
- Comprehensive README with quick start guide
- Detailed CLI reference
- Configuration examples
- Troubleshooting guides
- Organization deployment instructions

## Performance Guidelines

### **Optimization Principles**
- Cache results where appropriate
- Use parallel processing for independent operations
- Minimize file I/O operations
- Implement efficient GitHub API usage patterns
- Profile and optimize bottlenecks

### **Resource Management**
- Handle large repositories efficiently
- Implement memory-conscious processing
- Provide progress feedback for long operations
- Support cancellation where appropriate

## Release Management

### **Versioning**
- Follow semantic versioning (MAJOR.MINOR.PATCH)
- Maintain comprehensive CHANGELOG.md
- Tag releases with detailed release notes
- Support automated release workflows

### **Backward Compatibility**
- Maintain API compatibility within major versions
- Provide migration guides for breaking changes
- Support gradual feature deprecation
- Comprehensive testing across versions

---

## Quick Reference for Copilot

When working on this repository:

1. **Always prioritize local file analysis** over GitHub API calls
2. **Use the established health scoring system** (Documentation 25%, Security 30%, Branch Protection 20%, CI/CD 25%)
3. **Follow the existing CLI patterns** with Commander.js and chalk
4. **Implement comprehensive error handling** with user-friendly messages
5. **Maintain backward compatibility** and update tests appropriately
6. **Use the local auditing scripts** for validation and testing
7. **Follow the enterprise-grade quality standards** established in the codebase
8. **Document changes thoroughly** and update relevant guides

This tool serves as an enterprise-grade solution for repository governance and compliance automation - maintain that standard in all contributions.
