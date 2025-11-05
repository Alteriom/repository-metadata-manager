#!/usr/bin/env node

/**
 * Local Branch Protection Auditor
 * Assesses branch protection policies and provides recommendations
 * without requiring GitHub API access
 */

const fs = require('fs');
const path = require('path');
const chalk = require('../lib/utils/colors');
const { execSync } = require('child_process');

class LocalBranchProtectionAuditor {
    constructor(basePath = process.cwd()) {
        this.basePath = basePath;
    }

    async auditBranchProtection(silent = false) {
        const results = {
            score: 0,
            maxScore: 100,
            checks: [],
            recommendations: [],
            gitInfo: {},
        };

        if (!silent) {
            console.log('🔍 Running local branch protection audit...\n');
        }

        // Get git repository information
        await this.getGitInfo(results);

        // Check branch protection best practices
        await this.checkGitWorkflow(results);
        await this.checkCIConfiguration(results);
        await this.checkContributionWorkflow(results);
        await this.checkSecurityPolicies(results);
        await this.checkReleaseProcess(results);

        results.score = this.calculateBranchScore(results.checks);

        if (!silent) {
            this.displayResults(results);
        }

        return results;
    }

    async getGitInfo(results) {
        try {
            // Get current branch
            const currentBranch = execSync('git branch --show-current', {
                cwd: this.basePath,
                encoding: 'utf8',
            }).trim();

            // Get default branch from git config or assume main
            let defaultBranch = 'main';
            try {
                const remoteHead = execSync(
                    'git symbolic-ref refs/remotes/origin/HEAD',
                    {
                        cwd: this.basePath,
                        encoding: 'utf8',
                    }
                ).trim();
                defaultBranch = remoteHead.replace('refs/remotes/origin/', '');
            } catch {
                // Try to detect from branches
                try {
                    const branches = execSync('git branch -r', {
                        cwd: this.basePath,
                        encoding: 'utf8',
                    }).trim();
                    if (branches.includes('origin/main'))
                        defaultBranch = 'main';
                    else if (branches.includes('origin/master'))
                        defaultBranch = 'master';
                } catch {
                    // Keep default as 'main'
                }
            }

            // Get total branches
            const branches = execSync('git branch -a', {
                cwd: this.basePath,
                encoding: 'utf8',
            })
                .split('\n')
                .filter((b) => b.trim()).length;

            results.gitInfo = {
                currentBranch,
                defaultBranch,
                totalBranches: branches,
                isGitRepo: true,
            };
        } catch (error) {
            results.gitInfo = {
                isGitRepo: false,
                error: error.message,
            };
        }
    }

    async checkGitWorkflow(results) {
        let score = 0;
        const issues = [];
        const recommendations = [];

        // Check if we're in a git repository
        if (!results.gitInfo.isGitRepo) {
            issues.push('Not a git repository');
            score = 0;
        } else {
            score += 10; // Base points for being a git repo

            // Check if default branch is main (modern practice)
            if (results.gitInfo.defaultBranch === 'main') {
                score += 5;
            } else if (results.gitInfo.defaultBranch === 'master') {
                recommendations.push(
                    'Consider renaming default branch from "master" to "main"'
                );
            }

            // Check if currently on default branch
            if (
                results.gitInfo.currentBranch === results.gitInfo.defaultBranch
            ) {
                recommendations.push(
                    'Consider working on feature branches instead of the default branch'
                );
            } else {
                score += 5; // Good practice: working on feature branch
            }
        }

        // Check for .gitignore (protects against accidental commits)
        if (fs.existsSync(path.join(this.basePath, '.gitignore'))) {
            score += 10;
        } else {
            issues.push('No .gitignore file found');
            recommendations.push(
                'Create .gitignore to prevent accidental commits of sensitive files'
            );
        }

        results.checks.push({
            name: 'Git Workflow Configuration',
            status: score >= 20,
            score: score,
            weight: 20,
            issues: issues,
            recommendations: recommendations,
        });
    }

    async checkCIConfiguration(results) {
        let score = 0;
        const issues = [];
        const recommendations = [];

        const githubWorkflowsPath = path.join(
            this.basePath,
            '.github',
            'workflows'
        );

        // Check for CI/CD workflows
        if (fs.existsSync(githubWorkflowsPath)) {
            const workflowFiles = fs
                .readdirSync(githubWorkflowsPath)
                .filter(
                    (file) => file.endsWith('.yml') || file.endsWith('.yaml')
                );

            if (workflowFiles.length > 0) {
                score += 20;

                // Check for common CI patterns
                workflowFiles.forEach((file) => {
                    const content = fs.readFileSync(
                        path.join(githubWorkflowsPath, file),
                        'utf8'
                    );

                    // Check for PR triggers
                    if (/on:\s*[\n\r]*\s*pull_request/.test(content)) {
                        score += 5;
                    }

                    // Check for test steps
                    if (/npm test|yarn test|run.*test/i.test(content)) {
                        score += 5;
                    }

                    // Check for lint steps
                    if (/lint|eslint|prettier/i.test(content)) {
                        score += 5;
                    }
                });
            } else {
                issues.push(
                    'GitHub workflows directory exists but no workflow files found'
                );
            }
        } else {
            issues.push('No GitHub workflows configured');
            recommendations.push(
                'Add GitHub Actions workflows for automated testing'
            );
        }

        // Check for package.json test scripts
        const packageJsonPath = path.join(this.basePath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(
                    fs.readFileSync(packageJsonPath, 'utf8')
                );
                if (packageJson.scripts) {
                    if (packageJson.scripts.test) score += 5;
                    if (packageJson.scripts.lint) score += 3;
                    if (packageJson.scripts['test:ci']) score += 3;
                }
            } catch (error) {
                // Ignore JSON parse errors
            }
        }

        results.checks.push({
            name: 'CI/CD Configuration',
            status: score >= 25,
            score: score,
            weight: 35,
            issues: issues,
            recommendations: recommendations,
        });
    }

    async checkContributionWorkflow(results) {
        let score = 0;
        const issues = [];
        const recommendations = [];

        // Check for CONTRIBUTING.md
        if (fs.existsSync(path.join(this.basePath, 'CONTRIBUTING.md'))) {
            score += 15;

            const content = fs.readFileSync(
                path.join(this.basePath, 'CONTRIBUTING.md'),
                'utf8'
            );

            // Check for branch protection mentions
            if (/pull request|PR|merge/i.test(content)) {
                score += 5;
            }

            // Check for review process
            if (/review|approve/i.test(content)) {
                score += 5;
            }
        } else {
            issues.push('No CONTRIBUTING.md file found');
            recommendations.push(
                'Create CONTRIBUTING.md with branch protection guidelines'
            );
        }

        // Check for PR template
        const prTemplatePaths = [
            path.join(this.basePath, '.github', 'PULL_REQUEST_TEMPLATE.md'),
            path.join(this.basePath, '.github', 'pull_request_template.md'),
            path.join(this.basePath, 'PULL_REQUEST_TEMPLATE.md'),
        ];

        const hasPRTemplate = prTemplatePaths.some((p) => fs.existsSync(p));
        if (hasPRTemplate) {
            score += 10;
        } else {
            issues.push('No pull request template found');
            recommendations.push(
                'Add pull request template to guide contributors'
            );
        }

        // Check for issue templates
        const issueTemplatesPath = path.join(
            this.basePath,
            '.github',
            'ISSUE_TEMPLATE'
        );
        if (fs.existsSync(issueTemplatesPath)) {
            score += 5;
        } else {
            recommendations.push(
                'Add issue templates to improve contribution quality'
            );
        }

        results.checks.push({
            name: 'Contribution Workflow',
            status: score >= 25,
            score: score,
            weight: 25,
            issues: issues,
            recommendations: recommendations,
        });
    }

    async checkSecurityPolicies(results) {
        let score = 0;
        const issues = [];
        const recommendations = [];

        // Check for SECURITY.md
        if (fs.existsSync(path.join(this.basePath, 'SECURITY.md'))) {
            score += 10;
        } else {
            issues.push('No SECURITY.md file found');
            recommendations.push(
                'Add SECURITY.md to establish vulnerability reporting process'
            );
        }

        // Check for CODEOWNERS
        const codeownersPath = path.join(
            this.basePath,
            '.github',
            'CODEOWNERS'
        );
        if (fs.existsSync(codeownersPath)) {
            score += 15;
        } else {
            issues.push('No CODEOWNERS file found');
            recommendations.push(
                'Add CODEOWNERS file to require specific reviewers for critical files'
            );
        }

        // Check for dependabot configuration
        const dependabotPath = path.join(
            this.basePath,
            '.github',
            'dependabot.yml'
        );
        if (fs.existsSync(dependabotPath)) {
            score += 10;
        } else {
            recommendations.push(
                'Add dependabot.yml for automated dependency updates'
            );
        }

        results.checks.push({
            name: 'Security Policies',
            status: score >= 20,
            score: score,
            weight: 15,
            issues: issues,
            recommendations: recommendations,
        });
    }

    async checkReleaseProcess(results) {
        let score = 0;
        const issues = [];
        const recommendations = [];

        // Check for release workflow
        const releaseWorkflowPath = path.join(
            this.basePath,
            '.github',
            'workflows'
        );
        if (fs.existsSync(releaseWorkflowPath)) {
            const workflows = fs.readdirSync(releaseWorkflowPath);
            const hasReleaseWorkflow = workflows.some((file) =>
                /release|deploy|publish/i.test(file)
            );

            if (hasReleaseWorkflow) {
                score += 10;
            } else {
                recommendations.push('Add automated release workflow');
            }
        }

        // Check for version management
        const packageJsonPath = path.join(this.basePath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            score += 5;

            try {
                const packageJson = JSON.parse(
                    fs.readFileSync(packageJsonPath, 'utf8')
                );
                if (packageJson.version) {
                    score += 5;
                }
            } catch (error) {
                // Ignore
            }
        }

        // Check for CHANGELOG.md
        if (fs.existsSync(path.join(this.basePath, 'CHANGELOG.md'))) {
            score += 5;
        } else {
            recommendations.push('Maintain CHANGELOG.md for release tracking');
        }

        results.checks.push({
            name: 'Release Process',
            status: score >= 10,
            score: score,
            weight: 5,
            issues: issues,
            recommendations: recommendations,
        });
    }

    calculateBranchScore(checks) {
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
        console.log(chalk.bold('🌿 LOCAL BRANCH PROTECTION AUDIT RESULTS'));
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

        // Git info
        if (results.gitInfo.isGitRepo) {
            console.log('📊 GIT REPOSITORY INFO:');
            console.log('-'.repeat(50));
            console.log(`Current Branch: ${results.gitInfo.currentBranch}`);
            console.log(`Default Branch: ${results.gitInfo.defaultBranch}`);
            console.log(`Total Branches: ${results.gitInfo.totalBranches}\n`);
        }

        console.log('📁 BRANCH PROTECTION CHECKS:');
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

            if (check.recommendations && check.recommendations.length > 0) {
                check.recommendations.slice(0, 2).forEach((rec) => {
                    console.log(chalk.blue(`   💡 ${rec}`));
                });
            }
        });

        // GitHub-specific recommendations
        console.log('\n🌐 GITHUB BRANCH PROTECTION SETTINGS:');
        console.log('-'.repeat(50));
        console.log('⚠️  Configure these in GitHub repository settings:');
        console.log('   • Require pull request reviews before merging');
        console.log('   • Require status checks to pass before merging');
        console.log('   • Require branches to be up to date before merging');
        console.log('   • Include administrators in protection rules');
        console.log('   • Restrict pushes that create files larger than 100MB');
        console.log('   • Require a pull request before merging\n');

        console.log('🔧 RECOMMENDED GITHUB BRANCH PROTECTION RULES:');
        console.log('-'.repeat(50));
        console.log('For main/master branch:');
        console.log('   ✅ Require pull request reviews (minimum 1)');
        console.log('   ✅ Dismiss stale reviews when new commits are pushed');
        console.log('   ✅ Require review from code owners');
        console.log('   ✅ Require status checks to pass before merging');
        console.log('   ✅ Require branches to be up to date before merging');
        console.log('   ✅ Include administrators');
        console.log('   ✅ Allow force pushes: Disabled');
        console.log('   ✅ Allow deletions: Disabled\n');
    }
}

// Run audit if called directly
if (require.main === module) {
    const auditor = new LocalBranchProtectionAuditor();
    auditor.auditBranchProtection().catch(console.error);
}

module.exports = LocalBranchProtectionAuditor;
