const RepositoryManager = require('../core/RepositoryManager');

class BranchProtectionManager extends RepositoryManager {
    async auditBranchProtection() {
        const results = {
            score: 0,
            maxScore: 100,
            branches: [],
            recommendations: [],
        };

        const mainBranches = await this.getMainBranches();

        for (const branch of mainBranches) {
            const protection = await this.getBranchProtection(branch.name);
            const analysis = this.analyzeBranchProtection(
                branch.name,
                protection
            );
            results.branches.push(analysis);
        }

        results.score = this.calculateBranchScore(results.branches);
        return results;
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
