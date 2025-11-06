const RepositoryManager = require('../core/RepositoryManager');
const MultiRepositoryManager = require('./MultiRepositoryManager');
const chalk = require('../utils/colors');

/**
 * Organization Analytics provides insights across all repositories
 * Specialized for analyzing patterns and trends in the Alteriom organization
 */
class OrganizationAnalytics extends RepositoryManager {
    constructor(config = {}) {
        super(config);
        this.multiRepoManager = new MultiRepositoryManager(config);
        this.analytics = {
            languages: new Map(),
            topics: new Map(),
            repoTypes: new Map(),
            healthTrends: [],
            securityAlerts: [],
            recommendations: [],
        };
    }

    /**
     * Generate comprehensive organization analysis
     */
    async generateOrganizationReport() {
        console.log(
            chalk.blue('📊 Generating Organization Analytics Report...\n')
        );

        try {
            // Discover all repositories
            const repositories =
                await this.multiRepoManager.discoverRepositories();

            // Analyze each repository
            const analyses = [];
            for (const repo of repositories) {
                const analysis = await this.analyzeRepository(repo);
                analyses.push(analysis);
            }

            // Generate insights
            const insights = await this.generateInsights(analyses);

            // Display report
            this.displayOrganizationReport(insights);

            return insights;
        } catch (error) {
            console.error(
                chalk.red(
                    `❌ Error generating organization report: ${error.message}`
                )
            );
            throw error;
        }
    }

    /**
     * Analyze individual repository for organization patterns
     */
    async analyzeRepository(repo) {
        console.log(chalk.gray(`   Analyzing ${repo.name}...`));

        const analysis = {
            name: repo.name,
            language: repo.language,
            topics: repo.topics || [],
            stars: repo.stargazers_count || 0,
            forks: repo.forks_count || 0,
            openIssues: repo.open_issues_count || 0,
            lastUpdated: repo.updated_at,
            isPrivate: repo.private,
            hasWiki: repo.has_wiki,
            hasPages: repo.has_pages,
            size: repo.size,
            description: repo.description || '',
            healthScore: 0,
            repoType: this.detectRepositoryType(repo),
            iotCategory: this.detectIoTCategory(repo),
            complianceIssues: [],
            securityAlerts: [],
        };

        // Calculate health score
        try {
            const healthData = await this.calculateRepositoryHealth(repo);
            analysis.healthScore = healthData.score;
            analysis.complianceIssues = healthData.issues || [];
        } catch (error) {
            console.log(
                chalk.yellow(
                    `     ⚠️  Could not calculate health for ${repo.name}`
                )
            );
            analysis.healthScore = this.estimateHealthScore(repo);
        }

        return analysis;
    }

    /**
     * Detect repository type based on Alteriom patterns
     */
    detectRepositoryType(repo) {
        const name = repo.name.toLowerCase();
        const description = (repo.description || '').toLowerCase();
        const topics = repo.topics || [];

        // IoT Firmware projects
        if (
            name.includes('firmware') ||
            topics.includes('firmware') ||
            topics.includes('esp32') ||
            topics.includes('arduino') ||
            (repo.language === 'C++' && topics.includes('iot'))
        ) {
            return 'iot-firmware';
        }

        // AI Agent projects
        if (
            name.includes('agent') ||
            topics.includes('ai-agent') ||
            description.includes('ai') ||
            description.includes('automation')
        ) {
            return 'ai-agent';
        }

        // Web platforms
        if (
            name.includes('website') ||
            name.includes('platform') ||
            topics.includes('react') ||
            topics.includes('typescript') ||
            repo.language === 'TypeScript'
        ) {
            return 'web-platform';
        }

        // CLI tools
        if (
            topics.includes('cli') ||
            topics.includes('tool') ||
            name.includes('cli')
        ) {
            return 'cli-tool';
        }

        // Infrastructure
        if (
            name.includes('infrastructure') ||
            topics.includes('docker') ||
            topics.includes('kubernetes')
        ) {
            return 'infrastructure';
        }

        return 'general';
    }

    /**
     * Detect IoT category for specialized analysis
     */
    detectIoTCategory(repo) {
        const name = repo.name.toLowerCase();
        const topics = repo.topics || [];
        const description = (repo.description || '').toLowerCase();

        if (name.includes('firmware') || topics.includes('firmware')) {
            return 'firmware';
        }
        if (
            name.includes('server') ||
            description.includes('mqtt') ||
            description.includes('backend')
        ) {
            return 'server';
        }
        if (name.includes('dashboard') || topics.includes('dashboard')) {
            return 'dashboard';
        }
        if (name.includes('mobile') || topics.includes('mobile')) {
            return 'mobile';
        }

        return null;
    }

    /**
     * Generate insights from repository analyses
     */
    async generateInsights(analyses) {
        const insights = {
            overview: this.generateOverview(analyses),
            languages: this.analyzeLanguageDistribution(analyses),
            repoTypes: this.analyzeRepositoryTypes(analyses),
            iotAnalysis: this.analyzeIoTProjects(analyses),
            healthAnalysis: this.analyzeHealthMetrics(analyses),
            securityAnalysis: this.analyzeSecurityPosture(analyses),
            recommendations: this.generateRecommendations(analyses),
        };

        return insights;
    }

    /**
     * Generate organization overview
     */
    generateOverview(analyses) {
        const totalRepos = analyses.length;
        const privateRepos = analyses.filter((a) => a.isPrivate).length;
        const publicRepos = totalRepos - privateRepos;
        const avgHealthScore =
            analyses.reduce((sum, a) => sum + a.healthScore, 0) / totalRepos;
        const totalStars = analyses.reduce((sum, a) => sum + a.stars, 0);
        const totalForks = analyses.reduce((sum, a) => sum + a.forks, 0);
        const totalIssues = analyses.reduce((sum, a) => sum + a.openIssues, 0);

        return {
            totalRepositories: totalRepos,
            privateRepositories: privateRepos,
            publicRepositories: publicRepos,
            averageHealthScore: Math.round(avgHealthScore),
            totalStars,
            totalForks,
            totalOpenIssues: totalIssues,
            lastAnalyzed: new Date().toISOString(),
        };
    }

    /**
     * Analyze language distribution
     */
    analyzeLanguageDistribution(analyses) {
        const languages = new Map();

        analyses.forEach((analysis) => {
            if (analysis.language) {
                const count = languages.get(analysis.language) || 0;
                languages.set(analysis.language, count + 1);
            }
        });

        return Array.from(languages.entries())
            .map(([language, count]) => ({
                language,
                count,
                percentage: Math.round((count / analyses.length) * 100),
            }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Analyze repository types
     */
    analyzeRepositoryTypes(analyses) {
        const types = new Map();

        analyses.forEach((analysis) => {
            const count = types.get(analysis.repoType) || 0;
            types.set(analysis.repoType, count + 1);
        });

        return Array.from(types.entries())
            .map(([type, count]) => ({
                type,
                count,
                percentage: Math.round((count / analyses.length) * 100),
            }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Specialized IoT project analysis
     */
    analyzeIoTProjects(analyses) {
        const iotRepos = analyses.filter(
            (a) =>
                a.repoType === 'iot-firmware' ||
                a.iotCategory ||
                a.topics.some((t) =>
                    ['iot', 'firmware', 'esp32', 'mqtt', 'sensor'].includes(t)
                )
        );

        const iotCategories = new Map();
        const iotTechnologies = new Map();

        iotRepos.forEach((repo) => {
            // Count categories
            if (repo.iotCategory) {
                const count = iotCategories.get(repo.iotCategory) || 0;
                iotCategories.set(repo.iotCategory, count + 1);
            }

            // Count technologies
            repo.topics.forEach((topic) => {
                if (
                    [
                        'esp32',
                        'esp8266',
                        'arduino',
                        'platformio',
                        'mqtt',
                        'lora',
                        'wifi',
                        'sensor',
                    ].includes(topic)
                ) {
                    const count = iotTechnologies.get(topic) || 0;
                    iotTechnologies.set(topic, count + 1);
                }
            });
        });

        return {
            totalIoTRepos: iotRepos.length,
            categories: Array.from(iotCategories.entries()).map(
                ([category, count]) => ({ category, count })
            ),
            technologies: Array.from(iotTechnologies.entries())
                .map(([tech, count]) => ({ technology: tech, count }))
                .sort((a, b) => b.count - a.count),
            averageHealth:
                iotRepos.length > 0
                    ? Math.round(
                          iotRepos.reduce((sum, r) => sum + r.healthScore, 0) /
                              iotRepos.length
                      )
                    : 0,
        };
    }

    /**
     * Analyze health metrics across organization
     */
    analyzeHealthMetrics(analyses) {
        const healthRanges = {
            excellent: analyses.filter((a) => a.healthScore >= 90).length,
            good: analyses.filter(
                (a) => a.healthScore >= 80 && a.healthScore < 90
            ).length,
            fair: analyses.filter(
                (a) => a.healthScore >= 70 && a.healthScore < 80
            ).length,
            poor: analyses.filter((a) => a.healthScore < 70).length,
        };

        const avgHealth =
            analyses.reduce((sum, a) => sum + a.healthScore, 0) /
            analyses.length;

        return {
            averageScore: Math.round(avgHealth),
            distribution: healthRanges,
            needsAttention: analyses
                .filter((a) => a.healthScore < 80)
                .map((a) => ({
                    name: a.name,
                    score: a.healthScore,
                    issues: a.complianceIssues.slice(0, 3),
                })),
        };
    }

    /**
     * Analyze security posture
     */
    analyzeSecurityPosture(analyses) {
        const reposWithSecurityIssues = analyses.filter(
            (a) => a.securityAlerts.length > 0
        );
        const totalSecurityAlerts = analyses.reduce(
            (sum, a) => sum + a.securityAlerts.length,
            0
        );

        return {
            repositoriesWithAlerts: reposWithSecurityIssues.length,
            totalAlerts: totalSecurityAlerts,
            criticalAlerts: 0, // Would be populated from actual security scanning
            averageSecurityScore: 85, // Placeholder - would be calculated from actual security metrics
        };
    }

    /**
     * Generate organization-specific recommendations
     */
    generateRecommendations(analyses) {
        const recommendations = [];

        // Health-based recommendations
        const lowHealthRepos = analyses.filter((a) => a.healthScore < 80);
        if (lowHealthRepos.length > 0) {
            recommendations.push({
                category: 'Health',
                priority: 'HIGH',
                message: `${lowHealthRepos.length} repositories need health improvements`,
                action: 'Run compliance audits and apply auto-fixes',
                repositories: lowHealthRepos.map((r) => r.name),
            });
        }

        // IoT-specific recommendations
        const iotRepos = analyses.filter((a) => a.repoType === 'iot-firmware');
        if (iotRepos.length > 2) {
            recommendations.push({
                category: 'IoT',
                priority: 'MEDIUM',
                message:
                    'Consider creating shared IoT libraries for common functionality',
                action: 'Extract common sensor and connectivity code into shared libraries',
            });
        }

        // Documentation recommendations
        const reposWithoutDescription = analyses.filter((a) => !a.description);
        if (reposWithoutDescription.length > 0) {
            recommendations.push({
                category: 'Documentation',
                priority: 'MEDIUM',
                message: `${reposWithoutDescription.length} repositories missing descriptions`,
                action: 'Add repository descriptions for better discoverability',
            });
        }

        // Security recommendations
        recommendations.push({
            category: 'Security',
            priority: 'HIGH',
            message: 'Implement organization-wide security policies',
            action: 'Add security.md files and enable security alerts',
        });

        return recommendations;
    }

    /**
     * Display comprehensive organization report
     */
    displayOrganizationReport(insights) {
        console.log(chalk.cyan('\n🏢 ALTERIOM ORGANIZATION ANALYTICS REPORT'));
        console.log(chalk.cyan('='.repeat(60)));

        // Overview
        console.log(chalk.yellow('\n📊 ORGANIZATION OVERVIEW'));
        console.log(
            `Total Repositories: ${insights.overview.totalRepositories}`
        );
        console.log(
            `Private/Public: ${insights.overview.privateRepositories}/${insights.overview.publicRepositories}`
        );
        console.log(
            `Average Health Score: ${insights.overview.averageHealthScore}/100`
        );
        console.log(`Total Stars: ${insights.overview.totalStars}`);
        console.log(`Total Forks: ${insights.overview.totalForks}`);
        console.log(`Open Issues: ${insights.overview.totalOpenIssues}`);

        // Language Distribution
        console.log(chalk.yellow('\n💻 LANGUAGE DISTRIBUTION'));
        insights.languages.forEach((lang) => {
            console.log(
                `  ${lang.language}: ${lang.count} repositories (${lang.percentage}%)`
            );
        });

        // Repository Types
        console.log(chalk.yellow('\n🎯 REPOSITORY TYPES'));
        insights.repoTypes.forEach((type) => {
            console.log(
                `  ${type.type}: ${type.count} repositories (${type.percentage}%)`
            );
        });

        // IoT Analysis
        if (insights.iotAnalysis.totalIoTRepos > 0) {
            console.log(chalk.yellow('\n🔌 IOT PORTFOLIO ANALYSIS'));
            console.log(
                `Total IoT Repositories: ${insights.iotAnalysis.totalIoTRepos}`
            );
            console.log(
                `Average IoT Health: ${insights.iotAnalysis.averageHealth}/100`
            );

            if (insights.iotAnalysis.technologies.length > 0) {
                console.log('Top IoT Technologies:');
                insights.iotAnalysis.technologies
                    .slice(0, 5)
                    .forEach((tech) => {
                        console.log(
                            `  • ${tech.technology}: ${tech.count} projects`
                        );
                    });
            }
        }

        // Health Analysis
        console.log(chalk.yellow('\n💚 HEALTH ANALYSIS'));
        console.log(
            `Average Score: ${insights.healthAnalysis.averageScore}/100`
        );
        const dist = insights.healthAnalysis.distribution;
        console.log(
            `Excellent (90+): ${dist.excellent} | Good (80-89): ${dist.good} | Fair (70-79): ${dist.fair} | Poor (<70): ${dist.poor}`
        );

        if (insights.healthAnalysis.needsAttention.length > 0) {
            console.log(chalk.red('\n⚠️  REPOSITORIES NEEDING ATTENTION:'));
            insights.healthAnalysis.needsAttention.forEach((repo) => {
                console.log(`  • ${repo.name} (${repo.score}/100)`);
            });
        }

        // Recommendations
        console.log(chalk.yellow('\n🎯 KEY RECOMMENDATIONS'));
        insights.recommendations.forEach((rec, i) => {
            const priority =
                rec.priority === 'HIGH' ? chalk.red('🔴') : chalk.yellow('🟡');
            console.log(
                `  ${i + 1}. ${priority} [${rec.category}] ${rec.message}`
            );
            console.log(`     Action: ${rec.action}`);
        });

        console.log(chalk.cyan('\n' + '='.repeat(60)));
        console.log(chalk.green('✅ Organization analytics complete!'));
    }

    /**
     * Estimate health score when detailed calculation fails
     */
    estimateHealthScore(repo) {
        let score = 50; // Base score

        // Has description
        if (repo.description && repo.description.length > 10) score += 10;

        // Has topics
        if (repo.topics && repo.topics.length > 0) score += 10;

        // Recent activity
        const lastUpdate = new Date(repo.updated_at);
        const monthsAgo =
            (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsAgo < 3) score += 15;
        else if (monthsAgo < 6) score += 10;
        else if (monthsAgo < 12) score += 5;

        // Has wiki or pages
        if (repo.has_wiki) score += 5;
        if (repo.has_pages) score += 5;

        // Low issues relative to activity
        if (repo.open_issues_count === 0) score += 10;
        else if (repo.open_issues_count < 5) score += 5;

        return Math.min(score, 100);
    }

    /**
     * Calculate repository health using existing health manager
     */
    async calculateRepositoryHealth(repo) {
        try {
            // This would ideally clone or analyze the repository
            // For now, return estimated score
            return {
                score: this.estimateHealthScore(repo),
                issues: [],
            };
        } catch (error) {
            return {
                score: this.estimateHealthScore(repo),
                issues: [],
            };
        }
    }
}

module.exports = OrganizationAnalytics;
