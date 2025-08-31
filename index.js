/**
 * Repository Metadata Manager
 *
 * Generic repository metadata management utility for GitHub organization compliance.
 * This package provides tools to manage GitHub repository descriptions and topics
 * to ensure compliance with organization standards.
 */

// Import Octokit for GitHub API access
let Octokit;
let octokitAvailable = false;

try {
    const octokitModule = require('@octokit/rest');
    Octokit = octokitModule.Octokit || octokitModule;
    octokitAvailable = true;
} catch {
    // Create a mock Octokit for offline mode
    Octokit = class {
        constructor() {}
        rest = {
            repos: {
                get: () =>
                    Promise.reject(
                        new Error(
                            'GitHub API not available - @octokit/rest not installed'
                        )
                    ),
                update: () =>
                    Promise.reject(
                        new Error(
                            'GitHub API not available - @octokit/rest not installed'
                        )
                    ),
                replaceAllTopics: () =>
                    Promise.reject(
                        new Error(
                            'GitHub API not available - @octokit/rest not installed'
                        )
                    ),
            },
        };
    };
    octokitAvailable = false;
}

const fs = require('fs');
const path = require('path');

class RepositoryMetadataManager {
    constructor(options = {}) {
        this.octokitAvailable = octokitAvailable;

        if (octokitAvailable) {
            this.octokit = new Octokit({
                auth:
                    options.token ||
                    process.env.GITHUB_TOKEN ||
                    process.env.AGENT_ORG_TOKEN,
            });
        } else {
            this.octokit = new Octokit();
        }

        // Load configuration from file if provided
        let configFromFile = {};
        if (options.configFile) {
            try {
                const configPath = path.resolve(options.configFile);
                configFromFile = JSON.parse(
                    fs.readFileSync(configPath, 'utf8')
                );
            } catch (error) {
                console.warn(
                    `⚠️ Warning: Could not load config file ${options.configFile}:`,
                    error.message
                );
            }
        }

        this.config = {
            organizationTag:
                options.organizationTag ||
                configFromFile.organizationTag ||
                null,
            packagePath:
                options.packagePath ||
                configFromFile.packagePath ||
                './package.json',
            repositoryType:
                options.repositoryType ||
                configFromFile.repositoryType ||
                'auto-detect',
            ...configFromFile,
            ...options,
        };

        // Validate required configuration
        if (!this.config.organizationTag) {
            console.warn(
                '⚠️ Warning: Organization tag is not configured. This is required for proper operation.'
            );
            console.warn('Please provide it via:');
            console.warn('  • options.organizationTag in code');
            console.warn('  • organizationTag in config file');
            console.warn('  • --org-tag CLI parameter');
        }
    }

    /**
     * Get repository metadata from package.json
     */
    getPackageMetadata(packagePath = this.config.packagePath) {
        try {
            const fullPath = path.resolve(packagePath);
            const packageJson = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

            return {
                description: packageJson.description || '',
                keywords: packageJson.keywords || [],
                repository: packageJson.repository?.url || '',
                name: packageJson.name || '',
            };
        } catch (error) {
            console.error('❌ Error reading package.json:', error.message);
            return null;
        }
    }

    /**
     * Auto-detect repository type based on package.json and dependencies
     */
    detectRepositoryType(packageMetadata) {
        if (!packageMetadata) return 'general';

        const { keywords = [], name = '', description = '' } = packageMetadata;
        const content = [...keywords, name, description]
            .join(' ')
            .toLowerCase();

        // IoT Server/Backend Detection (more specific, check first)
        if (
            (content.includes('iot') || content.includes('sensor')) &&
            (content.includes('server') || content.includes('backend') || 
             content.includes('mqtt') || content.includes('telemetry') ||
             content.includes('influxdb') || content.includes('grafana'))
        ) {
            return 'iot-server';
        }

        // Documentation specific to IoT (check before general firmware)
        if (
            content.includes('documentation') &&
            (content.includes('iot') || content.includes('alteriom'))
        ) {
            return 'iot-documentation';
        }

        // Docker/Infrastructure for IoT (check before general firmware) 
        if (
            content.includes('docker') &&
            (content.includes('iot') || content.includes('alteriom'))
        ) {
            return 'iot-infrastructure';
        }

        // IoT Firmware Detection (broader, check last among IoT types)
        if (
            content.includes('iot') ||
            content.includes('firmware') ||
            content.includes('embedded') ||
            content.includes('esp32') ||
            content.includes('esp8266') ||
            content.includes('arduino') ||
            content.includes('platformio') ||
            content.includes('sensor') ||
            content.includes('lora') ||
            content.includes('mesh') ||
            content.includes('microcontroller')
        ) {
            return 'iot-firmware';
        }

        if (
            content.includes('ai') ||
            content.includes('agent') ||
            content.includes('automation')
        ) {
            return 'ai-agent';
        }
        if (
            content.includes('api') ||
            content.includes('server') ||
            content.includes('backend')
        ) {
            return 'api';
        }
        if (
            content.includes('react') ||
            content.includes('frontend') ||
            content.includes('ui')
        ) {
            return 'frontend';
        }
        if (
            content.includes('cli') ||
            content.includes('tool') ||
            content.includes('utility')
        ) {
            return 'cli-tool';
        }
        if (
            content.includes('library') ||
            content.includes('package') ||
            content.includes('sdk')
        ) {
            return 'library';
        }

        return 'general';
    }

    /**
     * Get current GitHub repository metadata
     */
    async getCurrentMetadata(owner, repo) {
        if (!this.octokitAvailable) {
            console.log(
                '⚠️ GitHub API not available (@octokit/rest not installed). Running in offline mode...'
            );
            return null;
        }

        try {
            const { data } = await this.octokit.rest.repos.get({
                owner,
                repo,
            });

            return {
                description: data.description || '',
                topics: data.topics || [],
                homepage: data.homepage || '',
            };
        } catch (error) {
            console.error(
                '❌ Error fetching repository metadata:',
                error.message
            );
            return null;
        }
    }

    /**
     * Update repository description
     */
    async updateDescription(owner, repo, description) {
        try {
            await this.octokit.rest.repos.update({
                owner,
                repo,
                description,
            });
            console.log('✅ Repository description updated successfully');
            return true;
        } catch (error) {
            console.error('❌ Error updating description:', error.message);
            return false;
        }
    }

    /**
     * Update repository topics
     */
    async updateTopics(owner, repo, topics) {
        try {
            await this.octokit.rest.repos.replaceAllTopics({
                owner,
                repo,
                names: topics,
            });
            console.log('✅ Repository topics updated successfully');
            return true;
        } catch (error) {
            console.error('❌ Error updating topics:', error.message);
            return false;
        }
    }

    /**
     * Generate recommended topics based on package.json and repository type
     */
    generateRecommendedTopics(packageMetadata, repositoryType = null) {
        const baseTopics = [];

        // Add organization tag if configured
        if (this.config.organizationTag) {
            baseTopics.push(this.config.organizationTag);
        }

        const keywords = packageMetadata.keywords || [];

        // Add package.json keywords
        baseTopics.push(...keywords);

        // Auto-detect repository type if not provided
        const detectedType =
            repositoryType || this.detectRepositoryType(packageMetadata);

        // Add type-specific topics
        const typeTopics = this.config.customTopics || {
            'iot-firmware': ['iot', 'firmware', 'embedded', 'esp32', 'esp8266', 'arduino', 'platformio', 'sensors', 'lora', 'wireless', 'microcontroller'],
            'iot-server': ['iot', 'server', 'backend', 'mqtt', 'telemetry', 'influxdb', 'grafana', 'sensor-network', 'monitoring'],
            'iot-documentation': ['iot', 'documentation', 'alteriom', 'sensor-network', 'embedded-docs'],
            'iot-infrastructure': ['iot', 'docker', 'infrastructure', 'deployment', 'containers', 'alteriom'],
            'ai-agent': ['automation', 'github-integration', 'compliance'],
            api: ['api', 'backend', 'server'],
            frontend: ['frontend', 'ui', 'web'],
            'cli-tool': ['cli', 'tool', 'command-line'],
            library: ['library', 'package', 'sdk'],
            general: ['utility'],
        };

        baseTopics.push(...(typeTopics[detectedType] || typeTopics.general));

        // Remove duplicates and ensure lowercase
        return [...new Set(baseTopics.map((topic) => topic.toLowerCase()))];
    }

    /**
     * Validate metadata for compliance
     */
    validateMetadata(description, topics) {
        const issues = [];
        const recommendations = [];

        // Check description
        if (!description || description.trim().length === 0) {
            issues.push('Missing repository description');
        } else if (description.length > 160) {
            recommendations.push(
                'Description should be under 160 characters for optimal display'
            );
        }

        // Check topics
        if (!topics || topics.length === 0) {
            issues.push('Missing repository topics/tags for discoverability');
        } else if (topics.length > 20) {
            recommendations.push(
                'Consider reducing topics to 20 or fewer for better focus'
            );
        }

        // Check for organization tag
        if (
            this.config.organizationTag &&
            !topics.includes(this.config.organizationTag)
        ) {
            recommendations.push(
                `Consider adding "${this.config.organizationTag}" topic for organization discoverability`
            );
        }

        return { issues, recommendations };
    }

    /**
     * Generate compliance report
     */
    async generateComplianceReport(owner, repo) {
        console.log('🔍 Generating repository metadata compliance report...\n');

        const packageMetadata = this.getPackageMetadata();
        if (!packageMetadata) {
            return false;
        }

        const currentMetadata = await this.getCurrentMetadata(owner, repo);

        if (!currentMetadata) {
            console.log(
                '⚠️ Unable to access GitHub repository metadata. Providing recommendations based on package.json...\n'
            );
            return this.generateOfflineReport(packageMetadata, owner, repo);
        }

        console.log('📋 Current Repository Metadata:');
        console.log(`  Description: "${currentMetadata.description}"`);
        console.log(`  Topics: [${currentMetadata.topics.join(', ')}]`);
        console.log();

        console.log('📦 Package.json Metadata:');
        console.log(`  Description: "${packageMetadata.description}"`);
        console.log(`  Keywords: [${packageMetadata.keywords.join(', ')}]`);
        console.log();

        const validation = this.validateMetadata(
            currentMetadata.description,
            currentMetadata.topics
        );

        if (validation.issues.length > 0) {
            console.log('❌ Compliance Issues Found:');
            validation.issues.forEach((issue) => console.log(`  • ${issue}`));
            console.log();
        }

        if (validation.recommendations.length > 0) {
            console.log('💡 Recommendations:');
            validation.recommendations.forEach((rec) =>
                console.log(`  • ${rec}`)
            );
            console.log();
        }

        const recommendedTopics =
            this.generateRecommendedTopics(packageMetadata);

        console.log('🎯 Recommended Changes:');
        if (
            !currentMetadata.description ||
            currentMetadata.description !== packageMetadata.description
        ) {
            console.log(`  Description: "${packageMetadata.description}"`);
        }

        if (
            currentMetadata.topics.length === 0 ||
            JSON.stringify(currentMetadata.topics.sort()) !==
                JSON.stringify(recommendedTopics.sort())
        ) {
            console.log(`  Topics: [${recommendedTopics.join(', ')}]`);
        }

        return true;
    }

    /**
     * Generate offline compliance report based on package.json only
     */
    generateOfflineReport(packageMetadata, owner, repo) {
        console.log('📦 Package.json Metadata:');
        console.log(`  Description: "${packageMetadata.description}"`);
        console.log(`  Keywords: [${packageMetadata.keywords.join(', ')}]`);
        console.log();

        const recommendedTopics =
            this.generateRecommendedTopics(packageMetadata);

        console.log('🎯 Recommended Repository Metadata for GitHub:');
        console.log();
        console.log('📝 Description:');
        console.log(`  "${packageMetadata.description}"`);
        console.log();
        console.log('🏷️ Topics:');
        console.log(`  ${recommendedTopics.join(', ')}`);
        console.log();

        console.log('📋 How to Apply These Settings:');
        console.log('1. Navigate to GitHub repository settings:');
        console.log(`   https://github.com/${owner}/${repo}/settings`);
        console.log('2. In the "General" section:');
        console.log('   - Add the description in the "Description" field');
        console.log('   - Add the topics in the "Topics" section (one by one)');
        console.log();

        console.log('✅ These changes will address the compliance issues:');
        console.log('   - Missing repository description');
        console.log('   - Missing repository topics/tags for discoverability');

        return true;
    }

    /**
     * Apply recommended metadata updates
     */
    async applyRecommendedUpdates(owner, repo, dryRun = false) {
        console.log(
            `🚀 ${dryRun ? 'DRY RUN: ' : ''}Applying recommended metadata updates...\n`
        );

        const packageMetadata = this.getPackageMetadata();
        if (!packageMetadata) {
            return false;
        }

        const currentMetadata = await this.getCurrentMetadata(owner, repo);
        if (!currentMetadata) {
            return false;
        }

        let changes = false;

        // Update description if needed
        if (
            !currentMetadata.description ||
            currentMetadata.description !== packageMetadata.description
        ) {
            console.log(
                `📝 Updating description: "${packageMetadata.description}"`
            );
            if (!dryRun) {
                const success = await this.updateDescription(
                    owner,
                    repo,
                    packageMetadata.description
                );
                if (!success) return false;
            }
            changes = true;
        }

        // Update topics if needed
        const recommendedTopics =
            this.generateRecommendedTopics(packageMetadata);
        if (
            currentMetadata.topics.length === 0 ||
            JSON.stringify(currentMetadata.topics.sort()) !==
                JSON.stringify(recommendedTopics.sort())
        ) {
            console.log(
                `🏷️ Updating topics: [${recommendedTopics.join(', ')}]`
            );
            if (!dryRun) {
                const success = await this.updateTopics(
                    owner,
                    repo,
                    recommendedTopics
                );
                if (!success) return false;
            }
            changes = true;
        }

        if (!changes) {
            console.log('✅ Repository metadata is already up to date!');
        } else if (dryRun) {
            console.log(
                '\n🔍 DRY RUN: No changes were applied. Use --apply to make actual changes.'
            );
        } else {
            console.log('\n✅ Repository metadata updated successfully!');
        }

        return true;
    }
}

module.exports = RepositoryMetadataManager;
