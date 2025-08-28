const fs = require('fs');
const path = require('path');

class LocalDocumentationAuditor {
    constructor(basePath) {
        this.basePath = basePath;
    }

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
            {
                file: 'docs/',
                weight: 10,
                validator: this.validateDocsDirectory.bind(this),
            },
        ];

        for (const doc of requiredDocs) {
            const analysis = await this.analyzeDocument(doc);
            results.files.push(analysis);
        }

        results.score = this.calculateDocScore(results.files);
        results.recommendations = this.generateRecommendations(results.files);
        return results;
    }

    async analyzeDocument(docConfig) {
        const { file, weight, validator } = docConfig;
        const filePath = path.join(this.basePath, file);

        const analysis = {
            file,
            exists: false,
            weight,
            score: 0,
            issues: [],
            recommendations: [],
        };

        try {
            const stats = fs.statSync(filePath);
            analysis.exists = true;

            if (stats.isDirectory()) {
                // Handle directory case (like .github/ISSUE_TEMPLATE/)
                const files = fs.readdirSync(filePath);
                if (validator) {
                    const validation = await validator(files);
                    analysis.score = validation.score;
                    analysis.issues = validation.issues;
                    analysis.recommendations = validation.recommendations;
                } else {
                    analysis.score = weight;
                }
            } else {
                // Handle file case
                const content = fs.readFileSync(filePath, 'utf8');
                if (validator) {
                    const validation = await validator(content);
                    analysis.score = validation.score;
                    analysis.issues = validation.issues;
                    analysis.recommendations = validation.recommendations;
                } else {
                    analysis.score = weight;
                }
            }
        } catch (error) {
            analysis.issues.push(`${file} is missing`);
            analysis.recommendations.push(`Create ${file}`);
        }

        return analysis;
    }

    async validateReadme(content) {
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
            if (section.pattern.test(content)) {
                validation.score += section.weight;
            } else {
                validation.issues.push(`Missing ${section.name} section`);
                validation.recommendations.push(
                    `Add ${section.name} section to README`
                );
            }
        }

        // Check for badges
        if (/!\[.*\]\(.*badge.*\)/i.test(content)) {
            validation.score += 2;
        } else {
            validation.recommendations.push('Consider adding status badges');
        }

        return validation;
    }

    async validateChangelog(content) {
        const validation = { score: 0, issues: [], recommendations: [] };

        if (/## \[?\d+\.\d+\.\d+\]?/.test(content)) {
            validation.score += 8;
        } else {
            validation.issues.push('No version entries found');
        }

        if (
            /### (Added|Changed|Deprecated|Removed|Fixed|Security)/i.test(
                content
            )
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
            if (section.pattern.test(content)) {
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
        const validation = { score: 10, issues: [], recommendations: [] };

        if (!/contributor covenant/i.test(content) && content.length < 500) {
            validation.score = 6;
            validation.recommendations.push(
                'Consider using Contributor Covenant template'
            );
        }

        return validation;
    }

    async validateLicense(content) {
        const validation = { score: 0, issues: [], recommendations: [] };

        const licenses = ['MIT', 'Apache', 'GPL', 'BSD', 'ISC'];
        if (licenses.some((license) => content.includes(license))) {
            validation.score = 15;
        } else {
            validation.issues.push('Unknown or missing license');
            validation.recommendations.push(
                'Add a standard open source license'
            );
        }

        return validation;
    }

    async validateIssueTemplates(files) {
        const validation = { score: 0, issues: [], recommendations: [] };

        const templates = files.filter((file) => file.endsWith('.md'));
        if (templates.length >= 2) {
            validation.score = 8;
        } else if (templates.length === 1) {
            validation.score = 5;
            validation.recommendations.push(
                'Consider adding more issue templates'
            );
        } else {
            validation.issues.push('No issue templates found');
            validation.recommendations.push(
                'Create issue templates for bugs and features'
            );
        }

        return validation;
    }

    async validatePRTemplate(content) {
        const validation = { score: 0, issues: [], recommendations: [] };

        if (/checklist|checkbox|\[ \]/.test(content)) {
            validation.score += 4;
        }
        if (/description|summary|changes/i.test(content)) {
            validation.score += 3;
        }

        if (validation.score === 0) {
            validation.recommendations.push(
                'Add checklist and description prompts to PR template'
            );
        }

        return validation;
    }

    async validateDocsDirectory(files) {
        const validation = { score: 0, issues: [], recommendations: [] };

        // Check for README.md in docs directory
        if (files.includes('README.md')) {
            validation.score += 4;
        } else {
            validation.issues.push('No README.md in docs directory');
        }

        // Check for organized subdirectories
        const expectedDirs = ['guides', 'development', 'releases'];
        const existingDirs = files.filter((file) => {
            const filePath = path.join(this.basePath, 'docs', file);
            try {
                return fs.statSync(filePath).isDirectory();
            } catch {
                return false;
            }
        });

        const foundDirs = expectedDirs.filter((dir) =>
            existingDirs.includes(dir)
        );
        validation.score += Math.min(foundDirs.length * 2, 6); // Max 6 points for directories

        if (foundDirs.length < expectedDirs.length) {
            validation.recommendations.push(
                'Consider organizing docs into subdirectories: guides, development, releases'
            );
        }

        return validation;
    }

    calculateDocScore(files) {
        const totalWeight = files.reduce((sum, file) => sum + file.weight, 0);
        const earnedScore = files.reduce((sum, file) => sum + file.score, 0);
        return Math.round((earnedScore / totalWeight) * 100);
    }

    generateRecommendations(files) {
        const recommendations = [];
        for (const file of files) {
            recommendations.push(...file.recommendations);
        }
        return [...new Set(recommendations)]; // Remove duplicates
    }

    displayResults(results) {
        console.log('\n📋 DOCUMENTATION COMPLIANCE AUDIT');
        console.log('='.repeat(50));
        console.log(`Overall Score: ${results.score}/100`);

        const getScoreColor = (score) => {
            if (score >= 80) return '🟢';
            if (score >= 60) return '🟡';
            return '🔴';
        };

        console.log(
            `Status: ${getScoreColor(results.score)} ${
                results.score >= 80
                    ? 'Excellent'
                    : results.score >= 60
                      ? 'Good'
                      : 'Needs Improvement'
            }`
        );

        console.log('\n📁 FILE STATUS:');
        console.log('-'.repeat(50));

        for (const file of results.files) {
            const status = file.exists ? '✅' : '❌';
            const scorePercent =
                file.weight > 0
                    ? Math.round((file.score / file.weight) * 100)
                    : 0;
            console.log(
                `${status} ${file.file.padEnd(35)} ${scorePercent}% (${file.score}/${file.weight})`
            );

            if (file.issues.length > 0) {
                file.issues.forEach((issue) => console.log(`    ⚠️  ${issue}`));
            }
        }

        if (results.recommendations.length > 0) {
            console.log('\n💡 RECOMMENDATIONS:');
            console.log('-'.repeat(50));
            results.recommendations.forEach((rec, i) => {
                console.log(`${i + 1}. ${rec}`);
            });
        }

        console.log('\n' + '='.repeat(50));

        // Additional suggestions for improvement
        this.suggestImprovements(results);
    }

    suggestImprovements(results) {
        console.log('\n🔧 SUGGESTED ACTIONS:');
        console.log('-'.repeat(50));

        const missingFiles = results.files.filter((f) => !f.exists);
        const incompleteFiles = results.files.filter(
            (f) => f.exists && f.score < f.weight
        );

        if (missingFiles.length > 0) {
            console.log('\n📝 Create missing files:');
            missingFiles.forEach((file) => {
                console.log(`   • ${file.file}`);
            });
        }

        if (incompleteFiles.length > 0) {
            console.log('\n✏️  Improve existing files:');
            incompleteFiles.forEach((file) => {
                console.log(`   • ${file.file} - ${file.issues.join(', ')}`);
            });
        }

        if (results.score < 80) {
            console.log('\n🎯 Priority improvements for better compliance:');
            if (!results.files.find((f) => f.file === 'README.md')?.exists) {
                console.log('   1. Create a comprehensive README.md');
            }
            if (!results.files.find((f) => f.file === 'LICENSE')?.exists) {
                console.log('   2. Add a LICENSE file');
            }
            if (
                !results.files.find((f) => f.file === 'CONTRIBUTING.md')?.exists
            ) {
                console.log('   3. Create contribution guidelines');
            }
        }
    }

    async generateMissingFiles() {
        console.log('\n🔨 GENERATING MISSING DOCUMENTATION FILES...');
        console.log('-'.repeat(50));

        const templates = {
            'CODE_OF_CONDUCT.md': this.getCodeOfConductTemplate(),
            '.github/PULL_REQUEST_TEMPLATE.md': this.getPRTemplate(),
        };

        for (const [filename, content] of Object.entries(templates)) {
            const filePath = path.join(this.basePath, filename);
            const dir = path.dirname(filePath);

            try {
                // Check if file already exists
                if (fs.existsSync(filePath)) {
                    console.log(`⏭️  ${filename} already exists, skipping`);
                    continue;
                }

                // Create directory if it doesn't exist
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                // Write the file
                fs.writeFileSync(filePath, content);
                console.log(`✅ Generated ${filename}`);
            } catch (error) {
                console.log(
                    `❌ Failed to generate ${filename}: ${error.message}`
                );
            }
        }
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

// Run the audit
async function runAudit() {
    const auditor = new LocalDocumentationAuditor(process.cwd());

    console.log('🔍 Analyzing repository documentation...\n');

    const results = await auditor.auditDocumentation();
    auditor.displayResults(results);

    // Ask if user wants to generate missing files
    if (process.argv.includes('--fix') || process.argv.includes('--generate')) {
        await auditor.generateMissingFiles();

        // Re-run audit to show improvement
        console.log('\n🔄 Re-running audit after generating files...');
        const newResults = await auditor.auditDocumentation();
        console.log(
            `\n📈 Score improved from ${results.score}/100 to ${newResults.score}/100`
        );
    }
}

runAudit().catch(console.error);
