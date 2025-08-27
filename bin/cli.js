#!/usr/bin/env node

/**
 * CLI for @alteriom/repository-metadata-manager
 */

const RepositoryMetadataManager = require('../index.js');

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    // Parse command line arguments
    const options = {};
    let owner = process.env.GITHUB_REPOSITORY_OWNER;
    let repo = process.env.GITHUB_REPOSITORY_NAME;

    for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--owner' && args[i + 1]) {
            owner = args[i + 1];
            i++;
        } else if (arg === '--repo' && args[i + 1]) {
            repo = args[i + 1];
            i++;
        } else if (arg === '--token' && args[i + 1]) {
            options.token = args[i + 1];
            i++;
        } else if (arg === '--package-path' && args[i + 1]) {
            options.packagePath = args[i + 1];
            i++;
        } else if (arg === '--org-tag' && args[i + 1]) {
            options.organizationTag = args[i + 1];
            i++;
        } else if (arg === '--config' && args[i + 1]) {
            options.configFile = args[i + 1];
            i++;
        }
    }

    // Auto-detect repository from git remote if not provided
    if (!owner || !repo) {
        try {
            const { execSync } = require('child_process');
            const remoteUrl = execSync('git remote get-url origin', {
                encoding: 'utf8',
            }).trim();
            const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
            if (match) {
                owner = owner || match[1];
                repo = repo || match[2];
            }
        } catch {
            // Ignore git errors
        }
    }

    // Require explicit parameters - no hardcoded defaults
    if (!owner) {
        console.error(
            '❌ Repository owner could not be determined. Please set GITHUB_REPOSITORY_OWNER or use --owner option.'
        );
        process.exit(1);
    }
    if (!repo) {
        console.error(
            '❌ Repository name could not be determined. Please set GITHUB_REPOSITORY_NAME or use --repo option.'
        );
        process.exit(1);
    }

    // Create manager instance
    let manager;
    try {
        manager = new RepositoryMetadataManager(options);
    } catch {
        // If organization tag is missing, provide helpful error for commands that require it
        if (['report', 'apply', 'dry-run'].includes(command)) {
            console.error(
                '❌ Organization tag is required. Please provide it using:'
            );
            console.error('  • --org-tag <tag> CLI parameter');
            console.error(
                '  • organizationTag in config file (--config path/to/config.json)'
            );
            console.error('');
            console.error(
                'Example: repository-metadata report --org-tag myorg --owner myorg --repo myrepo'
            );
            process.exit(1);
        }
        // For help/usage, don't require org tag
        manager = { config: {} };
    }

    switch (command) {
        case 'report':
            await manager.generateComplianceReport(owner, repo);
            break;

        case 'apply':
            await manager.applyRecommendedUpdates(owner, repo, false);
            break;

        case 'dry-run':
            await manager.applyRecommendedUpdates(owner, repo, true);
            break;

        case 'validate':
            const packageMetadata = manager.getPackageMetadata();
            const currentMetadata = await manager.getCurrentMetadata(
                owner,
                repo
            );
            if (packageMetadata && currentMetadata) {
                const validation = manager.validateMetadata(
                    currentMetadata.description,
                    currentMetadata.topics
                );
                if (validation.issues.length === 0) {
                    console.log('✅ Repository metadata is compliant!');
                    process.exit(0);
                } else {
                    console.log(
                        '❌ Repository metadata compliance issues found:'
                    );
                    validation.issues.forEach((issue) =>
                        console.log(`  • ${issue}`)
                    );
                    process.exit(1);
                }
            }
            break;

        default:
            console.log('🏷️ Repository Metadata Manager');
            console.log('');
            console.log('Commands:');
            console.log('  report    - Generate compliance report');
            console.log('  dry-run   - Show what changes would be made');
            console.log('  apply     - Apply recommended changes');
            console.log('  validate  - Check current compliance status');
            console.log('');
            console.log('Options:');
            console.log(
                '  --owner <name>        Repository owner (auto-detected from git)'
            );
            console.log(
                '  --repo <name>         Repository name (auto-detected from git)'
            );
            console.log('  --token <token>       GitHub API token');
            console.log(
                '  --package-path <path> Path to package.json (default: ./package.json)'
            );
            console.log('  --org-tag <tag>       Organization tag (REQUIRED)');
            console.log('  --config <path>       Configuration file path');
            console.log('');
            console.log('Environment variables:');
            console.log('  GITHUB_TOKEN or AGENT_ORG_TOKEN - GitHub API token');
            console.log('  GITHUB_REPOSITORY_OWNER         - Repository owner');
            console.log('  GITHUB_REPOSITORY_NAME          - Repository name');
            console.log('');
            console.log('Examples:');
            console.log('  repository-metadata report --org-tag myorg');
            console.log(
                '  repository-metadata dry-run --owner myorg --repo myrepo --org-tag myorg'
            );
            console.log(
                '  repository-metadata apply --token ghp_... --org-tag myorg'
            );
            console.log(
                '  repository-metadata report --config ./metadata-config.json'
            );
            break;
    }
}

if (require.main === module) {
    main().catch(console.error);
}
