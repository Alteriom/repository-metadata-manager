const RepositoryManager = require('../core/RepositoryManager');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

class BranchProtectionManager extends RepositoryManager {
    async auditBranchProtection() {
        const results = {
            score: 0,
            maxScore: 100,
            branches: [],
            recommendations: [],
        };

        try {
            this._ensureAPIAvailable();
            const mainBranches = await this.getMainBranches();

            for (const branch of mainBranches) {
                const protection = await this.getBranchProtection(branch.name);
                const analysis = this.analyzeBranchProtection(
                    branch.name,
                    protection
                );
                results.branches.push(analysis);
            }
        } catch {
            // Local fallback
            await this.localBranchAudit(results);
        }

        results.score = this.calculateBranchScore(results.branches);
        return results;
    }

    async localBranchAudit(results) {
        const basePath = process.cwd();
        let score = 0;
        const checks = [];
        const issues = [];

        // Check if it's a git repo
        try {
            execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
                cwd: basePath,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe'],
            });
        } catch {
            results.branches.push({
                branch: 'unknown',
                protected: false,
                score: 0,
                checks: [],
                issues: ['Not a git repository'],
            });
            return;
        }

        // Get default branch
        let defaultBranch = 'main';
        try {
            const remoteHead = execFileSync('git', ['symbolic-ref', 'refs/remotes/origin/HEAD'], {
                cwd: basePath,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe'],
            }).trim();
            defaultBranch = remoteHead.replace('refs/remotes/origin/', '');
        } catch {
            // Detect from branches
            try {
                const branches = execFileSync('git', ['branch', '-r'], {
                    cwd: basePath,
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'pipe'],
                }).trim();
                if (branches.includes('origin/main')) defaultBranch = 'main';
                else if (branches.includes('origin/master')) defaultBranch = 'master';
            } catch {
                // Keep default
            }
        }

        // Check for CODEOWNERS
        const hasCodeowners = fs.existsSync(path.join(basePath, '.github', 'CODEOWNERS'))
            || fs.existsSync(path.join(basePath, 'CODEOWNERS'));
        if (hasCodeowners) {
            score += 25;
            checks.push({ name: 'CODEOWNERS file exists', status: true });
        } else {
            issues.push('No CODEOWNERS file found');
        }

        // Check for PR template
        const hasPRTemplate = fs.existsSync(path.join(basePath, '.github', 'PULL_REQUEST_TEMPLATE.md'));
        if (hasPRTemplate) {
            score += 20;
            checks.push({ name: 'PR template exists', status: true });
        } else {
            issues.push('No PR template found');
        }

        // Check for branch naming conventions (feature branches)
        try {
            const currentBranch = execFileSync('git', ['branch', '--show-current'], {
                cwd: basePath,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe'],
            }).trim();
            if (currentBranch !== defaultBranch) {
                score += 15;
                checks.push({ name: 'Working on feature branch', status: true });
            } else {
                issues.push('Working directly on default branch');
            }
        } catch {
            // Ignore
        }

        // Check for CI workflows that enforce checks
        const workflowsDir = path.join(basePath, '.github', 'workflows');
        if (fs.existsSync(workflowsDir)) {
            const workflows = fs.readdirSync(workflowsDir);
            const hasCIWorkflow = workflows.some(f => f.endsWith('.yml') || f.endsWith('.yaml'));
            if (hasCIWorkflow) {
                score += 20;
                checks.push({ name: 'CI workflows configured', status: true });
            }
        }

        // Check for contributing guidelines mentioning branch/PR process
        const hasContributing = fs.existsSync(path.join(basePath, 'CONTRIBUTING.md'));
        if (hasContributing) {
            score += 10;
            checks.push({ name: 'CONTRIBUTING.md exists', status: true });
        }

        results.branches.push({
            branch: defaultBranch,
            protected: false,
            score: Math.min(score, 100),
            checks,
            issues,
            local: true,
        });

        if (issues.length > 0) {
            results.recommendations.push(
                'Configure branch protection rules in GitHub repository settings'
            );
        }
    }

    async getMainBranches() {
        const branches = await this.listBranches();

        // Focus on main/master and default branch
        const repo = await this.getRepository();

        const mainBranchNames = ['main', 'master', repo.default_branch];
        return branches.filter(
            (branch) =>
                mainBranchNames.includes(branch.name) ||
                branch.name === repo.default_branch
        );
    }

    analyzeBranchProtection(branchName, protection) {
        const analysis = {
            branch: branchName,
            protected: protection !== null,
            score: 0,
            checks: [],
            issues: [],
        };

        if (!protection) {
            analysis.issues.push('Branch has no protection rules');
            return analysis;
        }

        // Check required status checks
        if (protection.required_status_checks) {
            analysis.checks.push({
                name: 'Required status checks',
                status: true,
                strict: protection.required_status_checks.strict,
                contexts: protection.required_status_checks.contexts,
            });
            analysis.score += 25;
        } else {
            analysis.issues.push('No required status checks configured');
        }

        // Check PR reviews
        if (protection.required_pull_request_reviews) {
            const reviews = protection.required_pull_request_reviews;
            analysis.checks.push({
                name: 'Required PR reviews',
                status: true,
                required_reviewers: reviews.required_approving_review_count,
                dismiss_stale: reviews.dismiss_stale_reviews,
                require_code_owner_reviews: reviews.require_code_owner_reviews,
            });
            analysis.score += 30;
        } else {
            analysis.issues.push('No required pull request reviews');
        }

        // Check admin enforcement
        if (protection.enforce_admins?.enabled) {
            analysis.checks.push({ name: 'Admin enforcement', status: true });
            analysis.score += 20;
        } else {
            analysis.issues.push('Admins can bypass protection rules');
        }

        // Check restrictions
        if (protection.restrictions) {
            analysis.checks.push({
                name: 'Push restrictions',
                status: true,
                users: protection.restrictions.users?.length || 0,
                teams: protection.restrictions.teams?.length || 0,
            });
            analysis.score += 15;
        }

        // Check linear history
        if (protection.required_linear_history?.enabled) {
            analysis.checks.push({
                name: 'Linear history required',
                status: true,
            });
            analysis.score += 10;
        }

        return analysis;
    }

    calculateBranchScore(branches) {
        if (branches.length === 0) return 0;
        const totalScore = branches.reduce(
            (sum, branch) => sum + branch.score,
            0
        );
        return Math.round(totalScore / branches.length);
    }

    async enforceBranchProtection(options = {}) {
        const defaultProtection = {
            required_status_checks: {
                strict: true,
                contexts: options.statusChecks || ['ci/tests'],
            },
            enforce_admins: true,
            required_pull_request_reviews: {
                required_approving_review_count: options.requiredReviewers || 1,
                dismiss_stale_reviews: true,
                require_code_owner_reviews: options.requireCodeOwners || false,
            },
            restrictions: null,
            required_linear_history: options.requireLinearHistory || false,
            allow_force_pushes: false,
            allow_deletions: false,
        };

        const mainBranches = await this.getMainBranches();
        const results = [];

        for (const branch of mainBranches) {
            try {
                await this.updateBranchProtection(
                    branch.name,
                    defaultProtection
                );

                results.push({
                    branch: branch.name,
                    status: 'success',
                    message: 'Branch protection rules applied',
                });
            } catch (error) {
                results.push({
                    branch: branch.name,
                    status: 'error',
                    message: error.message,
                });
            }
        }

        return results;
    }
}

module.exports = BranchProtectionManager;
