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
    super({ name: 'fixable', version: '1.0.0', description: 'Fixable', defaultWeight: 10, fixableFindingIds: ['fix1'] });
  }
  async check() {
    return this.createResult(50, [
      { id: 'fix1', severity: 'medium', message: 'Can fix', fixable: true, fix: 'Apply fix' },
    ]);
  }
  async plan() {
    return {
      checker: this.name,
      operations: [{
        id: 'fixable:write', checker: this.name, findingId: 'fix1', type: 'write-file',
        path: 'generated.txt', description: 'Generate test file', beforeHash: null, content: 'generated\n',
      }],
      unsupported: [],
    };
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
    it('returns a report, plan, and dry-run audit by default', async () => {
      const engine = new Engine({ projectRoot: path.join(FIXTURES, 'healthy-project') });
      engine.register(new FixableChecker());

      const { report, plan, application } = await engine.fix();
      expect(report).toBeDefined();
      expect(plan.operations).toHaveLength(1);
      expect(application.dryRun).toBe(true);
      expect(application.results[0].status).toBe('previewed');
    });

    it('requires approval when dryRun is disabled', async () => {
      const engine = new Engine({ projectRoot: path.join(FIXTURES, 'healthy-project') });
      engine.register(new FixableChecker());

      await expect(engine.fix({ dryRun: false })).rejects.toThrow('explicit approval');
    });
  });
});
