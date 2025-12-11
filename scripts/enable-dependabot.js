#!/usr/bin/env node

/**
 * Enable Dependabot Across Organization
 * 
 * This script creates dependabot.yml configuration files for repositories
 * that don't have them, enabling automated dependency updates.
 */

const { Octokit } = require('@octokit/rest');
const chalk = require('../lib/utils/colors');
require('dotenv').config();

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN || process.env.AGENT_ORG_TOKEN,
});

function generateDependabotConfig(packageManager = 'npm') {
    const configs = {
        npm: `version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "Alteriom"
    commit-message:
      prefix: "chore(deps)"
      include: "scope"
`,
        pip: `version: 2
updates:
  - package-ecosystem: "pip"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
`,
        docker: `version: 2
updates:
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
`,
        'github-actions': `version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
`,
    };

    return configs[packageManager] || configs.npm;
}

async function detectPackageManager(owner, repo) {
    const checks = [
        { file: 'package.json', ecosystem: 'npm' },
        { file: 'requirements.txt', ecosystem: 'pip' },
        { file: 'Dockerfile', ecosystem: 'docker' },
        { file: '.github/workflows', ecosystem: 'github-actions' },
    ];

    const ecosystems = [];

    for (const check of checks) {
        try {
            await octokit.repos.getContent({
                owner,
                repo,
                path: check.file,
            });
            ecosystems.push(check.ecosystem);
        } catch (error) {
            // File doesn't exist
        }
    }

    return ecosystems;
}

async function enableDependabot(owner, repo, dryRun = false) {
    try {
        // Check if dependabot.yml already exists
        try {
            await octokit.repos.getContent({
                owner,
                repo,
                path: '.github/dependabot.yml',
            });
            console.log(chalk.gray('  ⏭️  dependabot.yml already exists'));
            return { exists: true };
        } catch (error) {
            if (error.status !== 404) throw error;
        }

        // Detect package managers
        const ecosystems = await detectPackageManager(owner, repo);
        
        if (ecosystems.length === 0) {
            console.log(chalk.gray('  ⏭️  No supported package managers found'));
            return { skipped: true };
        }

        if (dryRun) {
            console.log(chalk.gray(`  [DRY RUN] Would create dependabot.yml for: ${ecosystems.join(', ')}`));
            return { success: true, dryRun: true };
        }

        // Generate config for all detected ecosystems
        let config = 'version: 2\nupdates:\n';
        
        for (const ecosystem of ecosystems) {
            const ecosystemConfig = {
                npm: {
                    directory: '/',
                    interval: 'weekly',
                    'open-pull-requests-limit': 10,
                },
                pip: {
                    directory: '/',
                    interval: 'weekly',
                    'open-pull-requests-limit': 10,
                },
                docker: {
                    directory: '/',
                    interval: 'weekly',
                    'open-pull-requests-limit': 5,
                },
                'github-actions': {
                    directory: '/',
                    interval: 'weekly',
                    'open-pull-requests-limit': 5,
                },
            };

            const settings = ecosystemConfig[ecosystem];
            config += `  - package-ecosystem: "${ecosystem}"\n`;
            config += `    directory: "${settings.directory}"\n`;
            config += `    schedule:\n`;
            config += `      interval: "${settings.interval}"\n`;
            config += `    open-pull-requests-limit: ${settings['open-pull-requests-limit']}\n`;
            
            if (ecosystem === 'npm') {
                config += `    commit-message:\n`;
                config += `      prefix: "chore(deps)"\n`;
                config += `      include: "scope"\n`;
            }
        }

        // Create the file
        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: '.github/dependabot.yml',
            message: 'chore: add Dependabot configuration',
            content: Buffer.from(config).toString('base64'),
        });

        console.log(chalk.green(`  ✓ Created dependabot.yml (${ecosystems.join(', ')})`));
        return { success: true, ecosystems };
    } catch (error) {
        console.log(chalk.red(`  ✗ Failed: ${error.message}`));
        return { success: false, error: error.message };
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

    console.log(chalk.blue('🤖 Dependabot Configuration\n'));
    
    if (dryRun) {
        console.log(chalk.yellow('🔍 DRY RUN MODE - No changes will be made\n'));
    }

    const repos = await getRepositories(owner);
    console.log(chalk.blue(`Found ${repos.length} repositories\n`));

    const results = {
        success: 0,
        failed: 0,
        skipped: 0,
        exists: 0,
    };

    for (const repo of repos) {
        console.log(chalk.gray(`Processing ${repo.name}...`));

        // Skip archived repos
        if (repo.archived) {
            console.log(chalk.gray(`  ⏭️  Skipped (archived)`));
            results.skipped++;
            continue;
        }

        const result = await enableDependabot(owner, repo.name, dryRun);
        
        if (result.success) {
            results.success++;
        } else if (result.exists) {
            results.exists++;
        } else if (result.skipped) {
            results.skipped++;
        } else {
            results.failed++;
        }
    }

    console.log(chalk.blue('\n📊 Summary:'));
    console.log(`  ✓ Created: ${results.success}`);
    console.log(`  ⏭️  Already exists: ${results.exists}`);
    console.log(`  ⏭️  Skipped: ${results.skipped}`);
    console.log(`  ✗ Failed: ${results.failed}`);

    if (dryRun) {
        console.log(chalk.yellow('\n💡 Run without --dry-run to apply changes'));
    }
}

main().catch(console.error);
