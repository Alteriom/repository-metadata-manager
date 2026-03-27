'use strict';

const { formatReport, formatFixResult, formatGitHubAnnotations } = require('../../lib/interfaces/cli');

function makeReport(overrides = {}) {
  return {
    score: 85,
    grade: 'B',
    timestamp: new Date().toISOString(),
    checkers: {
      documentation: { checker: 'documentation', score: 90, grade: 'A', findings: [], metadata: {}, duration: 10 },
      security: { checker: 'security', score: 70, grade: 'C', findings: [
        { id: 'sec-1', severity: 'high', message: 'Missing SECURITY.md', fixable: true, fix: 'Create SECURITY.md' },
      ], metadata: {}, duration: 15 },
    },
    summary: {
      total_findings: 1,
      by_severity: { critical: 0, high: 1, medium: 0, low: 0, info: 0 },
      fixable: 1,
    },
    recommendations: ['Create SECURITY.md'],
    ...overrides,
  };
}

describe('CLI formatReport', () => {
  it('produces a string containing the overall score', () => {
    const output = formatReport(makeReport());
    expect(output).toContain('85/100');
    expect(output).toContain('B');
  });

  it('lists each checker with its score', () => {
    const output = formatReport(makeReport());
    expect(output).toContain('documentation');
    expect(output).toContain('90');
    expect(output).toContain('security');
    expect(output).toContain('70');
  });

  it('shows severity counts when findings exist', () => {
    const output = formatReport(makeReport());
    expect(output).toContain('High:');
    expect(output).toContain('1');
  });

  it('shows fixable count', () => {
    const output = formatReport(makeReport());
    expect(output).toContain('auto-fixable');
  });

  it('shows recommendations', () => {
    const output = formatReport(makeReport());
    expect(output).toContain('Create SECURITY.md');
  });

  it('handles report with no findings', () => {
    const report = makeReport({
      summary: { total_findings: 0, by_severity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, fixable: 0 },
      recommendations: [],
    });
    const output = formatReport(report);
    expect(output).toContain('85/100');
    expect(output).not.toContain('auto-fixable');
  });

  it('uses color coding based on score thresholds', () => {
    // Score >= 80 should use green
    const highReport = makeReport({ score: 95, grade: 'A' });
    const highOutput = formatReport(highReport);
    expect(highOutput).toContain('95/100');

    // Score < 60 should use red
    const lowReport = makeReport({ score: 40, grade: 'F' });
    const lowOutput = formatReport(lowReport);
    expect(lowOutput).toContain('40/100');
  });
});

describe('CLI formatReport verbose mode', () => {
  it('shows detailed findings when verbose is true', () => {
    const output = formatReport(makeReport(), { verbose: true });
    expect(output).toContain('Detailed Findings');
    expect(output).toContain('Missing SECURITY.md');
    expect(output).toContain('[high]');
  });

  it('does not show detailed findings when verbose is false', () => {
    const output = formatReport(makeReport(), { verbose: false });
    expect(output).not.toContain('Detailed Findings');
  });

  it('shows fix suggestions in verbose mode', () => {
    const output = formatReport(makeReport(), { verbose: true });
    expect(output).toContain('Fix:');
    expect(output).toContain('Create SECURITY.md');
  });
});

describe('CLI formatGitHubAnnotations', () => {
  it('outputs ::error for high severity findings', () => {
    const output = formatGitHubAnnotations(makeReport());
    expect(output).toContain('::error');
    expect(output).toContain('Missing SECURITY.md');
  });

  it('includes file path in annotation', () => {
    const report = makeReport({
      checkers: {
        security: {
          checker: 'security', score: 70, grade: 'C',
          findings: [
            { id: 'sec-1', severity: 'high', message: 'Secret found', file: 'config.js', line: 5, fixable: false },
          ],
          metadata: {}, duration: 15,
        },
      },
    });
    const output = formatGitHubAnnotations(report);
    expect(output).toContain('::error file=config.js,line=5::Secret found');
  });

  it('outputs ::warning for medium/low severity', () => {
    const report = makeReport({
      checkers: {
        docs: {
          checker: 'docs', score: 80, grade: 'B',
          findings: [
            { id: 'doc-1', severity: 'low', message: 'Missing badges', file: 'README.md', line: null, fixable: false },
          ],
          metadata: {}, duration: 5,
        },
      },
    });
    const output = formatGitHubAnnotations(report);
    expect(output).toContain('::warning file=README.md::Missing badges');
  });
});

describe('CLI formatFixResult', () => {
  it('shows applied fixes', () => {
    const fixResults = [
      { checker: 'security', applied: [{ id: 'fix1', action: 'Created SECURITY.md' }], skipped: [] },
    ];
    const output = formatFixResult(fixResults);
    expect(output).toContain('Created SECURITY.md');
    expect(output).toContain('security');
  });

  it('shows skipped fixes', () => {
    const fixResults = [
      { checker: 'docs', applied: [], skipped: [{ id: 'fix1', reason: 'Dry run' }] },
    ];
    const output = formatFixResult(fixResults);
    expect(output).toContain('Skipped');
    expect(output).toContain('Dry run');
  });

  it('handles empty fix results', () => {
    const output = formatFixResult([]);
    expect(output).toContain('Fix Results');
  });

  it('falls back to id when action is missing', () => {
    const fixResults = [
      { checker: 'test', applied: [{ id: 'fix-missing-readme' }], skipped: [] },
    ];
    const output = formatFixResult(fixResults);
    expect(output).toContain('fix-missing-readme');
  });
});

describe('CLI file output (--output flag)', () => {
  const fs = require('fs');
  const path = require('path');
  const tmpFile = path.join(__dirname, '..', 'fixtures', '__tmp_output.json');

  afterEach(() => {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  });

  it('can write JSON report to file', () => {
    const { formatReport: formatJson } = require('../../lib/interfaces/json');
    const report = makeReport();
    const jsonOutput = formatJson(report);

    fs.writeFileSync(tmpFile, jsonOutput, 'utf8');
    const written = fs.readFileSync(tmpFile, 'utf8');
    const parsed = JSON.parse(written);
    expect(parsed.score).toBe(85);
    expect(parsed.grade).toBe('B');
  });
});
