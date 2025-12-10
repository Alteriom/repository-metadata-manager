/**
 * TokenManager - Hierarchical GitHub token detection and management
 * 
 * Provides intelligent token resolution for AI agents and manual usage:
 * 1. Environment variables (GITHUB_TOKEN, AGENT_ORG_TOKEN)
 * 2. GitHub Actions context (automatically provided GITHUB_TOKEN)
 * 3. .env file fallback
 * 4. Graceful degradation to local-only mode
 * 
 * @module TokenManager
 */

const fs = require('fs');
const path = require('path');

class TokenManager {
    constructor(options = {}) {
        this.options = options;
        this.detectedToken = null;
        this.tokenSource = null;
        this.isGitHubActions = false;
    }

    /**
     * Detect and return the appropriate GitHub token
     * @returns {Object} { token: string|null, source: string, isAvailable: boolean }
     */
    detectToken() {
        // Priority 1: Explicit token from options
        if (this.options.token) {
            this.detectedToken = this.options.token;
            this.tokenSource = 'explicit';
            return {
                token: this.detectedToken,
                source: this.tokenSource,
                isAvailable: true,
            };
        }

        // Priority 2: Check for GitHub Actions environment
        if (this._isGitHubActions()) {
            this.isGitHubActions = true;
            
            // Try GITHUB_TOKEN first (standard in GitHub Actions)
            const githubToken = process.env.GITHUB_TOKEN;
            if (githubToken) {
                this.detectedToken = githubToken;
                this.tokenSource = 'github-actions';
                return {
                    token: this.detectedToken,
                    source: this.tokenSource,
                    isAvailable: true,
                    environment: 'github-actions',
                };
            }
        }

        // Priority 3: Environment variables (for local development or CI)
        const envToken = process.env.GITHUB_TOKEN || process.env.AGENT_ORG_TOKEN;
        if (envToken) {
            this.detectedToken = envToken;
            this.tokenSource = process.env.GITHUB_TOKEN ? 'env-github-token' : 'env-agent-token';
            return {
                token: this.detectedToken,
                source: this.tokenSource,
                isAvailable: true,
            };
        }

        // Priority 4: .env file (for local development)
        const dotenvToken = this._loadFromDotenv();
        if (dotenvToken) {
            this.detectedToken = dotenvToken;
            this.tokenSource = 'dotenv-file';
            return {
                token: this.detectedToken,
                source: this.tokenSource,
                isAvailable: true,
            };
        }

        // No token available - return graceful degradation info
        this.detectedToken = null;
        this.tokenSource = 'none';
        return {
            token: null,
            source: 'none',
            isAvailable: false,
            localOnlyMode: true,
        };
    }

    /**
     * Check if running in GitHub Actions environment
     * @private
     * @returns {boolean}
     */
    _isGitHubActions() {
        return (
            process.env.GITHUB_ACTIONS === 'true' ||
            (process.env.CI === 'true' && process.env.GITHUB_REPOSITORY !== undefined)
        );
    }

    /**
     * Load token from .env file
     * @private
     * @returns {string|null}
     */
    _loadFromDotenv() {
        try {
            const envPath = path.join(process.cwd(), '.env');
            
            if (!fs.existsSync(envPath)) {
                return null;
            }

            const envContent = fs.readFileSync(envPath, 'utf8');
            const lines = envContent.split('\n');

            for (const line of lines) {
                const trimmedLine = line.trim();
                
                // Skip comments and empty lines
                if (!trimmedLine || trimmedLine.startsWith('#')) {
                    continue;
                }

                // Parse KEY=VALUE format
                const match = trimmedLine.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes

                    if (key === 'GITHUB_TOKEN' || key === 'AGENT_ORG_TOKEN') {
                        return value;
                    }
                }
            }
        } catch (error) {
            // Silently fail if .env file can't be read
            return null;
        }

        return null;
    }

    /**
     * Get repository information from environment
     * Useful for GitHub Actions context
     * @returns {Object} { owner: string|null, repo: string|null }
     */
    getRepositoryInfo() {
        // GitHub Actions provides GITHUB_REPOSITORY in format "owner/repo"
        if (this.isGitHubActions && process.env.GITHUB_REPOSITORY) {
            const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
            return { owner, repo };
        }

        // Fallback to environment variables
        return {
            owner: process.env.GITHUB_REPOSITORY_OWNER || null,
            repo: process.env.GITHUB_REPOSITORY_NAME || null,
        };
    }

    /**
     * Check if local-only mode should be used
     * @returns {boolean}
     */
    shouldUseLocalOnly() {
        return this.options.localOnly || !this.detectedToken;
    }

    /**
     * Validate token format (basic check)
     * @param {string} token
     * @returns {boolean}
     */
    validateToken(token) {
        if (!token) return false;
        
        // GitHub tokens typically start with ghp_, gho_, ghs_, or github_pat_
        // Classic tokens are 40 character hex strings
        return (
            token.startsWith('ghp_') ||
            token.startsWith('gho_') ||
            token.startsWith('ghs_') ||
            token.startsWith('github_pat_') ||
            /^[a-f0-9]{40}$/i.test(token)
        );
    }

    /**
     * Get human-readable description of token source
     * @returns {string}
     */
    getTokenSourceDescription() {
        const descriptions = {
            'explicit': 'Explicitly provided token (CLI or config)',
            'github-actions': 'GitHub Actions built-in GITHUB_TOKEN',
            'env-github-token': 'Environment variable: GITHUB_TOKEN',
            'env-agent-token': 'Environment variable: AGENT_ORG_TOKEN',
            'dotenv-file': '.env file in current directory',
            'none': 'No token available - local-only mode',
        };

        return descriptions[this.tokenSource] || 'Unknown token source';
    }
}

module.exports = TokenManager;
