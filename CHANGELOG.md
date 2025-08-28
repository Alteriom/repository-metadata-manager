# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
