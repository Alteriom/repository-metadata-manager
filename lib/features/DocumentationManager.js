const RepositoryManager = require('../core/RepositoryManager');
const fs = require('fs');
const path = require('path');

class DocumentationManager extends RepositoryManager {
    async auditDocumentation() {
        const results = {
            score: 0,
            maxScore: 100,
            files: [],
            recommendations: [],
        };

        const requiredDocs = [
            {
                file: 'README.md',
                weight: 30,
                validator: this.validateReadme.bind(this),
            },
            {
                file: 'CHANGELOG.md',
                weight: 15,
                validator: this.validateChangelog.bind(this),
            },
            {
                file: 'CONTRIBUTING.md',
                weight: 15,
                validator: this.validateContributing.bind(this),
            },
            {
                file: 'CODE_OF_CONDUCT.md',
                weight: 10,
                validator: this.validateCodeOfConduct.bind(this),
            },
            {
                file: 'LICENSE',
                weight: 15,
                validator: this.validateLicense.bind(this),
            },
            {
                file: '.github/ISSUE_TEMPLATE/',
                weight: 8,
                validator: this.validateIssueTemplates.bind(this),
            },
            {
                file: '.github/PULL_REQUEST_TEMPLATE.md',
                weight: 7,
                validator: this.validatePRTemplate.bind(this),
            },
        ];

        for (const doc of requiredDocs) {
            const analysis = await this.analyzeDocument(doc);
            results.files.push(analysis);
        }

        results.score = this.calculateDocScore(results.files);
        return results;
    }

    async analyzeDocument(docConfig) {
        const { file, weight, validator } = docConfig;

        // Try GitHub API first, fallback to local filesystem
        let content = null;
        try {
            content = await this.getContents(file);
        } catch (error) {
            if (!this.silent) {
                console.log(
                    `⚠️  GitHub API failed for ${file}, using local fallback`
                );
            }
            content = await this.getLocalContents(file);
        }

        const analysis = {
            file,
            exists: content !== null,
            weight,
            score: 0,
            issues: [],
            recommendations: [],
        };

        if (content) {
            if (validator) {
                const validation = await validator(content);
                analysis.score = validation.score;
                analysis.issues = validation.issues;
                analysis.recommendations = validation.recommendations;
            } else {
                analysis.score = weight; // Full points for existence
            }
        } else {
            analysis.issues.push(`${file} is missing`);
            analysis.recommendations.push(`Create ${file}`);
        }

        return analysis;
    }

    async getLocalContents(file) {
        try {
            const filePath = path.join(process.cwd(), file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {
                // Handle directories (like .github/ISSUE_TEMPLATE/)
                const files = fs.readdirSync(filePath);
                return files; // Return array of filenames
            } else {
                // Handle files - return in GitHub API format
                const content = fs.readFileSync(filePath, 'utf8');
                return {
                    content: Buffer.from(content).toString('base64'),
                    encoding: 'base64',
                };
            }
        } catch (error) {
            return null; // File doesn't exist
        }
    }

    async validateReadme(content) {
        const text = Buffer.from(content.content, 'base64').toString();
        const validation = { score: 0, issues: [], recommendations: [] };

        const requiredSections = [
            { name: 'Title/Header', pattern: /^#\s+.+/m, weight: 5 },
            {
                name: 'Description',
                pattern: /description|what|purpose/i,
                weight: 8,
            },
            {
                name: 'Installation',
                pattern: /install|setup|getting started/i,
                weight: 6,
            },
            { name: 'Usage', pattern: /usage|example|how to/i, weight: 6 },
            {
                name: 'Contributing',
                pattern: /contribut|development/i,
                weight: 3,
            },
            { name: 'License', pattern: /license/i, weight: 2 },
        ];

        for (const section of requiredSections) {
            if (section.pattern.test(text)) {
                validation.score += section.weight;
            } else {
                validation.issues.push(`Missing ${section.name} section`);
                validation.recommendations.push(
                    `Add ${section.name} section to README`
                );
            }
        }

        // Check for badges
        if (/!\[.*\]\(.*badge.*\)/i.test(text)) {
            validation.score += 2;
        } else {
            validation.recommendations.push('Consider adding status badges');
        }

        return validation;
    }

    async validateChangelog(content) {
        const text = Buffer.from(content.content, 'base64').toString();
        const validation = { score: 0, issues: [], recommendations: [] };

        if (/## \[?\d+\.\d+\.\d+\]?/.test(text)) {
            validation.score += 8;
        } else {
            validation.issues.push('No version entries found');
        }

        if (
            /### (Added|Changed|Deprecated|Removed|Fixed|Security)/i.test(text)
        ) {
            validation.score += 7;
        } else {
            validation.recommendations.push(
                'Use standard changelog categories'
            );
        }

        return validation;
    }

    async validateContributing(content) {
        const text = Buffer.from(content.content, 'base64').toString();
        const validation = { score: 0, issues: [], recommendations: [] };

        const sections = [
            {
                name: 'Development setup',
                pattern: /setup|development|local/i,
                weight: 5,
            },
            {
                name: 'Pull request process',
                pattern: /pull request|pr|merge/i,
                weight: 5,
            },
            {
                name: 'Code standards',
                pattern: /code|style|standards|lint/i,
                weight: 3,
            },
            { name: 'Testing', pattern: /test|testing/i, weight: 2 },
        ];

        for (const section of sections) {
            if (section.pattern.test(text)) {
                validation.score += section.weight;
            } else {
                validation.recommendations.push(
                    `Add ${section.name} guidelines`
                );
            }
        }

        return validation;
    }

    async validateCodeOfConduct(content) {
        const text = Buffer.from(content.content, 'base64').toString();
        const validation = { score: 10, issues: [], recommendations: [] };

        if (!/contributor covenant/i.test(text) && text.length < 500) {
            validation.score = 6;
            validation.recommendations.push(
                'Consider using Contributor Covenant template'
            );
        }

        return validation;
    }

    async validateLicense(content) {
        const text = Buffer.from(content.content, 'base64').toString();
        const validation = { score: 0, issues: [], recommendations: [] };

        const licenses = ['MIT', 'Apache', 'GPL', 'BSD', 'ISC'];
        if (licenses.some((license) => text.includes(license))) {
            validation.score = 15;
        } else {
            validation.issues.push('Unknown or missing license');
            validation.recommendations.push(
                'Add a standard open source license'
            );
        }

        return validation;
    }

    async validateIssueTemplates(content) {
        const validation = { score: 0, issues: [], recommendations: [] };

        // Handle both GitHub API response (array of objects) and local response (array of strings)
        if (Array.isArray(content)) {
            let templates;
            if (
                content.length > 0 &&
                content.every(
                    (file) =>
                        typeof file === 'object' &&
                        file !== null &&
                        typeof file.name === 'string'
                )
            ) {
                // GitHub API format - array of objects with 'name' property
                templates = content.filter(
                    (file) => file.name && file.name.endsWith('.md')
                );
            } else if (
                content.length > 0 &&
                content.every((file) => typeof file === 'string')
            ) {
                // Local format - array of filenames
                templates = content.filter((file) => file.endsWith('.md'));
            } else {
                // Unknown or mixed format
                templates = [];
            }

            if (templates.length >= 2) {
                validation.score = 8;
            } else if (templates.length === 1) {
                validation.score = 5;
                validation.recommendations.push(
                    'Consider adding more issue templates'
                );
            } else {
                validation.issues.push('No markdown issue templates found');
                validation.recommendations.push(
                    'Create issue templates for bugs and features'
                );
            }
        } else {
            validation.issues.push('No issue templates found');
            validation.recommendations.push(
                'Create issue templates for bugs and features'
            );
        }

        return validation;
    }

    async validatePRTemplate(content) {
        const text = Buffer.from(content.content, 'base64').toString();
        const validation = { score: 0, issues: [], recommendations: [] };

        if (/checklist|checkbox|\[ \]/.test(text)) {
            validation.score += 4;
        }
        if (/description|summary|changes/i.test(text)) {
            validation.score += 3;
        }

        if (validation.score === 0) {
            validation.recommendations.push(
                'Add checklist and description prompts to PR template'
            );
        }

        return validation;
    }

    calculateDocScore(files) {
        const totalWeight = files.reduce((sum, file) => sum + file.weight, 0);
        const earnedScore = files.reduce((sum, file) => sum + file.score, 0);
        return Math.round((earnedScore / totalWeight) * 100);
    }

    async generateMissingDocs(options = {}) {
        const audit = await this.auditDocumentation();
        const generated = [];

        for (const file of audit.files) {
            if (!file.exists && options.autoGenerate !== false) {
                const content = await this.generateDocumentContent(file.file);
                if (content) {
                    await this.createOrUpdateFile(
                        file.file,
                        content,
                        `Add ${file.file}`
                    );
                    generated.push(file.file);
                }
            }
        }

        return { audit, generated };
    }

    async generateDocumentContent(filename) {
        const templates = {
            'CONTRIBUTING.md': this.getContributingTemplate(),
            'CODE_OF_CONDUCT.md': this.getCodeOfConductTemplate(),
            'CHANGELOG.md': this.getChangelogTemplate(),
            '.github/PULL_REQUEST_TEMPLATE.md': this.getPRTemplate(),
        };

        return templates[filename] || null;
    }

    getContributingTemplate() {
        return `# Contributing to ${this.repo}

## Development Setup

1. Fork the repository
2. Clone your fork: \`git clone https://github.com/YOUR_USERNAME/${this.repo}.git\`
3. Install dependencies: \`npm install\`
4. Create a branch: \`git checkout -b feature/your-feature\`

## Making Changes

1. Make your changes
2. Add tests if applicable
3. Run tests: \`npm test\`
4. Run linting: \`npm run lint\`
5. Commit your changes: \`git commit -m "Description of changes"\`

## Pull Request Process

1. Push to your fork: \`git push origin feature/your-feature\`
2. Create a Pull Request
3. Fill out the PR template
4. Wait for review and address feedback

## Code Standards

- Follow existing code style
- Add tests for new features
- Update documentation as needed
- Keep commits atomic and well-described

Thank you for contributing!
`;
    }

    getCodeOfConductTemplate() {
        return `# Contributor Covenant Code of Conduct

## Our Pledge

We as members, contributors, and leaders pledge to make participation in our
community a harassment-free experience for everyone, regardless of age, body
size, visible or invisible disability, ethnicity, sex characteristics, gender
identity and expression, level of experience, education, socio-economic status,
nationality, personal appearance, race, religion, or sexual identity
and orientation.

## Our Standards

Examples of behavior that contributes to a positive environment:

* Demonstrating empathy and kindness toward other people
* Being respectful of differing opinions, viewpoints, and experiences
* Giving and gracefully accepting constructive feedback
* Accepting responsibility and apologizing to those affected by our mistakes
* Focusing on what is best not just for us as individuals, but for the overall community

## Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be
reported to the community leaders responsible for enforcement at
[INSERT CONTACT METHOD].

This Code of Conduct is adapted from the [Contributor Covenant][homepage],
version 2.0, available at
https://www.contributor-covenant.org/version/2/0/code_of_conduct.html.

[homepage]: https://www.contributor-covenant.org
`;
    }

    getChangelogTemplate() {
        return `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release

### Changed

### Deprecated

### Removed

### Fixed

### Security

## [1.0.0] - ${new Date().toISOString().split('T')[0]}

### Added
- Initial release of ${this.repo}
`;
    }

    getPRTemplate() {
        return `## Description

Brief description of changes made.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing

- [ ] Tests pass locally
- [ ] Added tests for new functionality
- [ ] Manual testing completed

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated if needed
- [ ] No new warnings introduced
- [ ] Changes are backward compatible (or breaking changes documented)

## Related Issues

Closes #(issue number)
`;
    }

    /**
     * Check for missing documentation files
     * Returns list of missing required documentation files
     */
    /**
     * Check for missing documentation files
     * @param {object} options - Options for checking
     * @param {boolean} options.remote - If true, check remote repository instead of local filesystem
     */
    async checkDocumentation(options = {}) {
        const { remote = false } = options;
        
        const requiredDocs = [
            'README.md',
            'CHANGELOG.md',
            'CONTRIBUTING.md',
            'CODE_OF_CONDUCT.md',
            'LICENSE',
            'SECURITY.md',
        ];

        const missing = [];
        const existing = [];

        for (const doc of requiredDocs) {
            try {
                let content;
                if (remote && this.octokit) {
                    // Check remote repository via GitHub API
                    try {
                        await this.octokit.repos.getContent({
                            owner: this.owner,
                            repo: this.repo,
                            path: doc,
                        });
                        existing.push(doc);
                    } catch (error) {
                        if (error.status === 404) {
                            missing.push(doc);
                        } else {
                            throw error;
                        }
                    }
                } else {
                    // Check local filesystem
                    content = await this.getLocalContents(doc);
                    if (content) {
                        existing.push(doc);
                    } else {
                        missing.push(doc);
                    }
                }
            } catch (error) {
                missing.push(doc);
            }
        }

        return { missing, existing };
    }

    /**
     * Generate missing documentation file
     * Returns true if generated successfully
     * @param {string} filename - The documentation file to generate
     * @param {object} options - Options for generation
     * @param {boolean} options.remote - If true, create file via GitHub API instead of local filesystem
     * @param {string} options.branch - Branch to create file on (default: main)
     */
    async generateDocumentation(filename, options = {}) {
        const { remote = false, branch = 'main' } = options;
        
        const templates = {
            'README.md': this.generateReadmeTemplate.bind(this),
            'CHANGELOG.md': this.generateChangelogTemplate.bind(this),
            'CONTRIBUTING.md': this.generateContributingTemplate.bind(this),
            'CODE_OF_CONDUCT.md': this.generateCodeOfConductTemplate.bind(this),
            'SECURITY.md': this.generateSecurityTemplate.bind(this),
            LICENSE: this.generateLicenseTemplate.bind(this),
        };

        const generator = templates[filename];
        if (!generator) {
            console.error(`No template generator for ${filename}`);
            return false;
        }

        try {
            const content = await generator();
            
            if (remote && this.octokit) {
                // Create file via GitHub API
                return await this.createFileViaAPI(filename, content, branch);
            } else {
                // Create file locally
                const filePath = path.join(process.cwd(), filename);

                // Create directories if needed
                const dir = path.dirname(filePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                fs.writeFileSync(filePath, content, 'utf8');
                return true;
            }
        } catch (error) {
            console.error(`Failed to generate ${filename}: ${error.message}`);
            return false;
        }
    }

    /**
     * Create or update a file via GitHub API
     * @param {string} filename - The file path
     * @param {string} content - The file content
     * @param {string} branch - The branch to create/update on
     */
    async createFileViaAPI(filename, content, branch = 'main') {
        try {
            // Check if file already exists
            let sha;
            try {
                const { data } = await this.octokit.repos.getContent({
                    owner: this.owner,
                    repo: this.repo,
                    path: filename,
                    ref: branch,
                });
                sha = data.sha;
            } catch (error) {
                // File doesn't exist, that's fine
                sha = null;
            }

            // Create or update the file
            const message = sha
                ? `docs: update ${filename} via auto-fix`
                : `docs: add ${filename} via auto-fix`;

            await this.octokit.repos.createOrUpdateFileContents({
                owner: this.owner,
                repo: this.repo,
                path: filename,
                message,
                content: Buffer.from(content).toString('base64'),
                branch,
                sha, // Include sha if updating existing file
            });

            return true;
        } catch (error) {
            console.error(
                `Failed to create ${filename} via API: ${error.message}`
            );
            return false;
        }
    }

    /**
     * Generate README.md template
     */
    generateReadmeTemplate() {
        const packageJson = this.getPackageJson();
        const repoName = packageJson?.name || this.repo;
        const description = packageJson?.description || 'A project by Alteriom';

        return `# ${repoName}

${description}

## Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/${this.owner}/${this.repo}.git

# Install dependencies
npm install
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Security

Please see [SECURITY.md](SECURITY.md) for information on reporting security vulnerabilities.
`;
    }

    /**
     * Generate CHANGELOG.md template
     */
    generateChangelogTemplate() {
        return `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release

### Changed

### Deprecated

### Removed

### Fixed

### Security
`;
    }

    /**
     * Generate CONTRIBUTING.md template
     */
    generateContributingTemplate() {
        return `# Contributing to ${this.repo}

Thank you for considering contributing to this project!

## How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: \`git checkout -b feature/my-new-feature\`
3. **Make your changes**
4. **Commit your changes**: \`git commit -am 'Add some feature'\`
5. **Push to the branch**: \`git push origin feature/my-new-feature\`
6. **Submit a pull request**

## Code Style

- Follow existing code style and conventions
- Write clear, descriptive commit messages
- Add tests for new features
- Update documentation as needed

## Reporting Bugs

Please use the GitHub issue tracker to report bugs. Include:
- Clear description of the bug
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Node version, etc.)

## Pull Request Process

1. Ensure all tests pass
2. Update the README.md with details of changes if needed
3. Update the CHANGELOG.md following [Keep a Changelog](https://keepachangelog.com/) format
4. The PR will be merged once you have the sign-off of at least one maintainer

## Code of Conduct

Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details on our code of conduct.

Thank you for contributing!
`;
    }

    /**
     * Generate CODE_OF_CONDUCT.md template
     */
    generateCodeOfConductTemplate() {
        return `# Contributor Covenant Code of Conduct

## Our Pledge

We as members, contributors, and leaders pledge to make participation in our
community a harassment-free experience for everyone, regardless of age, body
size, visible or invisible disability, ethnicity, sex characteristics, gender
identity and expression, level of experience, education, socio-economic status,
nationality, personal appearance, race, religion, or sexual identity
and orientation.

We pledge to act and interact in ways that contribute to an open, welcoming,
diverse, inclusive, and healthy community.

## Our Standards

Examples of behavior that contributes to a positive environment for our
community include:

* Demonstrating empathy and kindness toward other people
* Being respectful of differing opinions, viewpoints, and experiences
* Giving and gracefully accepting constructive feedback
* Accepting responsibility and apologizing to those affected by our mistakes,
  and learning from the experience
* Focusing on what is best not just for us as individuals, but for the
  overall community

Examples of unacceptable behavior include:

* The use of sexualized language or imagery, and sexual attention or
  advances of any kind
* Trolling, insulting or derogatory comments, and personal or political attacks
* Public or private harassment
* Publishing others' private information, such as a physical or email
  address, without their explicit permission
* Other conduct which could reasonably be considered inappropriate in a
  professional setting

## Enforcement Responsibilities

Community leaders are responsible for clarifying and enforcing our standards of
acceptable behavior and will take appropriate and fair corrective action in
response to any behavior that they deem inappropriate, threatening, offensive,
or harmful.

## Scope

This Code of Conduct applies within all community spaces, and also applies when
an individual is officially representing the community in public spaces.

## Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be
reported to the community leaders responsible for enforcement at
[INSERT CONTACT METHOD].

All complaints will be reviewed and investigated promptly and fairly.

## Attribution

This Code of Conduct is adapted from the [Contributor Covenant][homepage],
version 2.0, available at
https://www.contributor-covenant.org/version/2/0/code_of_conduct.html.

[homepage]: https://www.contributor-covenant.org
`;
    }

    /**
     * Generate SECURITY.md template
     */
    generateSecurityTemplate() {
        const packageJson = this.getPackageJson();
        const repoName = packageJson?.name || 'this project';

        return `# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in ${repoName}, please report it by:

1. **DO NOT** open a public issue
2. Email security@example.com with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and provide regular updates on the progress of the fix.

## Security Update Process

1. Vulnerability is reported
2. Team confirms and assesses severity
3. Fix is developed and tested
4. Security advisory is published
5. Patch is released
6. Public disclosure after users have time to update

Thank you for helping keep ${repoName} secure!
`;
    }

    /**
     * Generate LICENSE template (MIT)
     */
    generateLicenseTemplate() {
        const year = new Date().getFullYear();
        return `MIT License

Copyright (c) ${year} Alteriom

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
    }

    /**
     * Get package.json data if available
     */
    getPackageJson() {
        try {
            const pkgPath = path.join(process.cwd(), 'package.json');
            if (fs.existsSync(pkgPath)) {
                return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            }
        } catch (error) {
            // Ignore errors
        }
        return null;
    }
}

module.exports = DocumentationManager;
