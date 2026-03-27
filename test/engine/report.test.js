'use strict';

const Report = require('../../lib/engine/Report');

describe('Report', () => {
  describe('empty()', () => {
    it('returns an empty report', () => {
      const report = Report.empty();
      expect(report.score).toBe(0);
      expect(report.grade).toBe('F');
      expect(report.checkers).toEqual({});
      expect(report.summary.total_findings).toBe(0);
      expect(report.recommendations).toEqual([]);
    });
  });

  describe('aggregate()', () => {
    it('returns empty report for no results', () => {
      const report = Report.aggregate([]);
      expect(report.score).toBe(0);
      expect(report.grade).toBe('F');
    });

    it('calculates weighted score', () => {
      const results = [
        { checker: 'a', score: 100, findings: [] },
        { checker: 'b', score: 0, findings: [] },
      ];
      const configs = {
        a: { weight: 50 },
        b: { weight: 50 },
      };
      const report = Report.aggregate(results, configs);
      expect(report.score).toBe(50);
      expect(report.grade).toBe('D');
    });

    it('uses default weight when not configured', () => {
      const results = [
        { checker: 'a', score: 80, findings: [] },
        { checker: 'b', score: 80, findings: [] },
      ];
      const report = Report.aggregate(results);
      expect(report.score).toBe(80);
      expect(report.grade).toBe('B');
    });

    it('merges findings and counts by severity', () => {
      const results = [
        {
          checker: 'a',
          score: 70,
          findings: [
            { severity: 'critical', message: 'crit1', fixable: true },
            { severity: 'low', message: 'low1', fixable: false },
          ],
        },
        {
          checker: 'b',
          score: 90,
          findings: [
            { severity: 'high', message: 'high1', fixable: true, fix: 'fix high' },
          ],
        },
      ];
      const report = Report.aggregate(results);
      expect(report.summary.total_findings).toBe(3);
      expect(report.summary.by_severity.critical).toBe(1);
      expect(report.summary.by_severity.high).toBe(1);
      expect(report.summary.by_severity.low).toBe(1);
      expect(report.summary.fixable).toBe(2);
    });

    it('builds recommendations from critical and high findings', () => {
      const results = [
        {
          checker: 'a',
          score: 50,
          findings: [
            { severity: 'critical', message: 'Missing LICENSE', fix: 'Add LICENSE file' },
            { severity: 'low', message: 'No badge', fix: 'Add badge' },
          ],
        },
      ];
      const report = Report.aggregate(results);
      expect(report.recommendations).toContain('Add LICENSE file');
      expect(report.recommendations).not.toContain('Add badge');
    });

    it('deduplicates recommendations', () => {
      const results = [
        {
          checker: 'a',
          score: 50,
          findings: [
            { severity: 'critical', message: 'same', fix: 'same fix' },
            { severity: 'high', message: 'same2', fix: 'same fix' },
          ],
        },
      ];
      const report = Report.aggregate(results);
      expect(report.recommendations).toEqual(['same fix']);
    });

    it('includes timestamp', () => {
      const report = Report.aggregate([{ checker: 'a', score: 100, findings: [] }]);
      expect(report.timestamp).toBeTruthy();
      expect(() => new Date(report.timestamp)).not.toThrow();
    });
  });
});
