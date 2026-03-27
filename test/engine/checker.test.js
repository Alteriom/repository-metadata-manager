'use strict';

const Checker = require('../../lib/engine/Checker');

describe('Checker', () => {
  describe('constructor', () => {
    it('stores name, version, description, defaultWeight', () => {
      const c = new Checker({ name: 'test', version: '1.0.0', description: 'A test checker', defaultWeight: 10 });
      expect(c.name).toBe('test');
      expect(c.version).toBe('1.0.0');
      expect(c.description).toBe('A test checker');
      expect(c.defaultWeight).toBe(10);
    });
  });

  describe('check()', () => {
    it('throws not-implemented error', async () => {
      const c = new Checker({ name: 'base', version: '1.0.0', description: '', defaultWeight: 10 });
      await expect(c.check()).rejects.toThrow('base: check() not implemented');
    });
  });

  describe('fix()', () => {
    it('returns empty applied and skipped arrays', async () => {
      const c = new Checker({ name: 'base', version: '1.0.0', description: '', defaultWeight: 10 });
      const result = await c.fix();
      expect(result).toEqual({ checker: 'base', applied: [], skipped: [] });
    });
  });

  describe('grade()', () => {
    it('returns A for scores >= 90', () => {
      expect(Checker.grade(90)).toBe('A');
      expect(Checker.grade(100)).toBe('A');
    });

    it('returns B for scores 80-89', () => {
      expect(Checker.grade(80)).toBe('B');
      expect(Checker.grade(89)).toBe('B');
    });

    it('returns C for scores 70-79', () => {
      expect(Checker.grade(70)).toBe('C');
      expect(Checker.grade(79)).toBe('C');
    });

    it('returns D for scores 50-69', () => {
      expect(Checker.grade(50)).toBe('D');
      expect(Checker.grade(69)).toBe('D');
    });

    it('returns F for scores below 50', () => {
      expect(Checker.grade(49)).toBe('F');
      expect(Checker.grade(0)).toBe('F');
    });

    it('clamps scores to 0-100', () => {
      expect(Checker.grade(-10)).toBe('F');
      expect(Checker.grade(150)).toBe('A');
    });
  });

  describe('createResult()', () => {
    it('returns a result object with correct fields', () => {
      const c = new Checker({ name: 'test', version: '1.0.0', description: '', defaultWeight: 10 });
      const findings = [{ id: 'f1', severity: 'low', message: 'test' }];
      const result = c.createResult(85, findings, { foo: 'bar' });

      expect(result.checker).toBe('test');
      expect(result.score).toBe(85);
      expect(result.grade).toBe('B');
      expect(result.findings).toEqual(findings);
      expect(result.metadata).toEqual({ foo: 'bar' });
      expect(typeof result.duration).toBe('number');
    });

    it('clamps score to 0-100', () => {
      const c = new Checker({ name: 'test', version: '1.0.0', description: '', defaultWeight: 10 });
      expect(c.createResult(150).score).toBe(100);
      expect(c.createResult(-20).score).toBe(0);
    });

    it('rounds score', () => {
      const c = new Checker({ name: 'test', version: '1.0.0', description: '', defaultWeight: 10 });
      expect(c.createResult(85.7).score).toBe(86);
    });
  });
});
