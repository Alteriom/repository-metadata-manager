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

        try {
            const repositories = await this.multiRepoManager.discoverRepositories();
            const results = [];
            const unhealthyRepos = [];

            console.log(chalk.gray(`Found ${repositories.length} repositories\n`));

            for (const repo of repositories) {
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

                    results.push(result);

                    if (healthData.overallScore < 70) {
                        unhealthyRepos.push(result);
                    }

                    const gradeColor = this.getGradeColor(healthData.grade);
                    console.log(
                        `${gradeColor(`[${healthData.grade}]`)} ${repo.name}: ${healthData.overallScore}/100`
                    );
                } catch (error) {
                    console.log(chalk.yellow(`⚠️  Could not audit ${repo.name}: ${error.message}`));
                }
            }

            // Summary Report
            console.log(chalk.blue('\n📊 Health Audit Summary:'));
            console.log(`Total Repositories: ${results.length}`);
            console.log(
                `Unhealthy (< 70): ${chalk.red(unhealthyRepos.length)}`
            );

            const avgScore =
                results.reduce((sum, r) => sum + r.score, 0) / results.length;
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

            return {
                results,
                unhealthyRepos,
                avgScore,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            console.error(
                chalk.red(`❌ Organization health audit failed: ${error.message}`)
            );
            throw error;
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

        const { dryRun = true, target = 'all' } = options;

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
