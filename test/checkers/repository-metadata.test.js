'use strict';

const RepositoryMetadataChecker = require('../../lib/checkers/repository-metadata');

function context(repository) {
  return {
    githubRepo: repository,
    config: {
      repositoryMetadata: {
        requireDescription: true,
        minimumTopics: 3,
        requiredTopics: ['managed'],
        deleteBranchOnMerge: true,
        requireSecretScanning: true,
        requireDependabotSecurityUpdates: true,
      },
    },
  };
}

describe('RepositoryMetadataChecker', () => {
  const checker = new RepositoryMetadataChecker();

  it('is excluded from scoring when GitHub metadata is unavailable', async () => {
    const result = await checker.check(context(null));
    expect(result.metadata.applicable).toBe(false);
    expect(result.metadata.verified).toBe(false);
  });

  it('scores a compliant repository', async () => {
    const result = await checker.check(context({
      description: 'Managed service',
      topics: ['managed', 'service', 'node'],
      delete_branch_on_merge: true,
      visibility: 'private',
      archived: false,
      security_and_analysis: {
        secret_scanning: { status: 'enabled' },
        dependabot_security_updates: { status: 'enabled' },
      },
    }));
    expect(result.score).toBe(100);
    expect(result.findings).toHaveLength(0);
  });

  it('reports disabled security controls as high findings', async () => {
    const result = await checker.check(context({
      description: 'Managed service',
      topics: ['managed', 'service', 'node'],
      delete_branch_on_merge: true,
      security_and_analysis: {
        secret_scanning: { status: 'disabled' },
        dependabot_security_updates: { status: 'disabled' },
      },
    }));
    expect(result.score).toBe(60);
    expect(result.findings.filter(finding => finding.severity === 'high')).toHaveLength(2);
  });
});
