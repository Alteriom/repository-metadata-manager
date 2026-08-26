'use strict';

const crypto = require('crypto');

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

class Planner {
  static hash(content) {
    if (content === null || content === undefined) return null;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  static idFor(plan) {
    const identity = {
      repository: plan.repository,
      policy: plan.policy,
      operations: plan.operations,
    };
    return crypto.createHash('sha256').update(stableStringify(identity)).digest('hex').slice(0, 24);
  }

  static async create({ context, report, checkers }) {
    const operations = [];
    const unsupported = [];

    for (const checker of checkers) {
      const result = report.checkers[checker.name];
      if (!result) continue;
      const findings = (result.findings || []).filter(finding => finding.fixable === true);
      if (findings.length === 0) continue;

      const checkerPlan = await checker.plan(context, findings);
      operations.push(...(checkerPlan.operations || []));
      unsupported.push(...(checkerPlan.unsupported || []));
    }

    operations.sort((a, b) => `${a.checker}:${a.id}`.localeCompare(`${b.checker}:${b.id}`));
    const id = Planner.idFor({ repository: report.repository, policy: report.policy, operations });

    return {
      schemaVersion: '1.0.0',
      kind: 'RepositoryRemediationPlan',
      id,
      createdAt: new Date().toISOString(),
      repository: report.repository,
      policy: report.policy,
      sourceReport: {
        score: report.score,
        status: report.status,
        timestamp: report.timestamp,
      },
      operations,
      unsupported,
      summary: {
        operations: operations.length,
        unsupported: unsupported.length,
      },
    };
  }
}

module.exports = Planner;
