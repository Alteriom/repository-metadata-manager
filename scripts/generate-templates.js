#!/usr/bin/env node

/**
 * Generate Issue and PR Templates Across Organization
 * 
 * This script creates issue templates and PR templates for repositories
 * that are missing them.
 */

const { Octokit } = require('@octokit/rest');
const chalk = require('../lib/utils/colors');
require('dotenv').config();

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN || process.env.AGENT_ORG_TOKEN,
});

const BUG_REPORT_TEMPLATE = `---
name: Bug Report
about: Report a bug or issue
title: '[BUG] '
labels: bug
assignees: ''
---

## Description
A clear and concise description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Screenshots
If applicable, add screenshots to help explain the problem.

## Environment
- OS: [e.g., Windows, macOS, Linux]
- Browser: [e.g., Chrome, Safari]
- Version: [e.g., 1.0.0]

## Additional Context
Any other context about the problem.
`;

const FEATURE_REQUEST_TEMPLATE = `---
name: Feature Request
about: Suggest a new feature or enhancement
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## Feature Description
A clear and concise description of the feature you'd like to see.

## Problem It Solves
Explain the problem this feature would solve.

## Proposed Solution
Describe your proposed solution.

## Alternatives Considered
Any alternative solutions or features you've considered.

## Additional Context
Any other context, mockups, or examples.
`;

const PR_TEMPLATE = `## Description
Please provide a brief description of the changes in this PR.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Code refactoring
- [ ] Performance improvement
- [ ] Test addition/update

## How Has This Been Tested?
Describe the tests you ran and how to reproduce them.

## Checklist
- [ ] My code follows the project's code style
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Related Issues
Closes #(issue number)

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Additional Notes
Any additional information that reviewers should know.
`;

async function createFile(owner, repo, path, content, message) {
    try {
        // Check if file exists
        try {
            await octokit.repos.getContent({
                owner,
                repo,
                path,
            });
            return { exists: true };
        } catch (error) {
            if (error.status !== 404) throw error;
        }

        // Create the file
        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message,
            content: Buffer.from(content).toString('base64'),
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function generateTemplates(owner, repo, dryRun = false) {
    const results = [];

    if (dryRun) {
        console.log(chalk.gray(`  [DRY RUN] Would create templates`));
        return results;
    }

    // Create bug report template
    let result = await createFile(
        owner,
        repo,
        '.github/ISSUE_TEMPLATE/bug_report.md',
        BUG_REPORT_TEMPLATE,
        'docs: add bug report template'
    );
    
    if (result.success) {
        console.log(chalk.green('  ✓ Created bug_report.md'));
        results.push('bug_report.md');
    } else if (result.exists) {
        console.log(chalk.gray('  ⏭️  bug_report.md already exists'));
    } else {
        console.log(chalk.red(`  ✗ Failed to create bug_report.md: ${result.error}`));
    }

    // Create feature request template
    result = await createFile(
        owner,
        repo,
        '.github/ISSUE_TEMPLATE/feature_request.md',
        FEATURE_REQUEST_TEMPLATE,
        'docs: add feature request template'
    );
    
    if (result.success) {
        console.log(chalk.green('  ✓ Created feature_request.md'));
        results.push('feature_request.md');
    } else if (result.exists) {
        console.log(chalk.gray('  ⏭️  feature_request.md already exists'));
    } else {
        console.log(chalk.red(`  ✗ Failed to create feature_request.md: ${result.error}`));
    }

    // Create PR template
    result = await createFile(
        owner,
        repo,
        '.github/PULL_REQUEST_TEMPLATE.md',
        PR_TEMPLATE,
        'docs: add pull request template'
    );
    
    if (result.success) {
        console.log(chalk.green('  ✓ Created PULL_REQUEST_TEMPLATE.md'));
        results.push('PULL_REQUEST_TEMPLATE.md');
    } else if (result.exists) {
        console.log(chalk.gray('  ⏭️  PULL_REQUEST_TEMPLATE.md already exists'));
    } else {
        console.log(chalk.red(`  ✗ Failed to create PULL_REQUEST_TEMPLATE.md: ${result.error}`));
    }

    return results;
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

    console.log(chalk.blue('📝 Issue & PR Template Generation\n'));
    
    if (dryRun) {
        console.log(chalk.yellow('🔍 DRY RUN MODE - No changes will be made\n'));
    }

    const repos = await getRepositories(owner);
    console.log(chalk.blue(`Found ${repos.length} repositories\n`));

    let totalCreated = 0;

    for (const repo of repos) {
        console.log(chalk.gray(`Processing ${repo.name}...`));

        // Skip archived repos
        if (repo.archived) {
            console.log(chalk.gray(`  ⏭️  Skipped (archived)`));
            continue;
        }

        const created = await generateTemplates(owner, repo.name, dryRun);
        totalCreated += created.length;
    }

    console.log(chalk.blue(`\n📊 Summary: ${totalCreated} templates created`));

    if (dryRun) {
        console.log(chalk.yellow('\n💡 Run without --dry-run to apply changes'));
    }
}

main().catch(console.error);
