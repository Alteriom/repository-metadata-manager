# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.4] - 2025-08-28

### Added

- **Enhanced Documentation Management**: Local fallback system for GitHub API failures
- **Comprehensive Token Testing**: `scripts/test-docs-tokens.js` for multi-token validation
- **Local Analysis Capabilities**: Direct file system analysis when API unavailable
- **Multi-token Authentication**: Support for GITHUB_TOKEN, AGENT_ORG_TOKEN, ORG_ACCESS_TOKEN
- **Dependency Review Configuration**: `.github/dependency-review-config.yml`
- **Release Documentation**: Complete release notes for v1.2.3 and v1.2.4

### Enhanced

- **DocumentationManager**: Added `getLocalContents()` method for offline operation
- **CI/CD Workflows**: Simplified and improved reliability of GitHub Actions
- **Error Handling**: Graceful degradation when GitHub API is unavailable
- **Token Management**: Automatic failover between multiple authentication tokens
- **Health Scoring**: Achieved 102/100 documentation score with local fallback

### Fixed

- **GitHub API Failures**: Implemented local fallback for 500 server errors
- **Branch Protection**: Resolved status check reporting for `ci/tests`
- **Dependency Review**: Fixed configuration conflicts in security workflows
- **CI Status Checks**: Simplified workflow to ensure proper status reporting
- **Token Authentication**: Enhanced priority handling and error recovery

### Changed

- **CLI Interface**: Updated token priority configuration in enhanced-cli.js
- **Testing Strategy**: Enhanced cross-platform compatibility testing
- **Documentation Standards**: Improved scoring algorithm and analysis
- **Release Process**: Streamlined with better error handling and validation

## [1.2.3] - 2025-08-28 (Not Published)

### Note
Version 1.2.3 was a development release that was never published to NPM. All improvements from this version were consolidated into v1.2.4 for better stability.

### Development Changes (Included in v1.2.4)
- Enhanced GitHub Actions workflow configuration
- Fixed dependency review action configuration conflicts  
- Improved status check reporting for branch protection
- Simplified CI workflow for better reliability

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
