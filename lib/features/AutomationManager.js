const RepositoryManager = require('../core/RepositoryManager');
const MultiRepositoryManager = require('./MultiRepositoryManager');
const HealthScoreManager = require('./HealthScoreManager');
const CICDManager = require('./CICDManager');
const DocumentationManager = require('./DocumentationManager');
const chalk = require('../utils/colors');

/**
 * Automation Manager for enhanced automation features
 * Provides automated cross-repository operations and workflow management
 */
class AutomationManager extends RepositoryManager {
    constructor(config = {}) {
        super(config);
        this.multiRepoManager = new MultiRepositoryManager(config);
        this.healthManager = new HealthScoreManager(config);
        this.cicdManager = new CICDManager(config);
        this.docsManager = new DocumentationManager(config);
    }

    /**
     * Run comprehensive organization-wide health audit
     */
    async runOrganizationHealthAudit(options = {}) {
        console.log(chalk.blue('🔍 Running Organization-Wide Health Audit...\n'));

        const { parallel = true, concurrency = 5 } = options;

        try {
            const repositories = await this.multiRepoManager.discoverRepositories();
            const results = [];
            const unhealthyRepos = [];

            console.log(chalk.gray(`Found ${repositories.length} repositories\n`));

            // Use parallel processing for better performance
            if (parallel && repositories.length > 1) {
                console.log(chalk.gray(`Processing ${concurrency} repositories in parallel...\n`));
                results.push(...await this.auditRepositoriesParallel(repositories, concurrency));
            } else {
                // Sequential processing (fallback)
                for (const repo of repositories) {
                    const result = await this.auditSingleRepository(repo);
                    if (result) results.push(result);
                }
            }

            // Filter unhealthy repos
            unhealthyRepos.push(...results.filter(r => r.score < 70));

            // Summary Report
            console.log(chalk.blue('\n📊 Health Audit Summary:'));
            console.log(`Total Repositories: ${results.length}`);
            console.log(
                `Unhealthy (< 70): ${chalk.red(unhealthyRepos.length)}`
            );

            const avgScore = results.length > 0
                ? results.reduce((sum, r) => sum + r.score, 0) / results.length
                : 0;
            console.log(
                `Average Health Score: ${this.getGradeColor(this.scoreToGrade(avgScore))(avgScore.toFixed(1))}`
            );

            if (unhealthyRepos.length > 0 && options.report) {
                console.log(chalk.yellow('\n⚠️  Unhealthy Repositories:'));
                unhealthyRepos.forEach((repo) => {
                    console.log(
                        `  - ${repo.name} (${repo.score}/100): ${repo.issues.length} issues`
                    );
                });
            }

            const auditResult = {
                results,
                unhealthyRepos,
                avgScore,
                timestamp: new Date().toISOString(),
            };

            // Load and compare with historical data
            if (options.trending) {
                const trends = await this.calculateTrends(auditResult);
                auditResult.trends = trends;
                this.displayTrends(trends);
            }

            // Save historical data
            if (options.saveHistory !== false) {
                await this.saveHistoricalData(auditResult);
            }

            return auditResult;
        } catch (error) {
            console.error(
                chalk.red(`❌ Organization health audit failed: ${error.message}`)
            );
            throw error;
        }
    }

    /**
     * Audit a single repository
     */
    async auditSingleRepository(repo) {
        try {
            const repoConfig = {
                ...this.config,
                owner: this.config.owner || repo.full_name?.split('/')[0],
                repo: repo.name,
            };

            const healthManager = new HealthScoreManager(repoConfig);
            const healthData = await healthManager.calculateOverallHealth();

            const result = {
                name: repo.name,
                fullName: repo.full_name || `${repoConfig.owner}/${repo.name}`,
                score: healthData.overallScore,
                grade: healthData.grade,
                categories: healthData.categories,
                issues: healthData.recommendations || [],
                lastUpdated: repo.updated_at,
                isPrivate: repo.private,
            };

            const gradeColor = this.getGradeColor(healthData.grade);
            console.log(
                `${gradeColor(`[${healthData.grade}]`)} ${repo.name}: ${healthData.overallScore}/100`
            );

            return result;
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Could not audit ${repo.name}: ${error.message}`));
            return null;
        }
    }

    /**
     * Audit repositories in parallel with concurrency control
     */
    async auditRepositoriesParallel(repositories, concurrency = 5) {
        const results = [];
        const chunks = [];

        // Split into chunks for controlled concurrency
        for (let i = 0; i < repositories.length; i += concurrency) {
            chunks.push(repositories.slice(i, i + concurrency));
        }

        // Process each chunk in parallel
        for (const chunk of chunks) {
            const chunkResults = await Promise.all(
                chunk.map(repo => this.auditSingleRepository(repo))
            );
            results.push(...chunkResults.filter(r => r !== null));
        }

        return results;
    }

    /**
     * Save historical health data for trend analysis
     */
    async saveHistoricalData(auditResult) {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            
            // Create history directory if it doesn't exist
            const historyDir = path.join(process.cwd(), '.health-history');
            try {
                await fs.mkdir(historyDir, { recursive: true });
            } catch (error) {
                // Directory might already exist
            }

            // Save with timestamp filename
            const date = new Date();
            const filename = `health-${date.toISOString().split('T')[0]}.json`;
            const filepath = path.join(historyDir, filename);

            const historyData = {
                timestamp: auditResult.timestamp,
                avgScore: auditResult.avgScore,
                totalRepos: auditResult.results.length,
                unhealthyCount: auditResult.unhealthyRepos.length,
                repositories: auditResult.results.map(r => ({
                    name: r.name,
                    score: r.score,
                    grade: r.grade,
                    categories: r.categories,
                })),
            };

            await fs.writeFile(filepath, JSON.stringify(historyData, null, 2));
            console.log(chalk.gray(`\n💾 Historical data saved to ${filename}`));
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Could not save historical data: ${error.message}`));
        }
    }

    /**
     * Calculate trends by comparing with historical data
     */
    async calculateTrends(currentAudit) {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            
            const historyDir = path.join(process.cwd(), '.health-history');
            
            // Get all historical files
            let files;
            try {
                files = await fs.readdir(historyDir);
            } catch (error) {
                // No history yet
                return null;
            }

            const historyFiles = files
                .filter(f => f.startsWith('health-') && f.endsWith('.json'))
                .sort()
                .reverse();

            if (historyFiles.length === 0) {
                return null;
            }

            // Load the most recent historical data (excluding today)
            const today = new Date().toISOString().split('T')[0];
            const previousFile = historyFiles.find(f => !f.includes(today));
            
            if (!previousFile) {
                return null;
            }

            const previousPath = path.join(historyDir, previousFile);
            const previousData = JSON.parse(await fs.readFile(previousPath, 'utf8'));

            // Calculate trends
            const avgScoreDiff = currentAudit.avgScore - previousData.avgScore;
            const unhealthyDiff = currentAudit.unhealthyRepos.length - previousData.unhealthyCount;
            
            // Calculate per-repo trends
            const repoTrends = {};
            currentAudit.results.forEach(current => {
                const previous = previousData.repositories.find(r => r.name === current.name);
                if (previous) {
                    repoTrends[current.name] = {
                        scoreDiff: current.score - previous.score,
                        previousScore: previous.score,
                        previousGrade: previous.grade,
                        improved: current.score > previous.score,
                        declined: current.score < previous.score,
                    };
                }
            });

            return {
                avgScoreDiff,
                unhealthyDiff,
                repoTrends,
                previousDate: previousFile.match(/health-(\d{4}-\d{2}-\d{2})/)[1],
                daysAgo: Math.floor(
                    (new Date() - new Date(previousData.timestamp)) / (1000 * 60 * 60 * 24)
                ),
            };
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Could not calculate trends: ${error.message}`));
            return null;
        }
    }

    /**
     * Display trend information
     */
    displayTrends(trends) {
        if (!trends) {
            console.log(chalk.gray('\n📈 No historical data available for trend analysis'));
            return;
        }

        console.log(chalk.blue('\n📈 Trend Analysis:'));
        console.log(chalk.gray(`Comparing with data from ${trends.daysAgo} days ago (${trends.previousDate})\n`));

        // Overall trends
        const scoreIndicator = trends.avgScoreDiff > 0 ? '📈' : trends.avgScoreDiff < 0 ? '📉' : '➡️';
        const scoreColor = trends.avgScoreDiff > 0 ? chalk.green : trends.avgScoreDiff < 0 ? chalk.red : chalk.gray;
        console.log(`${scoreIndicator} Average Score: ${scoreColor(trends.avgScoreDiff > 0 ? '+' : '')}${scoreColor(trends.avgScoreDiff.toFixed(1))} points`);

        const unhealthyIndicator = trends.unhealthyDiff < 0 ? '✅' : trends.unhealthyDiff > 0 ? '⚠️' : '➡️';
        const unhealthyColor = trends.unhealthyDiff < 0 ? chalk.green : trends.unhealthyDiff > 0 ? chalk.red : chalk.gray;
        console.log(`${unhealthyIndicator} Unhealthy Repos: ${unhealthyColor(trends.unhealthyDiff > 0 ? '+' : '')}${unhealthyColor(trends.unhealthyDiff)}`);

        // Repository-level trends
        const improved = Object.entries(trends.repoTrends).filter(([_, t]) => t.improved);
        const declined = Object.entries(trends.repoTrends).filter(([_, t]) => t.declined);

        if (improved.length > 0) {
            console.log(chalk.green(`\n✨ Improved (${improved.length}):`));
            improved.slice(0, 5).forEach(([name, trend]) => {
                console.log(chalk.green(`  ↗ ${name}: +${trend.scoreDiff.toFixed(1)} points`));
            });
            if (improved.length > 5) {
                console.log(chalk.gray(`  ... and ${improved.length - 5} more`));
            }
        }

        if (declined.length > 0) {
            console.log(chalk.red(`\n⚠️  Declined (${declined.length}):`));
            declined.slice(0, 5).forEach(([name, trend]) => {
                console.log(chalk.red(`  ↘ ${name}: ${trend.scoreDiff.toFixed(1)} points`));
            });
            if (declined.length > 5) {
                console.log(chalk.gray(`  ... and ${declined.length - 5} more`));
            }
        }
    }

    /**
     * Detect and recommend missing workflows across repositories
     */
    async detectMissingWorkflows(options = {}) {
        console.log(chalk.blue('🔍 Detecting Missing CI/CD Workflows...\n'));

        try {
            const repositories = await this.multiRepoManager.discoverRepositories();
            const missingWorkflows = [];

            for (const repo of repositories) {
                try {
                    const repoConfig = {
                        ...this.config,
                        owner: this.config.owner || repo.full_name?.split('/')[0],
                        repo: repo.name,
                    };

                    const cicdManager = new CICDManager(repoConfig);
                    const workflows = await cicdManager.analyzeWorkflows();

                    const missing = {
                        name: repo.name,
                        fullName: repo.full_name || `${repoConfig.owner}/${repo.name}`,
                        language: repo.language,
                        workflows: workflows.workflows || [],
                        missingCI: !workflows.workflows?.some((w) => w.name?.includes('CI') || w.name?.includes('test')),
                        missingSecurity: !workflows.workflows?.some((w) => w.name?.includes('security') || w.name?.includes('Security')),
                        recommendations: [],
                    };

                    // Generate recommendations
                    if (missing.missingCI) {
                        missing.recommendations.push({
                            type: 'ci',
                            description: 'Missing CI/CD workflow',
                            template: this.suggestCITemplate(repo.language),
                        });
                    }

                    if (missing.missingSecurity) {
                        missing.recommendations.push({
                            type: 'security',
                            description: 'Missing security scanning workflow',
                            template: 'security-scan.yml',
                        });
                    }

                    if (missing.recommendations.length > 0) {
                        missingWorkflows.push(missing);
                    }

                    console.log(
                        `${missing.recommendations.length > 0 ? chalk.yellow('⚠️ ') : chalk.green('✓')} ${repo.name}: ${workflows.workflows?.length || 0} workflows`
                    );
                } catch (error) {
                    console.log(
                        chalk.gray(`   Could not analyze ${repo.name}: ${error.message}`)
                    );
                }
            }

            // Summary
            console.log(chalk.blue('\n📊 Workflow Analysis Summary:'));
            console.log(`Repositories with missing workflows: ${missingWorkflows.length}`);

            if (missingWorkflows.length > 0 && options.report) {
                console.log(chalk.yellow('\n⚠️  Repositories needing workflows:'));
                missingWorkflows.forEach((repo) => {
                    console.log(
                        `  - ${repo.name}: ${repo.recommendations.map((r) => r.type).join(', ')}`
                    );
                });
            }

            return {
                repositories: repositories.length,
                missingWorkflows,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            console.error(
                chalk.red(`❌ Workflow detection failed: ${error.message}`)
            );
            throw error;
        }
    }

    /**
     * Auto-fix common compliance issues across repositories
     */
    async autoFixComplianceIssues(options = {}) {
        console.log(chalk.blue('🔧 Auto-Fixing Compliance Issues...\n'));

        const { dryRun = false, target = 'all' } = options;

        if (dryRun) {
            console.log(chalk.yellow('🔍 DRY RUN MODE - No changes will be made\n'));
        }

        try {
            const repositories =
                target === 'current'
                    ? [await this.multiRepoManager.getCurrentRepositoryInfo()]
                    : await this.multiRepoManager.discoverRepositories();

            const results = [];

            for (const repo of repositories) {
                console.log(chalk.gray(`\nProcessing ${repo.name}...`));

                const repoConfig = {
                    ...this.config,
                    owner: this.config.owner || repo.full_name?.split('/')[0],
                    repo: repo.name,
                };

                const docsManager = new DocumentationManager(repoConfig);
                const fixes = [];

                try {
                    // Check for missing documentation
                    const missingDocs = await docsManager.checkDocumentation();

                    if (missingDocs.missing && missingDocs.missing.length > 0) {
                        console.log(
                            chalk.yellow(`  ⚠️  Missing: ${missingDocs.missing.join(', ')}`)
                        );

                        if (!dryRun) {
                            // Auto-generate missing docs
                            for (const doc of missingDocs.missing) {
                                const generated = await docsManager.generateDocumentation(
                                    doc
                                );
                                if (generated) {
                                    fixes.push({
                                        type: 'documentation',
                                        file: doc,
                                        action: 'generated',
                                    });
                                    console.log(chalk.green(`  ✓ Generated ${doc}`));
                                }
                            }
                        } else {
                            missingDocs.missing.forEach((doc) => {
                                fixes.push({
                                    type: 'documentation',
                                    file: doc,
                                    action: 'would-generate',
                                });
                            });
                        }
                    }
                } catch (error) {
                    console.log(
                        chalk.gray(`  Could not check documentation: ${error.message}`)
                    );
                }

                results.push({
                    name: repo.name,
                    fixes,
                    status: fixes.length > 0 ? 'fixed' : 'compliant',
                });
            }

            // Summary
            const fixedCount = results.filter((r) => r.fixes.length > 0).length;
            console.log(chalk.blue('\n📊 Compliance Fix Summary:'));
            console.log(`Repositories processed: ${results.length}`);
            console.log(
                `Repositories ${dryRun ? 'needing fixes' : 'fixed'}: ${fixedCount}`
            );

            return {
                results,
                fixedCount,
                dryRun,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            console.error(
                chalk.red(`❌ Compliance auto-fix failed: ${error.message}`)
            );
            throw error;
        }
    }

    /**
     * Track dependency versions across organization
     */
    async trackDependencies(options = {}) {
        console.log(chalk.blue('📦 Tracking Dependencies Across Organization...\n'));

        try {
            const repositories = await this.multiRepoManager.discoverRepositories();
            const dependencyMap = new Map();
            const results = [];

            for (const repo of repositories) {
                try {
                    // Try to get package.json for Node.js projects
                    if (repo.language === 'JavaScript' || repo.language === 'TypeScript') {
                        const repoConfig = {
                            ...this.config,
                            owner: this.config.owner || repo.full_name?.split('/')[0],
                            repo: repo.name,
                        };

                        try {
                            const { data } = await this.octokit.rest.repos.getContent({
                                owner: repoConfig.owner,
                                repo: repoConfig.repo,
                                path: 'package.json',
                            });

                            if (data && data.content) {
                                const content = Buffer.from(
                                    data.content,
                                    'base64'
                                ).toString();
                                const pkg = JSON.parse(content);

                                const deps = {
                                    ...pkg.dependencies,
                                    ...pkg.devDependencies,
                                };

                                Object.entries(deps).forEach(([name, version]) => {
                                    if (!dependencyMap.has(name)) {
                                        dependencyMap.set(name, []);
                                    }
                                    dependencyMap.get(name).push({
                                        repo: repo.name,
                                        version,
                                    });
                                });

                                results.push({
                                    name: repo.name,
                                    dependencyCount: Object.keys(deps).length,
                                    dependencies: deps,
                                });

                                console.log(
                                    `${chalk.green('✓')} ${repo.name}: ${Object.keys(deps).length} dependencies`
                                );
                            }
                        } catch (error) {
                            // File not found or other error
                            console.log(chalk.gray(`  No package.json in ${repo.name}`));
                        }
                    }
                } catch (error) {
                    console.log(
                        chalk.gray(`  Could not analyze ${repo.name}: ${error.message}`)
                    );
                }
            }

            // Find dependencies with version conflicts
            const conflicts = [];
            dependencyMap.forEach((repos, depName) => {
                const versions = new Set(repos.map((r) => r.version));
                if (versions.size > 1) {
                    conflicts.push({
                        dependency: depName,
                        versions: Array.from(versions),
                        repos: repos.map((r) => ({
                            name: r.repo,
                            version: r.version,
                        })),
                    });
                }
            });

            // Summary
            console.log(chalk.blue('\n📊 Dependency Analysis Summary:'));
            console.log(`Total dependencies tracked: ${dependencyMap.size}`);
            console.log(`Repositories analyzed: ${results.length}`);
            console.log(
                `Dependencies with version conflicts: ${chalk.yellow(conflicts.length)}`
            );

            if (conflicts.length > 0 && options.report) {
                console.log(chalk.yellow('\n⚠️  Version Conflicts:'));
                conflicts.slice(0, 10).forEach((conflict) => {
                    console.log(
                        `  - ${conflict.dependency}: ${conflict.versions.join(', ')}`
                    );
                });
                if (conflicts.length > 10) {
                    console.log(chalk.gray(`  ... and ${conflicts.length - 10} more`));
                }
            }

            return {
                results,
                dependencyMap: Object.fromEntries(dependencyMap),
                conflicts,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            console.error(
                chalk.red(`❌ Dependency tracking failed: ${error.message}`)
            );
            throw error;
        }
    }

    /**
     * Helper: Get color for health grade
     */
    getGradeColor(grade) {
        const colors = {
            A: chalk.green,
            B: chalk.blue,
            C: chalk.yellow,
            D: chalk.magenta,
            F: chalk.red,
        };
        return colors[grade] || chalk.gray;
    }

    /**
     * Helper: Convert score to grade
     */
    scoreToGrade(score) {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    /**
     * Helper: Suggest CI template based on language
     */
    suggestCITemplate(language) {
        const templates = {
            JavaScript: 'node-ci.yml',
            TypeScript: 'node-ci.yml',
            Python: 'python-ci.yml',
            'C++': 'cpp-ci.yml',
            Java: 'java-ci.yml',
            Go: 'go-ci.yml',
            Ruby: 'ruby-ci.yml',
            Rust: 'rust-ci.yml',
        };
        return templates[language] || 'generic-ci.yml';
    }
}

module.exports = AutomationManager;
