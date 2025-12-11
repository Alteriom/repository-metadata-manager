#!/usr/bin/env node

/**
 * Enable Branch Protection Rules Across Organization
 * 
 * This script configures branch protection rules for main/master branches
 * across all repositories in the organization.
 */

const { Octokit } = require('@octokit/rest');
const chalk = require('../lib/utils/colors');
require('dotenv').config();

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN || process.env.AGENT_ORG_TOKEN,
});

const BRANCH_PROTECTION_CONFIG = {
    required_status_checks: {
        strict: true,
        contexts: [], // Will be populated based on repo workflows
    },
    enforce_admins: false, // Allow admins to bypass for emergency fixes
    required_pull_request_reviews: {
        dismiss_stale_reviews: true,
        require_code_owner_reviews: false,
        required_approving_review_count: 1,
    },
    restrictions: null,
    required_linear_history: false,
    allow_force_pushes: false,
    allow_deletions: false,
    required_conversation_resolution: true,
};

async function enableBranchProtection(owner, repo, branch = 'main', dryRun = false) {
    try {
        if (dryRun) {
            console.log(chalk.gray(`  [DRY RUN] Would protect ${branch} branch`));
            return { success: true, dryRun: true };
        }

        await octokit.repos.updateBranchProtection({
            owner,
            repo,
            branch,
            ...BRANCH_PROTECTION_CONFIG,
        });

        console.log(chalk.green(`  ✓ Protected ${branch} branch`));
        return { success: true };
    } catch (error) {
        if (error.status === 404) {
            console.log(chalk.yellow(`  ⚠️  Branch ${branch} not found`));
            return { success: false, reason: 'branch_not_found' };
        }
        console.log(chalk.red(`  ✗ Failed: ${error.message}`));
        return { success: false, reason: error.message };
    }
}

async function getRepositories(owner) {
    try {
        console.log(chalk.blue('🔍 Discovering repositories...\n'));
        
        const { data } = await octokit.repos.listForOrg({
            org: owner,
            per_page: 100,
        });

        return data;
    } catch (error) {
        console.error(chalk.red(`Failed to fetch repositories: ${error.message}`));
        process.exit(1);
    }
}

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const owner = process.env.GITHUB_REPOSITORY_OWNER || 'Alteriom';

    console.log(chalk.blue('🛡️  Branch Protection Configuration\n'));
    
    if (dryRun) {
        console.log(chalk.yellow('🔍 DRY RUN MODE - No changes will be made\n'));
    }

    const repos = await getRepositories(owner);
    console.log(chalk.blue(`Found ${repos.length} repositories\n`));

    const results = {
        success: 0,
        failed: 0,
        skipped: 0,
    };

    for (const repo of repos) {
        console.log(chalk.gray(`Processing ${repo.name}...`));

        // Skip archived repos
        if (repo.archived) {
            console.log(chalk.gray(`  ⏭️  Skipped (archived)`));
            results.skipped++;
            continue;
        }

        // Try main first, then master
        let result = await enableBranchProtection(owner, repo.name, 'main', dryRun);
        
        if (!result.success && result.reason === 'branch_not_found') {
            result = await enableBranchProtection(owner, repo.name, 'master', dryRun);
        }

        if (result.success) {
            results.success++;
        } else if (result.reason === 'branch_not_found') {
            results.skipped++;
        } else {
            results.failed++;
        }
    }

    console.log(chalk.blue('\n📊 Summary:'));
    console.log(`  ✓ Success: ${results.success}`);
    console.log(`  ✗ Failed: ${results.failed}`);
    console.log(`  ⏭️  Skipped: ${results.skipped}`);

    if (dryRun) {
        console.log(chalk.yellow('\n💡 Run without --dry-run to apply changes'));
    }
}

main().catch(console.error);
