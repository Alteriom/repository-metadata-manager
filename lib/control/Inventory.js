'use strict';

class Inventory {
  static local(context) {
    return {
      schemaVersion: '1.0.0',
      kind: 'RepositoryInventory',
      generatedAt: new Date().toISOString(),
      source: 'local',
      repositories: [{
        ...context.repositoryIdentity(),
        archived: context.githubRepo ? context.githubRepo.archived : null,
        visibility: context.githubRepo ? context.githubRepo.visibility : null,
        description: context.githubRepo ? context.githubRepo.description : null,
        topics: context.githubRepo ? context.githubRepo.topics : [],
      }],
      summary: { repositories: 1 },
    };
  }

  static async organization(octokit, organization) {
    if (!octokit) throw new Error('Organization inventory requires GITHUB_TOKEN');
    if (!organization || !/^[A-Za-z0-9_.-]+$/.test(organization)) {
      throw new Error('A valid GitHub organization name is required');
    }
    const repositories = await octokit.paginate(octokit.repos.listForOrg, {
      org: organization,
      type: 'all',
      per_page: 100,
    });

    const normalized = repositories.map(repo => ({
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      defaultBranch: repo.default_branch,
      archived: repo.archived,
      disabled: repo.disabled,
      visibility: repo.visibility,
      fork: repo.fork,
      description: repo.description,
      topics: repo.topics || [],
      language: repo.language,
      pushedAt: repo.pushed_at,
      url: repo.html_url,
    })).sort((a, b) => a.fullName.localeCompare(b.fullName));

    return {
      schemaVersion: '1.0.0',
      kind: 'RepositoryInventory',
      generatedAt: new Date().toISOString(),
      source: 'github-organization',
      organization,
      repositories: normalized,
      summary: {
        repositories: normalized.length,
        active: normalized.filter(repo => !repo.archived && !repo.disabled).length,
        archived: normalized.filter(repo => repo.archived).length,
        private: normalized.filter(repo => repo.visibility === 'private').length,
      },
    };
  }
}

module.exports = Inventory;
