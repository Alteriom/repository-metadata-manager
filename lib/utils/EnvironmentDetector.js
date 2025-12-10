/**
 * EnvironmentDetector - Detect execution environment and context
 * 
 * Detects:
 * - GitHub Actions environment
 * - CI/CD platforms
 * - Local development
 * - Available resources and permissions
 * 
 * @module EnvironmentDetector
 */

class EnvironmentDetector {
    constructor() {
        this.environment = this._detectEnvironment();
        this.capabilities = this._detectCapabilities();
    }

    /**
     * Detect the current execution environment
     * @private
     * @returns {Object}
     */
    _detectEnvironment() {
        const env = {
            type: 'unknown',
            isCI: false,
            isGitHubActions: false,
            isLocal: false,
            platform: null,
            runner: null,
        };

        // Check for GitHub Actions
        if (process.env.GITHUB_ACTIONS === 'true') {
            env.type = 'github-actions';
            env.isCI = true;
            env.isGitHubActions = true;
            env.platform = 'GitHub Actions';
            env.runner = process.env.RUNNER_OS || 'unknown';
            env.workflow = process.env.GITHUB_WORKFLOW || null;
            env.eventName = process.env.GITHUB_EVENT_NAME || null;
            env.ref = process.env.GITHUB_REF || null;
            env.sha = process.env.GITHUB_SHA || null;
            env.actor = process.env.GITHUB_ACTOR || null;
            env.repository = process.env.GITHUB_REPOSITORY || null;
            return env;
        }

        // Check for other CI platforms
        if (process.env.CI === 'true') {
            env.isCI = true;

            // Detect specific CI platform
            if (process.env.TRAVIS) {
                env.type = 'travis-ci';
                env.platform = 'Travis CI';
            } else if (process.env.CIRCLECI) {
                env.type = 'circleci';
                env.platform = 'CircleCI';
            } else if (process.env.JENKINS_URL) {
                env.type = 'jenkins';
                env.platform = 'Jenkins';
            } else if (process.env.GITLAB_CI) {
                env.type = 'gitlab-ci';
                env.platform = 'GitLab CI';
            } else if (process.env.BITBUCKET_BUILD_NUMBER) {
                env.type = 'bitbucket';
                env.platform = 'Bitbucket Pipelines';
            } else {
                env.type = 'ci-generic';
                env.platform = 'Generic CI';
            }

            return env;
        }

        // Local development environment
        env.type = 'local';
        env.isLocal = true;
        env.platform = 'Local Development';
        env.runner = process.platform;

        return env;
    }

    /**
     * Detect available capabilities and permissions
     * @private
     * @returns {Object}
     */
    _detectCapabilities() {
        const capabilities = {
            hasGitHubToken: false,
            hasWriteAccess: false,
            canCreatePR: false,
            canModifyFiles: true, // Assume local file system access
            canRunTests: true,
            canInstallDependencies: true,
        };

        // Check for GitHub token
        if (
            process.env.GITHUB_TOKEN ||
            process.env.AGENT_ORG_TOKEN
        ) {
            capabilities.hasGitHubToken = true;
            
            // In GitHub Actions, the default GITHUB_TOKEN has write access
            if (this.environment.isGitHubActions) {
                capabilities.hasWriteAccess = true;
                capabilities.canCreatePR = true;
            }
        }

        return capabilities;
    }

    /**
     * Check if running in AI agent mode
     * This is determined by specific environment variables or flags
     * @returns {boolean}
     */
    isAIAgentMode() {
        return (
            process.env.AI_AGENT === 'true' ||
            process.env.COPILOT_AGENT === 'true' ||
            this.environment.isGitHubActions && process.env.GITHUB_WORKFLOW?.includes('ai-agent')
        );
    }

    /**
     * Get recommended execution mode based on environment
     * @returns {Object}
     */
    getRecommendedMode() {
        const mode = {
            localOnly: false,
            autoFix: false,
            interactive: true,
            dryRun: false,
        };

        // GitHub Actions or CI - enable automation
        if (this.environment.isCI) {
            mode.localOnly = !this.capabilities.hasGitHubToken;
            mode.autoFix = this.isAIAgentMode();
            mode.interactive = false;
            mode.dryRun = !this.isAIAgentMode(); // Dry run unless explicitly AI agent
        }

        // Local development - interactive mode
        if (this.environment.isLocal) {
            mode.localOnly = !this.capabilities.hasGitHubToken;
            mode.autoFix = false;
            mode.interactive = true;
            mode.dryRun = false;
        }

        return mode;
    }

    /**
     * Get environment summary for logging
     * @returns {Object}
     */
    getEnvironmentSummary() {
        return {
            environment: this.environment.platform,
            type: this.environment.type,
            isCI: this.environment.isCI,
            isGitHubActions: this.environment.isGitHubActions,
            hasToken: this.capabilities.hasGitHubToken,
            aiAgentMode: this.isAIAgentMode(),
            recommendedMode: this.getRecommendedMode(),
        };
    }

    /**
     * Check if environment supports a specific feature
     * @param {string} feature
     * @returns {boolean}
     */
    supportsFeature(feature) {
        const supportMatrix = {
            'github-api': this.capabilities.hasGitHubToken,
            'auto-fix': true,
            'interactive': this.environment.isLocal,
            'pr-creation': this.capabilities.canCreatePR,
            'file-modification': this.capabilities.canModifyFiles,
            'local-audit': true,
        };

        return supportMatrix[feature] || false;
    }

    /**
     * Get repository context from environment
     * @returns {Object}
     */
    getRepositoryContext() {
        const context = {
            owner: null,
            repo: null,
            branch: null,
            sha: null,
            prNumber: null,
        };

        if (this.environment.isGitHubActions) {
            // Parse GITHUB_REPOSITORY (format: owner/repo)
            if (this.environment.repository) {
                const [owner, repo] = this.environment.repository.split('/');
                context.owner = owner;
                context.repo = repo;
            }

            // Parse GITHUB_REF (format: refs/heads/branch or refs/pull/123/merge)
            if (this.environment.ref) {
                const refMatch = this.environment.ref.match(/refs\/heads\/(.+)/);
                if (refMatch) {
                    context.branch = refMatch[1];
                }

                const prMatch = this.environment.ref.match(/refs\/pull\/(\d+)\/merge/);
                if (prMatch) {
                    context.prNumber = parseInt(prMatch[1], 10);
                }
            }

            context.sha = this.environment.sha;
        }

        // Fallback to environment variables
        context.owner = context.owner || process.env.GITHUB_REPOSITORY_OWNER;
        context.repo = context.repo || process.env.GITHUB_REPOSITORY_NAME;
        context.branch = context.branch || process.env.GITHUB_REF_NAME;

        return context;
    }

    /**
     * Get formatted environment info for display
     * @returns {string}
     */
    toString() {
        const summary = this.getEnvironmentSummary();
        return `Environment: ${summary.environment} | Token: ${summary.hasToken ? '✓' : '✗'} | AI Mode: ${summary.aiAgentMode ? '✓' : '✗'}`;
    }
}

module.exports = EnvironmentDetector;
