'use strict';

const Checker = require('./Checker');

class Report {
  static aggregate(checkResults, checkerConfigs = {}, options = {}) {
    if (!checkResults || checkResults.length === 0) {
      return Report.empty(options);
    }

    // Calculate weighted score
    let totalWeight = 0;
    let weightedSum = 0;

    const applicableResults = checkResults.filter(result => result.metadata?.applicable !== false);
    for (const result of applicableResults) {
      const config = checkerConfigs[result.checker] || {};
      const weight = config.weight ?? 10;
      totalWeight += weight;
      weightedSum += result.score * weight;
    }

    const score = totalWeight > 0 ? Math.min(Math.round(weightedSum / totalWeight), 100) : 0;

    // Merge findings
    const allFindings = checkResults.flatMap(r => r.findings || []);

    // Count by severity
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const f of allFindings) {
      if (bySeverity[f.severity] !== undefined) bySeverity[f.severity]++;
    }

    // Fixable count
    const fixable = allFindings.filter(f => f.fixable).length;

    // Build checkers map
    const checkers = {};
    for (const result of checkResults) {
      checkers[result.checker] = result;
    }

    // Recommendations from high+ findings
    const recommendations = allFindings
      .filter(f => f.severity === 'critical' || f.severity === 'high')
      .map(f => f.fix || f.message);

    const policy = options.policy || { id: 'unconfigured', version: '0.0.0', gates: {} };
    const gateResults = Report.evaluateGates({ score, bySeverity, checkers }, policy.gates || {});

    return {
      schemaVersion: '1.0.0',
      kind: 'RepositoryComplianceReport',
      tool: options.tool || null,
      repository: options.repository || null,
      policy: { id: policy.id, version: policy.version, schemaVersion: policy.schemaVersion },
      score,
      grade: Checker.grade(score),
      status: gateResults.every(gate => gate.passed) ? 'pass' : 'fail',
      timestamp: new Date().toISOString(),
      checkers,
      summary: {
        total_findings: allFindings.length,
        by_severity: bySeverity,
        fixable,
      },
      recommendations: [...new Set(recommendations)], // deduplicate
      gates: gateResults,
    };
  }

  static evaluateGates({ score, bySeverity, checkers }, gates) {
    const results = [];
    const add = (id, passed, actual, expected) => results.push({ id, passed, actual, expected });
    if (gates.failBelow !== undefined) add('minimum-score', score >= gates.failBelow, score, `>= ${gates.failBelow}`);
    if (gates.maxCritical !== undefined) add('maximum-critical', bySeverity.critical <= gates.maxCritical, bySeverity.critical, `<= ${gates.maxCritical}`);
    if (gates.maxHigh !== undefined) add('maximum-high', bySeverity.high <= gates.maxHigh, bySeverity.high, `<= ${gates.maxHigh}`);
    for (const [checker, minimum] of Object.entries(gates.checkerMinimums || {})) {
      if (checkers[checker]) add(`checker:${checker}`, checkers[checker].score >= minimum, checkers[checker].score, `>= ${minimum}`);
    }
    for (const checker of gates.requireVerifiedCheckers || []) {
      const verified = Boolean(checkers[checker] && checkers[checker].metadata && checkers[checker].metadata.verified === true);
      add(`verified:${checker}`, verified, verified, 'verified via authoritative source');
    }
    return results;
  }

  static empty(options = {}) {
    return {
      schemaVersion: '1.0.0',
      kind: 'RepositoryComplianceReport',
      tool: options.tool || null,
      repository: options.repository || null,
      policy: options.policy ? { id: options.policy.id, version: options.policy.version, schemaVersion: options.policy.schemaVersion } : null,
      score: 0,
      grade: 'F',
      status: 'fail',
      timestamp: new Date().toISOString(),
      checkers: {},
      summary: { total_findings: 0, by_severity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, fixable: 0 },
      recommendations: [],
      gates: [],
    };
  }
}

module.exports = Report;
