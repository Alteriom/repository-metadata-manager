'use strict';

class Checker {
  constructor({ name, version, description, defaultWeight }) {
    this.name = name;
    this.version = version;
    this.description = description;
    this.defaultWeight = defaultWeight;
  }

  async check(/* context */) {
    throw new Error(`${this.name}: check() not implemented`);
  }

  async fix(/* context, findings */) {
    return { checker: this.name, applied: [], skipped: [] };
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
    return {
      checker: this.name,
      score: capped,
      grade: Checker.grade(capped),
      findings,
      metadata,
      duration: Date.now() - startTime,
    };
  }
}

module.exports = Checker;
