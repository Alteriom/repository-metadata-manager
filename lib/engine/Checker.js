'use strict';

class Checker {
  constructor({ name, version, description, defaultWeight, fixableFindingIds = [] }) {
    this.name = name;
    this.version = version;
    this.description = description;
    this.defaultWeight = defaultWeight;
    this.fixableFindingIds = new Set(fixableFindingIds);
  }

  async check(/* context */) {
    throw new Error(`${this.name}: check() not implemented`);
  }

  async plan(/* context, findings */) {
    return { checker: this.name, operations: [], unsupported: [] };
  }

  static grade(score) {
    const capped = Math.min(Math.max(score, 0), 100);
    if (capped >= 90) return 'A';
    if (capped >= 80) return 'B';
    if (capped >= 70) return 'C';
    if (capped >= 50) return 'D';
    return 'F';
  }

  createResult(score, findings = [], metadata = {}, startTime = Date.now()) {
    const capped = Math.min(Math.max(Math.round(score), 0), 100);
    const normalizedFindings = findings.map(finding => ({
      line: null,
      fix: null,
      current: null,
      expected: null,
      ...finding,
      checker: this.name,
      fixable: this.fixableFindingIds.has(finding.id),
      evidence: finding.evidence || (finding.file ? {
        type: 'file',
        path: finding.file,
        line: finding.line || null,
      } : null),
    }));
    return {
      checker: this.name,
      checkerVersion: this.version,
      score: capped,
      grade: Checker.grade(capped),
      findings: normalizedFindings,
      metadata,
      duration: Date.now() - startTime,
    };
  }
}

module.exports = Checker;
