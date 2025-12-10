const { Octokit } = require('@octokit/rest');
const TokenManager = require('../utils/TokenManager');

class RepositoryManager {
    constructor(config) {
        this.config = config;
        
        // Use TokenManager for intelligent token detection
        const tokenManager = new TokenManager({ token: config.token });
        const tokenInfo = tokenManager.detectToken();
        
        this.tokenInfo = tokenInfo;
        this.localOnlyMode = !tokenInfo.isAvailable;
        
        // Initialize Octokit only if token is available
        if (tokenInfo.isAvailable) {
            this.octokit = new Octokit({ auth: tokenInfo.token });
        } else {
            this.octokit = null;
            console.warn('⚠️  No GitHub token available - running in local-only mode');
        }
        
        // Get repository info from TokenManager or config
        const repoInfo = tokenManager.getRepositoryInfo();
        this.owner = config.owner || repoInfo.owner;
        this.repo = config.repo || repoInfo.repo;
    }
    
    /**
     * Check if API methods are available
     * @private
     */
    _ensureAPIAvailable() {
        if (this.localOnlyMode || !this.octokit) {
            throw new Error('GitHub API not available - running in local-only mode. Use --local-only flag for local operations.');
        }
    }

    async getRepository() {
        this._ensureAPIAvailable();
        const { data } = await this.octokit.repos.get({
            owner: this.owner,
            repo: this.repo,
        });
        return data;
    }

    async updateRepository(updates) {
        this._ensureAPIAvailable();
        const { data } = await this.octokit.repos.update({
            owner: this.owner,
            repo: this.repo,
            ...updates,
        });
        return data;
    }

    async getContents(path) {
        this._ensureAPIAvailable();
        try {
            const { data } = await this.octokit.repos.getContent({
                owner: this.owner,
                repo: this.repo,
                path,
            });
            return data;
        } catch (error) {
            if (error.status === 404) return null;
            throw error;
        }
    }

    async createOrUpdateFile(path, content, message, sha = null) {
        this._ensureAPIAvailable();
        const params = {
            owner: this.owner,
            repo: this.repo,
            path,
            message,
            content: Buffer.from(content).toString('base64'),
        };

        if (sha) params.sha = sha;

        const { data } =
            await this.octokit.repos.createOrUpdateFileContents(params);
        return data;
    }

    async getBranchProtection(branch) {
        this._ensureAPIAvailable();
        try {
            const { data } = await this.octokit.repos.getBranchProtection({
                owner: this.owner,
                repo: this.repo,
                branch,
            });
            return data;
        } catch (error) {
            if (error.status === 404) return null;
            throw error;
        }
    }

    async updateBranchProtection(branch, protection) {
        this._ensureAPIAvailable();
        const { data } = await this.octokit.repos.updateBranchProtection({
            owner: this.owner,
            repo: this.repo,
            branch,
            ...protection,
        });
        return data;
    }

    async listBranches() {
        this._ensureAPIAvailable();
        const { data } = await this.octokit.repos.listBranches({
            owner: this.owner,
            repo: this.repo,
        });
        return data;
    }

    async listCommits(options = {}) {
        this._ensureAPIAvailable();
        const { data } = await this.octokit.repos.listCommits({
            owner: this.owner,
            repo: this.repo,
            per_page: 10,
            ...options,
        });
        return data;
    }

    async getCommit(sha) {
        this._ensureAPIAvailable();
        const { data } = await this.octokit.repos.getCommit({
            owner: this.owner,
            repo: this.repo,
            ref: sha,
        });
        return data;
    }
}

module.exports = RepositoryManager;
