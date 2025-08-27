# Repository Metadata Manager v1.0.0 🚀

**Initial stable release** - A comprehensive utility for managing GitHub repository metadata compliance across organizations.

## 🎯 What's New

### Core Features
- **📋 Compliance Reporting**: Generate detailed reports showing current vs recommended repository metadata
- **🤖 Auto-Detection**: Intelligent repository type detection (ai-agent, api, frontend, cli-tool, library, general)
- **⚙️ Configuration Support**: File-based configuration with organization tag management
- **🔄 GitHub Integration**: Read and update repository descriptions and topics via GitHub API
- **✅ Validation**: Check metadata compliance with detailed issue identification
- **👀 Dry-Run Mode**: Preview changes before applying them

### CLI Commands
```bash
# Generate compliance report
alteriom-metadata report --org-tag myorg

# Validate current compliance
alteriom-metadata validate --org-tag myorg

# Apply recommended changes
alteriom-metadata apply --org-tag myorg

# Preview changes (dry run)
alteriom-metadata dry-run --org-tag myorg
```

### Repository Types Detected
- **🤖 AI Agent**: Automation, GitHub integration, compliance tools
- **🔌 API**: Backend services, REST APIs, GraphQL servers
- **🎨 Frontend**: React apps, UI libraries, web applications
- **⚡ CLI Tool**: Command-line utilities, developer tools
- **📚 Library**: NPM packages, SDKs, utility libraries
- **🔧 General**: Other project types with basic utility topics

## 📦 Installation

```bash
# Install globally
npm install -g @alteriom/repository-metadata-manager

# Install in project
npm install --save-dev @alteriom/repository-metadata-manager

# Use with npx
npx @alteriom/repository-metadata-manager report --org-tag myorg
```

## 🚀 Quick Start

1. **Create configuration file** (`metadata-config.json`):
```json
{
    "organizationTag": "myorg",
    "customTopics": {
        "ai-agent": ["automation", "github-integration", "compliance"],
        "api": ["api", "backend", "server"],
        "frontend": ["frontend", "ui", "web"]
    }
}
```

2. **Add to package.json scripts**:
```json
{
    "scripts": {
        "metadata:report": "alteriom-metadata report --config metadata-config.json",
        "metadata:validate": "alteriom-metadata validate --config metadata-config.json",
        "metadata:apply": "alteriom-metadata apply --config metadata-config.json"
    }
}
```

3. **Run compliance check**:
```bash
npm run metadata:validate
```

## 🎨 Example Output

```bash
🔍 Generating repository metadata compliance report...

📋 Current Repository Metadata:
  Description: ""
  Topics: []

📦 Package.json Metadata:
  Description: "AI-powered automation tool"
  Keywords: [ai, automation, github]

❌ Compliance Issues Found:
  • Missing repository description
  • Missing repository topics/tags for discoverability

🎯 Recommended Changes:
  Description: "AI-powered automation tool"
  Topics: [myorg, ai, automation, github, github-integration, compliance]
```

## ⚙️ Configuration Options

### Environment Variables
- `GITHUB_TOKEN` or `AGENT_ORG_TOKEN`: GitHub API token for repository access
- `GITHUB_REPOSITORY_OWNER`: Repository owner (auto-detected from git)
- `GITHUB_REPOSITORY_NAME`: Repository name (auto-detected from git)

### Command Line Options
- `--owner <name>`: Repository owner
- `--repo <name>`: Repository name  
- `--token <token>`: GitHub API token
- `--package-path <path>`: Path to package.json (default: ./package.json)
- `--org-tag <tag>`: Organization tag for topics (**required**)
- `--config <path>`: Configuration file path

## 🧪 Quality & Testing

- **✅ 41 Comprehensive Tests**: Full test coverage for all functionality
- **🔍 ESLint**: Code quality and style enforcement
- **💅 Prettier**: Consistent code formatting
- **📝 TypeScript Support**: IntelliSense and type checking ready
- **🚀 CI/CD Ready**: GitHub Actions workflow included

## 📚 Documentation

- **📖 Complete README**: Installation, usage, and configuration
- **📋 Changelog**: Version history and changes
- **🔄 Versioning Guide**: Release workflow documentation
- **🏢 Organization Setup**: Guide for org-wide deployment

## 🛠️ Technical Details

### Dependencies
- **@octokit/rest**: GitHub API integration
- **Node.js**: >=14.0.0 support

### Development Dependencies  
- **jest**: Testing framework
- **eslint**: Code linting
- **prettier**: Code formatting

### Package Info
- **Size**: Lightweight, minimal dependencies
- **Scope**: @alteriom organization package
- **License**: MIT
- **Registry**: https://www.npmjs.com/package/@alteriom/repository-metadata-manager

## 🎯 Use Cases

### For Individual Repositories
```bash
# Quick compliance check
npx @alteriom/repository-metadata-manager validate --org-tag myorg

# Fix metadata issues
npx @alteriom/repository-metadata-manager apply --org-tag myorg
```

### For Organization-Wide Compliance
```bash
# Add to repository template
npm install --save-dev @alteriom/repository-metadata-manager

# Include in CI/CD pipeline
npm run metadata:validate

# Automated compliance checking
```

### For GitHub Actions
```yaml
- name: Check Repository Compliance
  run: npx @alteriom/repository-metadata-manager validate --org-tag myorg
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 🚀 Future Releases

Future versions will be automatically released using semantic versioning:
- **Patch releases** (1.0.x): Bug fixes and documentation updates
- **Minor releases** (1.x.0): New features and improvements
- **Major releases** (x.0.0): Breaking changes and major updates

## 🆘 Support & Contributing

- **📁 Repository**: https://github.com/Alteriom/repository-metadata-manager
- **🐛 Issues**: https://github.com/Alteriom/repository-metadata-manager/issues
- **📖 Documentation**: See README.md in repository
- **💬 Discussions**: GitHub Discussions for questions and feedback

---

**Ready to ensure your repositories meet compliance standards?** 

Install Repository Metadata Manager today and keep your organization's repositories properly documented and discoverable! 🎉
