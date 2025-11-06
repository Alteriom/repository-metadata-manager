const RepositoryManager = require('../core/RepositoryManager');
const HealthScoreManager = require('./HealthScoreManager');
const fs = require('fs').promises;
const path = require('path');

/**
 * Multi-Repository Manager for organization-wide repository management
 * Handles bulk operations across multiple repositories
 */
class MultiRepositoryManager extends RepositoryManager {
    constructor(config = {}) {
        super(config);
        this.repositories = [];
        this.results = new Map();
    }

    /**
     * Discover repositories in organization
     */
    async discoverRepositories() {
        console.log('🔍 Discovering repositories in organization...');

        try {
            // Try GitHub API first
            const repos = await this.getOrganizationRepositories();
            if (repos && repos.length > 0) {
                this.repositories = repos;
                console.log(
                    `✅ Found ${repos.length} repositories via GitHub API`
                );
                return repos;
            }
        } catch (error) {
            console.log(
                '⚠️  GitHub API unavailable, using local repository only'
            );
        }

        // Fallback to current repository only
        const currentRepo = await this.getCurrentRepositoryInfo();
        this.repositories = [currentRepo];
        console.log(`✅ Using current repository: ${currentRepo.name}`);

        return this.repositories;
    }

    /**
     * Get organization repositories via GitHub API
     * Uses GitHub App installation API if available, falls back to organization API
     */
    async getOrganizationRepositories() {
        if (!this.config.owner) {
            throw new Error('Organization owner not configured');
        }

        try {
            // Try GitHub App installation API first (for GitHub Apps)
            return await this.getRepositoriesViaGitHubApp();
        } catch (appError) {
            console.log(`⚠️  GitHub App API unavailable: ${appError.message}`);

            // Fallback to organization repos API
            try {
                return await this.getRepositoriesViaOrgAPI();
            } catch (orgError) {
                console.log(
                    `⚠️  Failed to fetch organization repositories: ${orgError.message}`
                );
                return null;
            }
        }
    }

    /**
     * Get repositories via GitHub App installation API
     * This method uses the GitHub App's installation API to get all accessible repositories
     */
    async getRepositoriesViaGitHubApp() {
        try {
            let allRepositories = [];
            let page = 1;
            let hasMore = true;

            // Paginate through all repositories
            while (hasMore) {
                const { data } =
                    await this.octokit.rest.apps.listReposAccessibleToInstallation(
                        {
                            per_page: 100,
                            page: page,
                        }
                    );

                if (!data.repositories || data.repositories.length === 0) {
                    hasMore = false;
                    break;
                }

                allRepositories = allRepositories.concat(data.repositories);

                // Check if there are more pages
                hasMore = data.repositories.length === 100;
                page++;
            }

            if (allRepositories.length === 0) {
                throw new Error(
                    'No repositories found via GitHub App installation'
                );
            }

            console.log(
                `✅ Found ${allRepositories.length} repositories via GitHub App`
            );

            return allRepositories.map((repo) => ({
                name: repo.name,
                full_name: repo.full_name,
                description: repo.description || '',
                topics: repo.topics || [],
                private: repo.private,
                language: repo.language,
                updated_at: repo.updated_at,
                open_issues_count: repo.open_issues_count,
                has_issues: repo.has_issues,
                has_wiki: repo.has_wiki,
                has_pages: repo.has_pages,
                archived: repo.archived,
                disabled: repo.disabled,
                owner: repo.owner,
            }));
        } catch (error) {
            throw new Error(`GitHub App API failed: ${error.message}`);
        }
    }

    /**
     * Get repositories via organization API (fallback)
     */
    async getRepositoriesViaOrgAPI() {
        let allRepositories = [];
        let page = 1;
        let hasMore = true;

        // Paginate through all repositories
        while (hasMore) {
            const { data } = await this.octokit.rest.repos.listForOrg({
                org: this.config.owner,
                type: 'all',
                sort: 'updated',
                per_page: 100,
                page: page,
            });

            if (data.length === 0) {
                hasMore = false;
                break;
            }

            allRepositories = allRepositories.concat(data);

            // Check if there are more pages
            hasMore = data.length === 100;
            page++;
        }

        console.log(
            `✅ Found ${allRepositories.length} repositories via Organization API`
        );

        return allRepositories.map((repo) => ({
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description || '',
            topics: repo.topics || [],
            private: repo.private,
            language: repo.language,
            updated_at: repo.updated_at,
            open_issues_count: repo.open_issues_count,
            has_issues: repo.has_issues,
            has_wiki: repo.has_wiki,
            has_pages: repo.has_pages,
            archived: repo.archived,
            disabled: repo.disabled,
        }));
    }

    /**
     * Get current repository information
     */
    async getCurrentRepositoryInfo() {
        const packagePath = path.join(process.cwd(), 'package.json');
        let name = 'unknown-repository';
        let description = '';

        try {
            const packageData = await fs.readFile(packagePath, 'utf8');
            const pkg = JSON.parse(packageData);
            name = pkg.name || path.basename(process.cwd());
            description = pkg.description || '';
        } catch (error) {
            name = path.basename(process.cwd());
        }

        return {
            name,
            full_name: `${this.config.owner || 'local'}/${name}`,
            description,
            topics: [],
            private: true,
            language: 'JavaScript',
            updated_at: new Date().toISOString(),
            open_issues_count: 0,
            has_issues: true,
            has_wiki: false,
            has_pages: false,
            archived: false,
            disabled: false,
            local: true,
        };
    }

    /**
     * Run health audit across all repositories
     */
    async auditAllRepositories(options = {}) {
        console.log('🏥 Running organization-wide health audit...\n');

        await this.discoverRepositories();

        const results = {
            summary: {
                total_repositories: this.repositories.length,
                healthy_repositories: 0,
                unhealthy_repositories: 0,
                average_score: 0,
                total_score: 0,
            },
            repositories: [],
            recommendations: [],
        };

        for (const repo of this.repositories) {
            console.log(`\n📊 Auditing ${repo.name}...`);

            try {
                const repoResult = await this.auditSingleRepository(
                    repo,
                    options
                );
                results.repositories.push(repoResult);
                results.summary.total_score += repoResult.health_score;

                if (repoResult.health_score >= 70) {
                    results.summary.healthy_repositories++;
                } else {
                    results.summary.unhealthy_repositories++;
                }
            } catch (error) {
                console.log(
                    `❌ Failed to audit ${repo.name}: ${error.message}`
                );
                results.repositories.push({
                    name: repo.name,
                    error: error.message,
                    health_score: 0,
                });
            }
        }

        // Calculate averages
        results.summary.average_score = Math.round(
            results.summary.total_score / this.repositories.length
        );

        // Generate organization-wide recommendations
        results.recommendations =
            this.generateOrganizationRecommendations(results);

        return results;
    }

    /**
     * Audit a single repository
     */
    async auditSingleRepository(repo, _options = {}) {
        const repoConfig = {
            ...this.config,
            owner: repo.full_name.split('/')[0],
            repo: repo.name,
        };

        const result = {
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description,
            language: repo.language,
            private: repo.private,
            health_score: 0,
            grade: 'F',
            categories: {},
            issues: [],
            recommendations: [],
        };

        try {
            // For local repository, use enhanced managers
            if (repo.local) {
                const healthManager = new HealthScoreManager(repoConfig);
                const health = await healthManager.calculateHealthScore();

                result.health_score = health.score;
                result.grade = health.grade;
                result.categories = health.categories;
                result.recommendations = health.recommendations;
            } else {
                // For remote repositories, use basic scoring
                result.health_score = this.calculateBasicHealthScore(repo);
                result.grade = this.getGradeFromScore(result.health_score);
                result.categories = this.getBasicCategories(repo);
                result.recommendations = this.getBasicRecommendations(repo);
            }
        } catch (error) {
            console.log(
                `⚠️  Error during detailed audit of ${repo.name}: ${error.message}`
            );
            result.health_score = this.calculateBasicHealthScore(repo);
            result.grade = this.getGradeFromScore(result.health_score);
        }

        return result;
    }

    /**
     * Calculate basic health score for remote repositories
     */
    calculateBasicHealthScore(repo) {
        let score = 0;

        // Basic metadata scoring
        if (repo.description && repo.description.length > 10) score += 20;
        if (repo.topics && repo.topics.length > 0) score += 15;
        if (!repo.archived && !repo.disabled) score += 20;
        if (repo.has_issues) score += 10;
        if (repo.language) score += 10;

        // Penalize for issues
        if (repo.open_issues_count > 10) score -= 10;
        if (repo.open_issues_count > 20) score -= 10;

        // Recent activity bonus
        const updatedDate = new Date(repo.updated_at);
        const daysSinceUpdate =
            (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate < 30) score += 15;
        else if (daysSinceUpdate < 90) score += 10;
        else if (daysSinceUpdate > 365) score -= 20;

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Get grade from numeric score
     */
    getGradeFromScore(score) {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    /**
     * Get basic categories for remote repositories
     */
    getBasicCategories(repo) {
        return {
            metadata: {
                score: repo.description && repo.topics?.length > 0 ? 80 : 40,
                weight: 25,
            },
            activity: {
                score: this.getActivityScore(repo),
                weight: 25,
            },
            maintenance: {
                score: repo.open_issues_count < 10 ? 80 : 40,
                weight: 25,
            },
            compliance: {
                score: !repo.archived && !repo.disabled ? 70 : 20,
                weight: 25,
            },
        };
    }

    /**
     * Get activity score based on last update
     */
    getActivityScore(repo) {
        const updatedDate = new Date(repo.updated_at);
        const daysSinceUpdate =
            (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceUpdate < 7) return 100;
        if (daysSinceUpdate < 30) return 80;
        if (daysSinceUpdate < 90) return 60;
        if (daysSinceUpdate < 180) return 40;
        if (daysSinceUpdate < 365) return 20;
        return 10;
    }

    /**
     * Get basic recommendations for remote repositories
     */
    getBasicRecommendations(repo) {
        const recommendations = [];

        if (!repo.description || repo.description.length < 10) {
            recommendations.push('Add a comprehensive repository description');
        }
        if (!repo.topics || repo.topics.length === 0) {
            recommendations.push(
                'Add relevant topics/tags for discoverability'
            );
        }
        if (repo.open_issues_count > 10) {
            recommendations.push(
                `Address ${repo.open_issues_count} open issues`
            );
        }
        if (repo.archived) {
            recommendations.push(
                'Repository is archived - consider if this is still needed'
            );
        }
        if (repo.disabled) {
            recommendations.push(
                'Repository is disabled - investigate and resolve'
            );
        }

        const daysSinceUpdate =
            (Date.now() - new Date(repo.updated_at).getTime()) /
            (1000 * 60 * 60 * 24);
        if (daysSinceUpdate > 180) {
            recommendations.push(
                'Repository appears inactive - consider maintenance or archival'
            );
        }

        return recommendations;
    }

    /**
     * Generate organization-wide recommendations
     */
    generateOrganizationRecommendations(results) {
        const recommendations = [];
        const repos = results.repositories;

        // Analyze patterns across repositories
        const lowScoreRepos = repos.filter((r) => r.health_score < 60);
        const archivedRepos = repos.filter((r) => r.archived);
        const noDescriptionRepos = repos.filter(
            (r) => !r.description || r.description.length < 10
        );
        const highIssueRepos = repos.filter((r) => r.open_issues_count > 20);

        if (lowScoreRepos.length > repos.length * 0.3) {
            recommendations.push({
                priority: 'high',
                type: 'organization',
                message: `${lowScoreRepos.length} repositories have poor health scores - implement organization-wide standards`,
            });
        }

        if (noDescriptionRepos.length > repos.length * 0.2) {
            recommendations.push({
                priority: 'medium',
                type: 'metadata',
                message: `${noDescriptionRepos.length} repositories lack proper descriptions - establish description standards`,
            });
        }

        if (archivedRepos.length > 0) {
            recommendations.push({
                priority: 'low',
                type: 'cleanup',
                message: `${archivedRepos.length} archived repositories - review for potential cleanup`,
            });
        }

        if (highIssueRepos.length > 0) {
            recommendations.push({
                priority: 'medium',
                type: 'maintenance',
                message: `${highIssueRepos.length} repositories have excessive open issues - prioritize issue triage`,
            });
        }

        // Add organization-specific recommendations based on Alteriom's focus
        const languages = [
            ...new Set(repos.map((r) => r.language).filter(Boolean)),
        ];

        // IoT-specific analysis for Alteriom organization
        const iotRepos = repos.filter(
            (r) =>
                r.name?.toLowerCase().includes('iot') ||
                r.name?.toLowerCase().includes('firmware') ||
                r.name?.toLowerCase().includes('sensor') ||
                r.description?.toLowerCase().includes('iot') ||
                r.description?.toLowerCase().includes('embedded') ||
                r.topics?.some((t) =>
                    ['iot', 'firmware', 'embedded', 'esp32', 'sensor'].includes(
                        t
                    )
                )
        );

        const firmwareRepos = repos.filter(
            (r) =>
                r.language === 'C++' ||
                r.language === 'C' ||
                r.name?.toLowerCase().includes('firmware') ||
                r.topics?.some((t) =>
                    [
                        'firmware',
                        'embedded',
                        'esp32',
                        'esp8266',
                        'arduino',
                    ].includes(t)
                )
        );

        const serverRepos = repos.filter(
            (r) =>
                (r.language === 'Python' || r.language === 'JavaScript') &&
                (r.name?.toLowerCase().includes('server') ||
                    r.description?.toLowerCase().includes('server') ||
                    r.topics?.some((t) =>
                        ['server', 'backend', 'api'].includes(t)
                    ))
        );

        // IoT ecosystem recommendations
        if (iotRepos.length > 0) {
            recommendations.push({
                priority: 'high',
                type: 'iot-ecosystem',
                message: `${iotRepos.length} IoT repositories detected - ensure consistent IoT development standards across projects`,
            });
        }

        if (firmwareRepos.length > 0) {
            recommendations.push({
                priority: 'medium',
                type: 'iot-firmware',
                message: `${firmwareRepos.length} firmware repositories - implement embedded security standards and OTA update mechanisms`,
            });
        }

        if (serverRepos.length > 0 && iotRepos.length > 0) {
            recommendations.push({
                priority: 'medium',
                type: 'iot-integration',
                message: `Cross-repository integration: Document communication protocols between ${firmwareRepos.length} firmware and ${serverRepos.length} server repositories`,
            });
        }

        // Technology-specific recommendations
        if (languages.includes('C') || languages.includes('C++')) {
            recommendations.push({
                priority: 'medium',
                type: 'iot',
                message:
                    'Consider adding IoT-specific security and testing standards for C/C++ projects',
            });
        }

        if (languages.includes('Python')) {
            recommendations.push({
                priority: 'low',
                type: 'tooling',
                message:
                    'Standardize Python project structure and dependency management across repositories',
            });
        }

        if (languages.includes('TypeScript') && iotRepos.length > 0) {
            recommendations.push({
                priority: 'low',
                type: 'iot-frontend',
                message:
                    'Implement consistent IoT dashboard and monitoring interface standards for TypeScript projects',
            });
        }

        // Security recommendations for IoT organization
        const securityRepos = repos.filter(
            (r) =>
                r.name?.toLowerCase().includes('security') ||
                r.topics?.some((t) =>
                    ['security', 'authentication', 'encryption'].includes(t)
                )
        );

        if (iotRepos.length > 0 && securityRepos.length === 0) {
            recommendations.push({
                priority: 'high',
                type: 'iot-security',
                message:
                    'No dedicated security repository found - consider creating centralized IoT security standards and tools',
            });
        }

        // Documentation consistency for IoT projects
        const docRepos = repos.filter(
            (r) =>
                r.name?.toLowerCase().includes('documentation') ||
                r.name?.toLowerCase().includes('docs')
        );

        if (iotRepos.length > 2 && docRepos.length === 0) {
            recommendations.push({
                priority: 'medium',
                type: 'iot-documentation',
                message:
                    'Multiple IoT repositories without centralized documentation - consider creating organization documentation hub',
            });
        }

        return recommendations;
    }

    /**
     * Apply organization-wide fixes
     */
    async applyOrganizationFixes(options = {}) {
        console.log('🔧 Applying organization-wide fixes...\n');

        const results = {
            applied: [],
            failed: [],
            skipped: [],
        };

        await this.discoverRepositories();

        for (const repo of this.repositories) {
            console.log(`\n🔧 Processing ${repo.name}...`);

            try {
                if (repo.local) {
                    // Apply fixes to local repository
                    const fixes = await this.applyLocalRepositoryFixes(
                        repo,
                        options
                    );
                    results.applied.push({ repo: repo.name, fixes });
                } else {
                    // Skip remote repositories for now
                    results.skipped.push({
                        repo: repo.name,
                        reason: 'Remote repository fixes not implemented yet',
                    });
                }
            } catch (error) {
                console.log(
                    `❌ Failed to apply fixes to ${repo.name}: ${error.message}`
                );
                results.failed.push({ repo: repo.name, error: error.message });
            }
        }

        return results;
    }

    /**
     * Apply fixes to local repository
     */
    async applyLocalRepositoryFixes(repo, options = {}) {
        const fixes = [];

        // Check and fix package.json metadata
        try {
            const packagePath = path.join(process.cwd(), 'package.json');
            const packageData = await fs.readFile(packagePath, 'utf8');
            const pkg = JSON.parse(packageData);

            let modified = false;

            // Add organization tag to keywords if missing
            if (!pkg.keywords) pkg.keywords = [];
            if (!pkg.keywords.includes('alteriom')) {
                pkg.keywords.unshift('alteriom');
                modified = true;
                fixes.push('Added organization keyword');
            }

            // Add repository field if missing
            if (!pkg.repository) {
                pkg.repository = {
                    type: 'git',
                    url: `https://github.com/Alteriom/${repo.name}.git`,
                };
                modified = true;
                fixes.push('Added repository field');
            }

            // Add bugs field if missing
            if (!pkg.bugs) {
                pkg.bugs = {
                    url: `https://github.com/Alteriom/${repo.name}/issues`,
                };
                modified = true;
                fixes.push('Added bugs field');
            }

            if (modified && options.apply) {
                await fs.writeFile(
                    packagePath,
                    JSON.stringify(pkg, null, 2) + '\n'
                );
                fixes.push('Updated package.json');
            }
        } catch (error) {
            // Not a Node.js project, skip package.json fixes
        }

        return fixes;
    }

    /**
     * Generate organization health report
     */
    generateHealthReport(results) {
        const report = {
            timestamp: new Date().toISOString(),
            organization: this.config.owner || 'Local',
            summary: results.summary,
            grade: this.getGradeFromScore(results.summary.average_score),
            details: {
                excellent: results.repositories.filter(
                    (r) => r.health_score >= 90
                ),
                good: results.repositories.filter(
                    (r) => r.health_score >= 70 && r.health_score < 90
                ),
                needs_improvement: results.repositories.filter(
                    (r) => r.health_score >= 50 && r.health_score < 70
                ),
                critical: results.repositories.filter(
                    (r) => r.health_score < 50
                ),
            },
            recommendations: results.recommendations,
            repositories: results.repositories,
        };

        return report;
    }
}

module.exports = MultiRepositoryManager;
