'use strict';

const Checker = require('../engine/Checker');

class RepositoryMetadataChecker extends Checker {
  constructor() {
    super({
      name: 'repository-metadata',
      version: '3.0.0',
      description: 'Evaluates GitHub description, topics, merge hygiene, and repository security features',
      defaultWeight: 10,
    });
  }

  async check(context) {
    const startTime = Date.now();
    const findings = [];
    const repository = context.githubRepo;
    if (!repository) {
      findings.push({
        id: 'meta-000',
        severity: 'info',
        message: 'GitHub repository metadata is unavailable; checker excluded from scoring',
        file: null,
      });
      return this.createResult(100, findings, { applicable: false, verified: false }, startTime);
    }

    const desired = context.config.repositoryMetadata || {};
    let score = 0;
    const fail = (id, severity, message, fix) => findings.push({ id, severity, message, file: null, fix });

    if (desired.requireDescription === false || (repository.description && repository.description.trim())) score += 20;
    else fail('meta-001', 'medium', 'GitHub repository description is missing', 'Set a concise repository description');

    const topics = repository.topics || [];
    const missingTopics = (desired.requiredTopics || []).filter(topic => !topics.includes(topic));
    if (topics.length >= (desired.minimumTopics || 0) && missingTopics.length === 0) score += 20;
    else fail(
      'meta-002',
      'low',
      `Repository topics do not meet policy (count=${topics.length}, missing=${missingTopics.join(', ') || 'none'})`,
      'Add the required organization and classification topics',
    );

    if (desired.deleteBranchOnMerge === false || repository.delete_branch_on_merge === true) score += 20;
    else fail('meta-003', 'medium', 'Merged branches are not deleted automatically', 'Enable delete_branch_on_merge');

    const security = repository.security_and_analysis || {};
    const secretScanning = security.secret_scanning && security.secret_scanning.status;
    const secretScanningVerified =
      desired.requireSecretScanning === false || secretScanning === 'enabled' || secretScanning === 'disabled';
    if (desired.requireSecretScanning === false || secretScanning === 'enabled') score += 20;
    else fail(
      'meta-004',
      secretScanning ? 'high' : 'medium',
      secretScanning ? 'GitHub secret scanning is disabled' : 'GitHub secret scanning status could not be verified',
      'Enable GitHub secret scanning for the repository',
    );

    const dependabot = security.dependabot_security_updates && security.dependabot_security_updates.status;
    const dependabotVerified =
      desired.requireDependabotSecurityUpdates === false || dependabot === 'enabled' || dependabot === 'disabled';
    if (desired.requireDependabotSecurityUpdates === false || dependabot === 'enabled') score += 20;
    else fail(
      'meta-005',
      dependabot ? 'high' : 'medium',
      dependabot ? 'Dependabot security updates are disabled' : 'Dependabot security update status could not be verified',
      'Enable Dependabot security updates',
    );

    return this.createResult(score, findings, {
      applicable: true,
      verified: secretScanningVerified && dependabotVerified,
      visibility: repository.visibility,
      archived: repository.archived,
      topics,
      desired,
    }, startTime);
  }
}

module.exports = RepositoryMetadataChecker;
