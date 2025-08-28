#!/usr/bin/env node

const { Octokit } = require('@octokit/rest');
const chalk = require('chalk');
require('dotenv').config();

class DocumentationTokenTester {
    constructor() {
        this.tokens = {
            GITHUB_TOKEN: process.env.GITHUB_TOKEN,
            AGENT_ORG_TOKEN: process.env.AGENT_ORG_TOKEN,
            ORG_ACCESS_TOKEN: process.env.ORG_ACCESS_TOKEN,
        };

        this.owner = process.env.GITHUB_REPOSITORY_OWNER || 'Alteriom';
        this.repo =
            process.env.GITHUB_REPOSITORY_NAME || 'repository-metadata-manager';

        this.docEndpoints = [
            'README.md',
            'CHANGELOG.md',
            'CONTRIBUTING.md',
            'CODE_OF_CONDUCT.md',
            'LICENSE',
            '.github/ISSUE_TEMPLATE/',
            '.github/PULL_REQUEST_TEMPLATE.md',
            '.github/workflows/',
            'package.json',
            '.gitignore',
        ];
    }

    async testAllTokens() {
        console.log(
            chalk.blue('🔍 Testing all tokens for documentation access...')
        );
        console.log(chalk.gray(`Repository: ${this.owner}/${this.repo}\n`));

        const results = {};

        for (const [tokenName, tokenValue] of Object.entries(this.tokens)) {
            if (!tokenValue) {
                console.log(chalk.yellow(`⚠️  ${tokenName}: Not configured`));
                continue;
            }

            console.log(chalk.bold(`\n📋 Testing ${tokenName}:`));
            console.log('='.repeat(50));

            results[tokenName] = await this.testToken(tokenName, tokenValue);
        }

        this.summarizeResults(results);
        return results;
    }

    async testToken(tokenName, tokenValue) {
        const octokit = new Octokit({
            auth: tokenValue,
            request: {
                timeout: 10000,
            },
        });

        const results = {
            tokenName,
            successful: [],
            failed: [],
            totalAttempts: 0,
            successRate: 0,
        };

        for (const endpoint of this.docEndpoints) {
            results.totalAttempts++;

            try {
                console.log(chalk.gray(`  Testing: ${endpoint}`));

                const response = await octokit.rest.repos.getContent({
                    owner: this.owner,
                    repo: this.repo,
                    path: endpoint,
                });

                const status =
                    response.status === 200 ? '✅' : `⚠️ ${response.status}`;
                const size = Array.isArray(response.data)
                    ? `${response.data.length} items`
                    : `${Math.round((response.data.size || 0) / 1024)}KB`;

                console.log(`    ${status} ${endpoint} (${size})`);
                results.successful.push({
                    endpoint,
                    status: response.status,
                    size: response.data.size || response.data.length,
                    type: Array.isArray(response.data) ? 'directory' : 'file',
                });
            } catch (error) {
                const errorType = this.getErrorType(error);
                console.log(`    ❌ ${endpoint} - ${errorType}`);

                results.failed.push({
                    endpoint,
                    error: errorType,
                    status: error.status || 'unknown',
                    message: error.message,
                });
            }

            // Small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        results.successRate = Math.round(
            (results.successful.length / results.totalAttempts) * 100
        );

        console.log(chalk.bold(`\n📊 ${tokenName} Results:`));
        console.log(
            `  Success Rate: ${results.successRate}% (${results.successful.length}/${results.totalAttempts})`
        );

        return results;
    }

    getErrorType(error) {
        if (error.status === 403) {
            if (error.message.includes('rate limit')) {
                return 'Rate Limited';
            } else if (error.message.includes('Resource not accessible')) {
                return 'Permission Denied';
            } else {
                return 'Forbidden (403)';
            }
        } else if (error.status === 404) {
            return 'Not Found (404)';
        } else if (error.status === 500) {
            return 'Server Error (500)';
        } else if (
            error.message.includes('ENOTFOUND') ||
            error.message.includes('ECONNREFUSED')
        ) {
            return 'Network Error';
        } else {
            return `Error ${error.status || 'Unknown'}: ${error.message}`;
        }
    }

    summarizeResults(results) {
        console.log(chalk.blue('\n🎯 TOKEN COMPARISON SUMMARY'));
        console.log('='.repeat(60));

        // Find best token
        let bestToken = null;
        let bestScore = -1;

        Object.values(results).forEach((result) => {
            if (result.successRate > bestScore) {
                bestScore = result.successRate;
                bestToken = result.tokenName;
            }
        });

        console.log(chalk.bold('\n📊 Success Rates:'));
        Object.values(results).forEach((result) => {
            const color =
                result.successRate >= 80
                    ? 'green'
                    : result.successRate >= 60
                      ? 'yellow'
                      : 'red';
            const badge = result.tokenName === bestToken ? ' 🏆' : '';
            console.log(
                `  ${chalk[color](result.tokenName)}: ${result.successRate}%${badge}`
            );
        });

        if (bestToken) {
            console.log(
                chalk.green(
                    `\n✅ Best token for documentation: ${bestToken} (${bestScore}% success)`
                )
            );

            // Show what works with best token
            const bestResult = results[bestToken];
            if (bestResult.successful.length > 0) {
                console.log(chalk.green('\n📁 Accessible endpoints:'));
                bestResult.successful.forEach((item) => {
                    console.log(`  ✅ ${item.endpoint} (${item.type})`);
                });
            }

            if (bestResult.failed.length > 0) {
                console.log(chalk.red('\n❌ Failed endpoints:'));
                bestResult.failed.forEach((item) => {
                    console.log(`  ❌ ${item.endpoint} - ${item.error}`);
                });
            }
        }

        // Recommendations
        console.log(chalk.blue('\n💡 RECOMMENDATIONS:'));

        if (bestScore === 100) {
            console.log(
                '  🎉 Perfect! Use ' +
                    bestToken +
                    ' for all documentation operations'
            );
        } else if (bestScore >= 80) {
            console.log(
                '  ✅ Use ' +
                    bestToken +
                    ' as primary, with local fallback for failed endpoints'
            );
        } else if (bestScore >= 50) {
            console.log(
                '  ⚠️  Use ' + bestToken + ' with extensive local fallback'
            );
        } else {
            console.log(
                '  🚨 Use local file system only - all tokens have issues'
            );
        }

        // Check for common error patterns
        const allFailures = Object.values(results).flatMap((r) => r.failed);
        const serverErrors = allFailures.filter((f) => f.error.includes('500'));
        const permissionErrors = allFailures.filter(
            (f) => f.error.includes('Permission') || f.error.includes('403')
        );

        if (serverErrors.length > 0) {
            console.log(
                '  🔧 GitHub API has server issues - local fallback recommended'
            );
        }
        if (permissionErrors.length > 0) {
            console.log(
                '  🔑 Some tokens lack required permissions - check token scopes'
            );
        }
    }

    async testSpecificEndpoint(endpoint, tokenName) {
        const tokenValue = this.tokens[tokenName];
        if (!tokenValue) {
            console.log(chalk.red(`❌ Token ${tokenName} not configured`));
            return;
        }

        console.log(chalk.blue(`🔍 Testing ${tokenName} for ${endpoint}...`));

        const octokit = new Octokit({ auth: tokenValue });

        try {
            const response = await octokit.rest.repos.getContent({
                owner: this.owner,
                repo: this.repo,
                path: endpoint,
            });

            console.log(chalk.green(`✅ Success! Status: ${response.status}`));
            console.log(
                `📄 Type: ${Array.isArray(response.data) ? 'Directory' : 'File'}`
            );
            if (response.data.size) {
                console.log(`📊 Size: ${response.data.size} bytes`);
            }

            return response;
        } catch (error) {
            console.log(chalk.red(`❌ Failed: ${this.getErrorType(error)}`));
            if (error.response) {
                console.log(chalk.gray(`   Status: ${error.status}`));
                console.log(chalk.gray(`   Message: ${error.message}`));
            }
            throw error;
        }
    }
}

// Run if called directly
if (require.main === module) {
    const tester = new DocumentationTokenTester();

    // Check command line arguments
    const args = process.argv.slice(2);
    if (args.length === 2) {
        // Test specific endpoint with specific token
        const [endpoint, tokenName] = args;
        tester
            .testSpecificEndpoint(endpoint, tokenName)
            .catch((error) => process.exit(1));
    } else {
        // Test all tokens
        tester.testAllTokens().catch((error) => {
            console.error(chalk.red('❌ Token testing failed:'), error.message);
            process.exit(1);
        });
    }
}

module.exports = DocumentationTokenTester;
