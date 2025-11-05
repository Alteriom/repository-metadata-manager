#!/usr/bin/env node

/**
 * Local Security Audit
 * Performs security checks that can be done without GitHub API access
 */

const fs = require('fs');
const path = require('path');
const chalk = require('../lib/utils/colors');

class LocalSecurityAuditor {
    constructor(basePath = process.cwd()) {
        this.basePath = basePath;
    }

    async auditSecurity(silent = false) {
        const results = {
            score: 0,
            maxScore: 100,
            checks: [],
            recommendations: [],
        };

        if (!silent) {
            console.log('🔍 Running local security audit...\n');
        }

        // Security checks that can be done locally
        await this.checkSecurityPolicy(results);
        await this.checkDependencies(results);
        await this.checkGitIgnore(results);
        await this.checkPackageScripts(results);
        await this.checkFilePermissions(results);

        results.score = this.calculateSecurityScore(results.checks);

        if (!silent) {
            this.displayResults(results);
        }

        return results;
    }

    async checkSecurityPolicy(results) {
        const securityFile = path.join(this.basePath, 'SECURITY.md');
        const exists = fs.existsSync(securityFile);

        let score = 0;
        const issues = [];

        if (exists) {
            score = 15;
            const content = fs.readFileSync(securityFile, 'utf8');

            // Check for required sections
            const requiredSections = [
                {
                    name: 'Supported Versions',
                    pattern: /supported\s+versions/i,
                },
                {
                    name: 'Reporting Instructions',
                    pattern: /reporting\s+a\s+vulnerability/i,
                },
                { name: 'Contact Information', pattern: /email|contact/i },
            ];

            let sectionScore = 0;
            requiredSections.forEach((section) => {
                if (section.pattern.test(content)) {
                    sectionScore += 5;
                } else {
                    issues.push(`Missing ${section.name} section`);
                }
            });

            score = Math.min(15, score + sectionScore);
        } else {
            issues.push('SECURITY.md file is missing');
        }

        results.checks.push({
            name: 'Security Policy (SECURITY.md)',
            status: exists && score >= 15,
            score: score,
            weight: 30,
            issues: issues,
            fix: exists
                ? null
                : 'Create SECURITY.md file with vulnerability reporting instructions',
        });
    }

    async checkDependencies(results) {
        const packageFile = path.join(this.basePath, 'package.json');
        let score = 0;
        const issues = [];

        if (fs.existsSync(packageFile)) {
            try {
                const packageJson = JSON.parse(
                    fs.readFileSync(packageFile, 'utf8')
                );
                const deps = {
                    ...packageJson.dependencies,
                    ...packageJson.devDependencies,
                };

                // Check for known security-related packages
                const securityPackages = [
                    'helmet',
                    'express-rate-limit',
                    'cors',
                    'dotenv',
                    'bcrypt',
                    'jsonwebtoken',
                    'express-validator',
                ];

                const hasSecurityDeps = securityPackages.some(
                    (pkg) => deps[pkg]
                );
                if (hasSecurityDeps) {
                    score += 10;
                }

                // Check for potentially vulnerable patterns
                // Pattern checking could be implemented here in the future

                score += 15; // Base score for having dependencies managed
            } catch (error) {
                issues.push('Error reading package.json');
            }
        } else {
            issues.push('No package.json found');
        }

        results.checks.push({
            name: 'Dependency Management',
            status: score >= 15,
            score: score,
            weight: 25,
            issues: issues,
            fix:
                issues.length > 0
                    ? 'Review and update dependency management'
                    : null,
        });
    }

    async checkGitIgnore(results) {
        const gitignoreFile = path.join(this.basePath, '.gitignore');
        let score = 0;
        const issues = [];

        if (fs.existsSync(gitignoreFile)) {
            const content = fs.readFileSync(gitignoreFile, 'utf8');

            const securityPatterns = [
                { pattern: /\.env/, name: 'Environment files' },
                { pattern: /node_modules/, name: 'Node modules' },
                { pattern: /\.log/, name: 'Log files' },
                { pattern: /config\.json/, name: 'Config files' },
            ];

            securityPatterns.forEach(({ pattern, name }) => {
                if (pattern.test(content)) {
                    score += 5;
                } else {
                    issues.push(`Missing ${name} in .gitignore`);
                }
            });
        } else {
            issues.push('.gitignore file is missing');
        }

        results.checks.push({
            name: 'Git Security (.gitignore)',
            status: score >= 15,
            score: score,
            weight: 20,
            issues: issues,
            fix: 'Ensure sensitive files are in .gitignore',
        });
    }

    async checkPackageScripts(results) {
        const packageFile = path.join(this.basePath, 'package.json');
        let score = 0;
        const issues = [];

        if (fs.existsSync(packageFile)) {
            try {
                const packageJson = JSON.parse(
                    fs.readFileSync(packageFile, 'utf8')
                );
                const scripts = packageJson.scripts || {};

                // Check for security-related scripts
                const securityScripts = ['audit', 'security', 'test'];
                securityScripts.forEach((script) => {
                    if (scripts[script]) {
                        score += 5;
                    }
                });

                // Check for audit script specifically
                if (scripts.audit || scripts['audit:check']) {
                    score += 5;
                }
            } catch (error) {
                issues.push('Error reading package.json scripts');
            }
        }

        results.checks.push({
            name: 'Security Scripts',
            status: score >= 10,
            score: score,
            weight: 15,
            issues: issues,
            fix: 'Add security-related npm scripts (audit, security check)',
        });
    }

    async checkFilePermissions(results) {
        let score = 10; // Default good score for local development
        const issues = [];

        // Check for common sensitive files
        const sensitiveFiles = ['.env', 'config.json', 'secrets.json'];

        sensitiveFiles.forEach((file) => {
            const filePath = path.join(this.basePath, file);
            if (fs.existsSync(filePath)) {
                try {
                    const stats = fs.statSync(filePath);
                    // On Unix systems, check if file is readable by others
                    if (process.platform !== 'win32' && stats.mode & 0o044) {
                        issues.push(`${file} may be readable by others`);
                        score -= 2;
                    }
                } catch (error) {
                    // Ignore permission errors
                }
            }
        });

        results.checks.push({
            name: 'File Permissions',
            status: score >= 8,
            score: score,
            weight: 10,
            issues: issues,
            fix: 'Review file permissions for sensitive files',
        });
    }

    calculateSecurityScore(checks) {
        if (checks.length === 0) return 0;
        const totalWeight = checks.reduce(
            (sum, check) => sum + check.weight,
            0
        );
        const earnedScore = checks.reduce(
            (sum, check) => sum + (check.score / check.weight) * check.weight,
            0
        );
        return Math.round((earnedScore / totalWeight) * 100);
    }

    displayResults(results) {
        console.log(chalk.bold('🔐 LOCAL SECURITY AUDIT RESULTS'));
        console.log('='.repeat(50));
        console.log(chalk.bold(`Overall Score: ${results.score}/100`));

        const status =
            results.score >= 80
                ? '🟢 Excellent'
                : results.score >= 60
                  ? '🟡 Good'
                  : results.score >= 40
                    ? '🟠 Fair'
                    : '🔴 Needs Improvement';
        console.log(`Status: ${status}\n`);

        console.log('📁 SECURITY CHECKS:');
        console.log('-'.repeat(50));

        results.checks.forEach((check) => {
            const icon = check.status ? '✅' : '❌';
            const percentage = Math.round((check.score / check.weight) * 100);
            console.log(
                `${icon} ${check.name} - ${check.score}/${check.weight} (${percentage}%)`
            );

            if (check.issues && check.issues.length > 0) {
                check.issues.forEach((issue) => {
                    console.log(chalk.yellow(`   ⚠️  ${issue}`));
                });
            }

            if (check.fix && !check.status) {
                console.log(chalk.blue(`   💡 ${check.fix}`));
            }
        });

        if (results.recommendations.length > 0) {
            console.log('\n🔧 RECOMMENDATIONS:');
            console.log('-'.repeat(50));
            results.recommendations.forEach((rec, i) => {
                console.log(`${i + 1}. ${rec}`);
            });
        }

        // GitHub-specific recommendations
        console.log('\n🌐 GITHUB SECURITY FEATURES:');
        console.log('-'.repeat(50));
        console.log('⚠️  Enable these in GitHub repository settings:');
        console.log('   • Private vulnerability reporting');
        console.log('   • Dependabot alerts');
        console.log('   • Secret scanning');
        console.log('   • Code scanning (CodeQL)');
        console.log('   • Branch protection rules\n');
    }
}

// Run audit if called directly
if (require.main === module) {
    const auditor = new LocalSecurityAuditor();
    auditor.auditSecurity().catch(console.error);
}

module.exports = LocalSecurityAuditor;
