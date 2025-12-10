# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **AI Agent Mode**: Zero-configuration automation for CI/CD and AI agents
  - `TokenManager`: Hierarchical GitHub token detection (Environment → GitHub Actions → .env)
  - `EnvironmentDetector`: Automatic CI/CD environment detection
  - `AutoFixManager`: Local file-based compliance fixes without API access
  - New `ai-agent` CLI command with `--auto-fix`, `--local-only`, `--dry-run`, `--detect` flags
  - GitHub Actions workflow for automated compliance checking
  - Graceful degradation when GitHub token is unavailable
  
- **Local-Only Mode**: Run compliance checks without GitHub API access
  - Automatic creation of missing documentation (SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md)
  - Issue and PR templates generation
  - .gitignore improvements
  - Branch protection auditing without API

### Changed

- **RepositoryManager**: Enhanced to support local-only mode with intelligent token management
- **Documentation**: Updated README with AI agent usage examples and GitHub Actions workflow
- **CLI**: Added comprehensive help text for new ai-agent command

### Fixed

- Graceful handling of missing GitHub tokens in automated environments
- Proper error messages when API is unavailable

## [1.2.1] - 2025-08-27

### Fixed

- CodeQL workflow conflict: Removed custom CodeQL job to avoid conflicts with GitHub's default setup
- Security workflow failures: Fixed bash arithmetic syntax in security summary logic
- npm badges: Updated README.md to use proper shields.io URLs for better compatibility
- Release process reliability: prepublishOnly script now runs only stable core tests (92 tests)
- Test infrastructure: Separated stable core tests from unstable infrastructure tests

### Added

- Comprehensive testing documentation section in README.md
- Clear test categorization: test:core, test:unstable, test commands
- Enhanced security workflow with better job success counting
- Improved error reporting in GitHub Actions workflows

### Changed

- Workflow reliability improvements with better conditional handling
- Enhanced documentation for development workflow and test structure

## [1.2.0] - 2025-08-27

### Added

- Comprehensive test suite with 41 tests covering all functionality
- Enhanced README.md with professional badges
- Version management and release workflow
- Improved repository metadata optimization

### Changed

- Updated repository description to match package.json
- Expanded repository topics with more comprehensive keywords

### Fixed

- Lint errors in CLI case block declarations
- Test configuration to properly handle Jest setup

## [1.0.0] - 2025-08-27

### Added

- Initial release of Repository Metadata Manager
- CLI tool for managing GitHub repository metadata
- Support for automatic repository type detection
- Configuration file support
- GitHub API integration for reading and updating metadata
- Compliance validation and reporting
- Organization tag support
- Dry-run mode for previewing changes

### Features

- **Commands**: report, validate, apply, dry-run
- **Repository Types**: ai-agent, api, frontend, cli-tool, library, general
- **Configuration**: File-based config, environment variables, CLI options
- **GitHub Integration**: Read/write repository descriptions and topics
- **Validation**: Compliance checking with detailed recommendations

### Dependencies

- @octokit/rest: ^20.0.0
- eslint: ^8.0.0
- jest: ^29.0.0
- prettier: ^3.0.0
