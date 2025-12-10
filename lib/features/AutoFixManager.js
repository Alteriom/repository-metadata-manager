/**
 * AutoFixManager - Automated local file-based compliance fixes
 * 
 * Provides automated fixes for common compliance issues without requiring GitHub API:
 * - Documentation file creation (README, CONTRIBUTING, SECURITY.md, etc.)
 * - Basic file content improvements
 * - License file creation
 * - .gitignore improvements
 * - Issue and PR templates
 * 
 * @module AutoFixManager
 */

const fs = require('fs');
const path = require('path');
const chalk = require('../utils/colors');

class AutoFixManager {
    constructor(options = {}) {
        this.options = options;
        this.dryRun = options.dryRun || false;
        this.fixes = [];
        this.errors = [];
        this.repoPath = options.repoPath || process.cwd();
    }

    /**
     * Run all available auto-fixes
     * @returns {Object} Results summary
     */
    async runAllFixes() {
        console.log(chalk.blue('🔧 Running auto-fix suite...\n'));

        const fixMethods = [
            this.ensureSecurityMd.bind(this),
            this.ensureContributingMd.bind(this),
            this.ensureCodeOfConduct.bind(this),
            this.ensureIssueTemplates.bind(this),
            this.ensurePullRequestTemplate.bind(this),
            this.improveGitignore.bind(this),
        ];

        for (const fixMethod of fixMethods) {
            try {
                await fixMethod();
            } catch (error) {
                this.errors.push({
                    fix: fixMethod.name,
                    error: error.message,
                });
            }
        }

        return this.getSummary();
    }

    /**
     * Ensure SECURITY.md exists with basic content
     */
    async ensureSecurityMd() {
        const filePath = path.join(this.repoPath, 'SECURITY.md');
        
        if (fs.existsSync(filePath)) {
            console.log(chalk.gray('  ℹ️  SECURITY.md already exists'));
            return;
        }

        const content = `# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please send an email to security@example.com.

**Please do not report security vulnerabilities through public GitHub issues.**

We will respond as quickly as possible to your report and work with you to understand and resolve the issue.

## Security Best Practices

When using this repository:

1. Keep dependencies up to date
2. Use strong authentication
3. Review code changes carefully
4. Follow least privilege principle
5. Enable security features (branch protection, secret scanning, etc.)

## Disclosure Policy

We follow responsible disclosure principles:

1. Report received and acknowledged within 48 hours
2. Investigation and validation within 7 days
3. Fix developed and tested
4. Security advisory published
5. Credit given to reporter (if desired)

Thank you for helping keep this project secure!
`;

        if (this.dryRun) {
            console.log(chalk.yellow('  [DRY RUN] Would create SECURITY.md'));
        } else {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(chalk.green('  ✅ Created SECURITY.md'));
        }

        this.fixes.push({
            file: 'SECURITY.md',
            action: 'created',
            description: 'Security policy documentation',
        });
    }

    /**
     * Ensure CONTRIBUTING.md exists with basic content
     */
    async ensureContributingMd() {
        const filePath = path.join(this.repoPath, 'CONTRIBUTING.md');
        
        if (fs.existsSync(filePath)) {
            console.log(chalk.gray('  ℹ️  CONTRIBUTING.md already exists'));
            return;
        }

        const content = `# Contributing Guidelines

Thank you for considering contributing to this project! 

## How to Contribute

### Reporting Issues

- Check existing issues before creating a new one
- Use issue templates when available
- Provide clear description and reproduction steps
- Include relevant logs and screenshots

### Pull Requests

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/amazing-feature\`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Commit your changes (\`git commit -m 'feat: add amazing feature'\`)
7. Push to the branch (\`git push origin feature/amazing-feature\`)
8. Open a Pull Request

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- \`feat:\` New feature
- \`fix:\` Bug fix
- \`docs:\` Documentation changes
- \`style:\` Code style changes (formatting, etc.)
- \`refactor:\` Code refactoring
- \`test:\` Adding or updating tests
- \`chore:\` Maintenance tasks

### Code Style

- Follow existing code style
- Run linter before committing
- Write clear, descriptive variable names
- Add comments for complex logic
- Keep functions small and focused

### Testing

- Write tests for new features
- Update tests when modifying existing code
- Ensure all tests pass before submitting PR
- Aim for good test coverage

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Questions?

Feel free to open an issue for questions or reach out to maintainers.

Thank you for your contributions! 🎉
`;

        if (this.dryRun) {
            console.log(chalk.yellow('  [DRY RUN] Would create CONTRIBUTING.md'));
        } else {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(chalk.green('  ✅ Created CONTRIBUTING.md'));
        }

        this.fixes.push({
            file: 'CONTRIBUTING.md',
            action: 'created',
            description: 'Contribution guidelines',
        });
    }

    /**
     * Ensure CODE_OF_CONDUCT.md exists
     */
    async ensureCodeOfConduct() {
        const filePath = path.join(this.repoPath, 'CODE_OF_CONDUCT.md');
        
        if (fs.existsSync(filePath)) {
            console.log(chalk.gray('  ℹ️  CODE_OF_CONDUCT.md already exists'));
            return;
        }

        const content = `# Contributor Covenant Code of Conduct

## Our Pledge

We as members, contributors, and leaders pledge to make participation in our
community a harassment-free experience for everyone, regardless of age, body
size, visible or invisible disability, ethnicity, sex characteristics, gender
identity and expression, level of experience, education, socio-economic status,
nationality, personal appearance, race, religion, or sexual identity
and orientation.

## Our Standards

Examples of behavior that contributes to a positive environment:

* Using welcoming and inclusive language
* Being respectful of differing viewpoints and experiences
* Gracefully accepting constructive criticism
* Focusing on what is best for the community
* Showing empathy towards other community members

Examples of unacceptable behavior:

* The use of sexualized language or imagery
* Trolling, insulting/derogatory comments, and personal or political attacks
* Public or private harassment
* Publishing others' private information without explicit permission
* Other conduct which could reasonably be considered inappropriate

## Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be
reported to the community leaders responsible for enforcement.

All complaints will be reviewed and investigated promptly and fairly.

## Attribution

This Code of Conduct is adapted from the [Contributor Covenant](https://www.contributor-covenant.org),
version 2.0, available at https://www.contributor-covenant.org/version/2/0/code_of_conduct.html.
`;

        if (this.dryRun) {
            console.log(chalk.yellow('  [DRY RUN] Would create CODE_OF_CONDUCT.md'));
        } else {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(chalk.green('  ✅ Created CODE_OF_CONDUCT.md'));
        }

        this.fixes.push({
            file: 'CODE_OF_CONDUCT.md',
            action: 'created',
            description: 'Code of conduct',
        });
    }

    /**
     * Ensure issue templates exist
     */
    async ensureIssueTemplates() {
        const templatesDir = path.join(this.repoPath, '.github', 'ISSUE_TEMPLATE');
        
        // Create .github directory if it doesn't exist
        const githubDir = path.join(this.repoPath, '.github');
        if (!fs.existsSync(githubDir)) {
            if (!this.dryRun) {
                fs.mkdirSync(githubDir, { recursive: true });
            }
        }

        // Create ISSUE_TEMPLATE directory if it doesn't exist
        if (!fs.existsSync(templatesDir)) {
            if (!this.dryRun) {
                fs.mkdirSync(templatesDir, { recursive: true });
            }
        }

        // Bug report template
        const bugReportPath = path.join(templatesDir, 'bug_report.md');
        if (!fs.existsSync(bugReportPath)) {
            const bugReportContent = `---
name: Bug Report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
assignees: ''
---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. Windows, macOS, Linux]
 - Version: [e.g. 1.0.0]
 - Node.js version: [e.g. 18.0.0]

**Additional context**
Add any other context about the problem here.
`;

            if (this.dryRun) {
                console.log(chalk.yellow('  [DRY RUN] Would create bug_report.md template'));
            } else {
                fs.writeFileSync(bugReportPath, bugReportContent, 'utf8');
                console.log(chalk.green('  ✅ Created bug_report.md template'));
            }

            this.fixes.push({
                file: '.github/ISSUE_TEMPLATE/bug_report.md',
                action: 'created',
                description: 'Bug report template',
            });
        }

        // Feature request template
        const featureRequestPath = path.join(templatesDir, 'feature_request.md');
        if (!fs.existsSync(featureRequestPath)) {
            const featureRequestContent = `---
name: Feature Request
about: Suggest an idea for this project
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is. Ex. I'm always frustrated when [...]

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
`;

            if (this.dryRun) {
                console.log(chalk.yellow('  [DRY RUN] Would create feature_request.md template'));
            } else {
                fs.writeFileSync(featureRequestPath, featureRequestContent, 'utf8');
                console.log(chalk.green('  ✅ Created feature_request.md template'));
            }

            this.fixes.push({
                file: '.github/ISSUE_TEMPLATE/feature_request.md',
                action: 'created',
                description: 'Feature request template',
            });
        }
    }

    /**
     * Ensure pull request template exists
     */
    async ensurePullRequestTemplate() {
        const prTemplatePath = path.join(this.repoPath, '.github', 'PULL_REQUEST_TEMPLATE.md');
        
        if (fs.existsSync(prTemplatePath)) {
            console.log(chalk.gray('  ℹ️  Pull request template already exists'));
            return;
        }

        const content = `## Description

Please include a summary of the changes and which issue is fixed. Include relevant motivation and context.

Fixes # (issue)

## Type of change

Please delete options that are not relevant.

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] This change requires a documentation update

## How Has This Been Tested?

Please describe the tests that you ran to verify your changes.

- [ ] Test A
- [ ] Test B

## Checklist:

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published in downstream modules
`;

        // Ensure .github directory exists
        const githubDir = path.join(this.repoPath, '.github');
        if (!fs.existsSync(githubDir) && !this.dryRun) {
            fs.mkdirSync(githubDir, { recursive: true });
        }

        if (this.dryRun) {
            console.log(chalk.yellow('  [DRY RUN] Would create pull request template'));
        } else {
            fs.writeFileSync(prTemplatePath, content, 'utf8');
            console.log(chalk.green('  ✅ Created pull request template'));
        }

        this.fixes.push({
            file: '.github/PULL_REQUEST_TEMPLATE.md',
            action: 'created',
            description: 'Pull request template',
        });
    }

    /**
     * Improve .gitignore file
     */
    async improveGitignore() {
        const gitignorePath = path.join(this.repoPath, '.gitignore');
        
        const essentialEntries = [
            'node_modules/',
            '.env',
            '.env.local',
            '.DS_Store',
            '*.log',
            'npm-debug.log*',
            'coverage/',
            '.nyc_output/',
            'dist/',
            'build/',
        ];

        let existingContent = '';
        if (fs.existsSync(gitignorePath)) {
            existingContent = fs.readFileSync(gitignorePath, 'utf8');
        }

        const missingEntries = essentialEntries.filter(
            entry => !existingContent.includes(entry.replace('/', ''))
        );

        if (missingEntries.length === 0) {
            console.log(chalk.gray('  ℹ️  .gitignore is already comprehensive'));
            return;
        }

        const newContent = existingContent + 
            (existingContent && !existingContent.endsWith('\n') ? '\n' : '') +
            '\n# Essential entries added by auto-fix\n' +
            missingEntries.join('\n') + '\n';

        if (this.dryRun) {
            console.log(chalk.yellow(`  [DRY RUN] Would add ${missingEntries.length} entries to .gitignore`));
        } else {
            fs.writeFileSync(gitignorePath, newContent, 'utf8');
            console.log(chalk.green(`  ✅ Added ${missingEntries.length} entries to .gitignore`));
        }

        this.fixes.push({
            file: '.gitignore',
            action: 'updated',
            description: `Added ${missingEntries.length} essential entries`,
        });
    }

    /**
     * Get summary of all fixes
     * @returns {Object}
     */
    getSummary() {
        return {
            totalFixes: this.fixes.length,
            totalErrors: this.errors.length,
            fixes: this.fixes,
            errors: this.errors,
            dryRun: this.dryRun,
        };
    }

    /**
     * Display results summary
     */
    displaySummary() {
        const summary = this.getSummary();

        console.log(chalk.blue('\n📊 Auto-Fix Summary\n'));
        console.log(chalk.white(`Mode: ${summary.dryRun ? 'DRY RUN' : 'APPLIED'}`));
        console.log(chalk.green(`✅ Fixes applied: ${summary.totalFixes}`));
        
        if (summary.totalErrors > 0) {
            console.log(chalk.red(`❌ Errors: ${summary.totalErrors}`));
            summary.errors.forEach(error => {
                console.log(chalk.red(`  - ${error.fix}: ${error.error}`));
            });
        }

        if (summary.fixes.length > 0) {
            console.log(chalk.blue('\n📝 Changes:\n'));
            summary.fixes.forEach(fix => {
                console.log(chalk.white(`  ${fix.action === 'created' ? '➕' : '📝'} ${fix.file}`));
                console.log(chalk.gray(`     ${fix.description}`));
            });
        }

        console.log('');
    }
}

module.exports = AutoFixManager;
