const { Octokit } = require('@octokit/rest');

class RepositoryManager {
  constructor(config) {
    this.config = config;
    this.octokit = new Octokit({ auth: config.token });
    this.owner = config.owner;
    this.repo = config.repo;
  }

  async getRepository() {
    const { data } = await this.octokit.repos.get({
      owner: this.owner,
      repo: this.repo
    });
    return data;
  }

  async updateRepository(updates) {
    const { data } = await this.octokit.repos.update({
      owner: this.owner,
      repo: this.repo,
      ...updates
    });
    return data;
  }

  async getContents(path) {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path
      });
      return data;
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async createOrUpdateFile(path, content, message, sha = null) {
    const params = {
      owner: this.owner,
      repo: this.repo,
      path,
      message,
      content: Buffer.from(content).toString('base64')
    };
    
    if (sha) params.sha = sha;
    
    const { data } = await this.octokit.repos.createOrUpdateFileContents(params);
    return data;
  }

  async getBranchProtection(branch) {
    try {
      const { data } = await this.octokit.repos.getBranchProtection({
        owner: this.owner,
        repo: this.repo,
        branch
      });
      return data;
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async updateBranchProtection(branch, protection) {
    const { data } = await this.octokit.repos.updateBranchProtection({
      owner: this.owner,
      repo: this.repo,
      branch,
      ...protection
    });
    return data;
  }

  async listBranches() {
    const { data } = await this.octokit.repos.listBranches({
      owner: this.owner,
      repo: this.repo
    });
    return data;
  }

  async listCommits(options = {}) {
    const { data } = await this.octokit.repos.listCommits({
      owner: this.owner,
      repo: this.repo,
      per_page: 10,
      ...options
    });
    return data;
  }

  async getCommit(sha) {
    const { data } = await this.octokit.repos.getCommit({
      owner: this.owner,
      repo: this.repo,
      ref: sha
    });
    return data;
  }
}

module.exports = RepositoryManager;
