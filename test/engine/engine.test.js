'use strict';

const path = require('path');
const Checker = require('../../lib/engine/Checker');
const Engine = require('../../lib/engine/Engine');

const FIXTURES = path.join(__dirname, '..', 'fixtures');

class TestChecker extends Checker {
  constructor(name, score, findings = []) {
    super({ name, version: '1.0.0', description: 'Test', defaultWeight: 50 });
    this._score = score;
    this._findings = findings;
  }
  async check() {
    return this.createResult(this._score, this._findings);
  }
}

class FixableChecker extends Checker {
  constructor() {
    super({ name: 'fixable', version: '1.0.0', description: 'Fixable', defaultWeight: 10 });
  }
  async check() {
    return this.createResult(50, [
      { id: 'fix1', severity: 'medium', message: 'Can fix', fixable: true, fix: 'Apply fix' },
    ]);
  }
  async fix(/* context, findings */) {
    return { checker: this.name, applied: [{ id: 'fix1' }], skipped: [] };
  }
}

class CrashingChecker extends Checker {
  constructor() {
    super({ name: 'crasher', version: '1.0.0', description: 'Crashes', defaultWeight: 10 });
  }
  async check() {
    throw new Error('Boom');
  }
}

describe('Engine', () => {
  describe('register()', () => {
    it('adds checkers and returns self for chaining', () => {
      const engine = new Engine({ projectRoot: path.join(FIXTURES, 'healthy-project') });
      const result = engine.register(new TestChecker('a', 100));
      expect(result).toBe(engine);
    });
  });

  describe('run()', () => {
    it('runs registered checkers and returns a report', async () => {
      const engine = new Engine({ projectRoot: path.join(FIXTURES, 'healthy-project') });
      engine.register(new TestChecker('docs', 90));
      engine.register(new TestChecker('security', 80));

      const report = await engine.run();
      expect(report.score).toBeGreaterThan(0);
      expect(report.grade).toBeTruthy();
      expect(report.checkers.docs).toBeDefined();
      expect(report.checkers.security).toBeDefined();
    });

    it('filters checkers with only parameter', async () => {
      const engine = new Engine({ projectRoot: path.join(FIXTURES, 'healthy-project') });
      engine.register(new TestChecker('docs', 90));
      engine.register(new TestChecker('security', 80));

      const report = await engine.run(['docs']);
      expect(report.checkers.docs).toBeDefined();
      expect(report.checkers.security).toBeUndefined();
    });

    it('handles crashing checkers gracefully', async () => {
      const engine = new Engine({ projectRoot: path.join(FIXTURES, 'healthy-project') });
      engine.register(new CrashingChecker());

      const report = await engine.run();
      expect(report.checkers.crasher).toBeDefined();
      expect(report.checkers.crasher.score).toBe(0);
      expect(report.checkers.crasher.findings[0].message).toContain('Boom');
    });
  });

  describe('fix()', () => {
    it('returns report and fix results', async () => {
      const engine = new Engine({ projectRoot: path.join(FIXTURES, 'healthy-project') });
      engine.register(new FixableChecker());

      const { report, fixes } = await engine.fix();
      expect(report).toBeDefined();
      expect(fixes).toHaveLength(1);
      expect(fixes[0].applied).toHaveLength(1);
    });

    it('respects dryRun flag', async () => {
      const engine = new Engine({ projectRoot: path.join(FIXTURES, 'healthy-project') });
      engine.register(new FixableChecker());

      const { fixes } = await engine.fix({ dryRun: true });
      expect(fixes).toHaveLength(1);
      expect(fixes[0].applied).toHaveLength(0);
      expect(fixes[0].skipped).toHaveLength(1);
      expect(fixes[0].skipped[0].reason).toBe('Dry run');
    });
  });
});
