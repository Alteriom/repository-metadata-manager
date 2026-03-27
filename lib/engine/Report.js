'use strict';

const Checker = require('./Checker');

class Report {
  static aggregate(checkResults, checkerConfigs = {}) {
    if (!checkResults || checkResults.length === 0) {
      return Report.empty();
    }

    // Calculate weighted score
    let totalWeight = 0;
    let weightedSum = 0;

    for (const result of checkResults) {
      const config = checkerConfigs[result.checker] || {};
      const weight = config.weight || 10; // default weight
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

    return {
      score,
      grade: Checker.grade(score),
      timestamp: new Date().toISOString(),
      checkers,
      summary: {
        total_findings: allFindings.length,
        by_severity: bySeverity,
        fixable,
      },
      recommendations: [...new Set(recommendations)], // deduplicate
    };
  }

  static empty() {
    return {
      score: 0,
      grade: 'F',
      timestamp: new Date().toISOString(),
      checkers: {},
      summary: { total_findings: 0, by_severity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, fixable: 0 },
      recommendations: [],
    };
  }
}

module.exports = Report;
