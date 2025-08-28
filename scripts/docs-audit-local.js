#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class LocalDocumentationAuditor {
    constructor(repoPath = process.cwd()) {
        this.repoPath = repoPath;
    }

    async auditDocumentation() {
        console.log(chalk.blue('🔍 Starting local documentation audit...'));

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
        results.recommendations = this.generateRecommendations(results.files);

        this.displayResults(results);
        return results;
    }

    async analyzeDocument(docConfig) {
        const { file, weight, validator } = docConfig;
        const filePath = path.join(this.repoPath, file);

        const analysis = {
            file,
            exists: false,
            weight,
            score: 0,
            issues: [],
            recommendations: [],
            path: filePath,
        };

        try {
            const stats = fs.statSync(filePath);
            analysis.exists = true;

            if (stats.isDirectory()) {
                // Handle directories (like .github/ISSUE_TEMPLATE/)
                const files = fs.readdirSync(filePath);
                analysis.content = files;
                analysis.size = files.length;
            } else {
                // Handle files
                const content = fs.readFileSync(filePath, 'utf8');
                analysis.content = content;
                analysis.size = content.length;
            }

            if (validator) {
                const validation = await validator(analysis);
                analysis.score = validation.score;
                analysis.issues = validation.issues;
                analysis.recommendations = validation.recommendations;
            } else {
                analysis.score = weight; // Full points for existence
            }
        } catch (error) {
            // File doesn't exist
            analysis.issues.push(`${file} is missing`);
            analysis.recommendations.push(`Create ${file}`);
            analysis.score = 0;
        }

        return analysis;
    }

    async validateReadme(analysis) {
        if (!analysis.exists || !analysis.content) {
            return {
                score: 0,
                issues: ['README.md not found'],
                recommendations: ['Create README.md'],
            };
        }

        const text = analysis.content;
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

    async validateChangelog(analysis) {
        if (!analysis.exists || !analysis.content) {
            return {
                score: 0,
                issues: ['CHANGELOG.md not found'],
                recommendations: ['Create CHANGELOG.md'],
            };
        }

        const text = analysis.content;
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

    async validateContributing(analysis) {
        if (!analysis.exists || !analysis.content) {
            return {
                score: 0,
                issues: ['CONTRIBUTING.md not found'],
                recommendations: ['Create CONTRIBUTING.md'],
            };
        }

        const text = analysis.content;
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

    async validateCodeOfConduct(analysis) {
        if (!analysis.exists || !analysis.content) {
            return {
                score: 0,
                issues: ['CODE_OF_CONDUCT.md not found'],
                recommendations: ['Create CODE_OF_CONDUCT.md'],
            };
        }

        const text = analysis.content;
        const validation = { score: 10, issues: [], recommendations: [] };

        if (!/contributor covenant/i.test(text) && text.length < 500) {
            validation.score = 6;
            validation.recommendations.push(
                'Consider using Contributor Covenant template'
            );
        }

        return validation;
    }

    async validateLicense(analysis) {
        if (!analysis.exists || !analysis.content) {
            return {
                score: 0,
                issues: ['LICENSE not found'],
                recommendations: ['Add LICENSE file'],
            };
        }

        const text = analysis.content;
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

    async validateIssueTemplates(analysis) {
        const validation = { score: 0, issues: [], recommendations: [] };

        if (analysis.exists && Array.isArray(analysis.content)) {
            const templates = analysis.content.filter((file) =>
                file.endsWith('.md')
            );
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
            validation.issues.push('No issue templates directory found');
            validation.recommendations.push(
                'Create .github/ISSUE_TEMPLATE/ directory with templates'
            );
        }

        return validation;
    }

    async validatePRTemplate(analysis) {
        if (!analysis.exists || !analysis.content) {
            return {
                score: 0,
                issues: ['PR template not found'],
                recommendations: ['Create .github/PULL_REQUEST_TEMPLATE.md'],
            };
        }

        const text = analysis.content;
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

    generateRecommendations(files) {
        const allRecommendations = [];

        files.forEach((file) => {
            if (file.issues.length > 0) {
                allRecommendations.push(
                    `🔴 ${file.file}: ${file.issues.join(', ')}`
                );
            }
            file.recommendations.forEach((rec) => {
                allRecommendations.push(`💡 ${rec}`);
            });
        });

        return allRecommendations;
    }

    displayResults(results) {
        console.log('\n' + chalk.blue('📊 Documentation Audit Results'));
        console.log('='.repeat(50));

        const grade = this.getGrade(results.score);
        const gradeColor = this.getGradeColor(grade);

        console.log(
            chalk.bold(`\n📊 Documentation Score: ${results.score}/100`)
        );
        console.log(chalk.bold(`🎓 Grade: ${chalk[gradeColor](grade)}`));

        console.log('\n📋 File Analysis:');

        results.files.forEach((file) => {
            const status = file.exists ? '✅' : '❌';
            const scorePercent = Math.round((file.score / file.weight) * 100);
            console.log(
                `  ${status} ${file.file} (${file.score}/${file.weight} - ${scorePercent}%)`
            );

            if (file.issues.length > 0) {
                file.issues.forEach((issue) => {
                    console.log(`    ${chalk.red('❌')} ${issue}`);
                });
            }
        });

        if (results.recommendations.length > 0) {
            console.log('\n🎯 Recommendations:');
            results.recommendations.forEach((rec, index) => {
                console.log(`  ${index + 1}. ${rec}`);
            });
        }

        console.log(
            '\n' + chalk.green('✅ Local documentation audit completed')
        );
    }

    getGrade(score) {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    getGradeColor(grade) {
        switch (grade) {
            case 'A':
                return 'green';
            case 'B':
                return 'blue';
            case 'C':
                return 'yellow';
            case 'D':
                return 'magenta';
            case 'F':
                return 'red';
            default:
                return 'white';
        }
    }
}

// Run if called directly
if (require.main === module) {
    const auditor = new LocalDocumentationAuditor();
    auditor.auditDocumentation().catch((error) => {
        console.error(
            chalk.red('❌ Documentation audit failed:'),
            error.message
        );
        process.exit(1);
    });
}

module.exports = LocalDocumentationAuditor;
