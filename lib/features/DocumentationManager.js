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
            if (content.length > 0 && typeof content[0] === 'object') {
                // GitHub API format - array of objects with 'name' property
                templates = content.filter(
                    (file) => file.name && file.name.endsWith('.md')
                );
            } else {
                // Local format - array of filenames
                templates = content.filter((file) => file.endsWith('.md'));
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
}

module.exports = DocumentationManager;
