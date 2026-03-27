'use strict';

const colors = require('../utils/colors');

function formatReport(report) {
  const lines = [];

  lines.push('');
  lines.push(colors.bold(`Repository Health Report`));
  lines.push(colors.dim('\u2500'.repeat(50)));
  lines.push('');

  // Overall score
  const scoreColor = report.score >= 80 ? 'green' : report.score >= 60 ? 'yellow' : 'red';
  lines.push(`  Overall Score: ${colors[scoreColor](report.score + '/100')} (${report.grade})`);
  lines.push('');

  // Per-checker scores
  lines.push(colors.bold('  Checkers:'));
  for (const [name, result] of Object.entries(report.checkers)) {
    const color = result.score >= 80 ? 'green' : result.score >= 60 ? 'yellow' : 'red';
    const findingCount = result.findings ? result.findings.length : 0;
    lines.push(`    ${name.padEnd(20)} ${colors[color](String(result.score).padStart(3))}/100 (${result.grade})  ${findingCount} findings`);
  }
  lines.push('');

  // Summary
  const s = report.summary;
  if (s.total_findings > 0) {
    lines.push(colors.bold('  Findings:'));
    if (s.by_severity.critical > 0) lines.push(`    ${colors.red('Critical:')} ${s.by_severity.critical}`);
    if (s.by_severity.high > 0) lines.push(`    ${colors.red('High:')} ${s.by_severity.high}`);
    if (s.by_severity.medium > 0) lines.push(`    ${colors.yellow('Medium:')} ${s.by_severity.medium}`);
    if (s.by_severity.low > 0) lines.push(`    ${colors.dim('Low:')} ${s.by_severity.low}`);
    if (s.fixable > 0) lines.push(`    ${colors.cyan(s.fixable + ' auto-fixable')} (run: repo-manager fix)`);
    lines.push('');
  }

  // Top recommendations
  if (report.recommendations.length > 0) {
    lines.push(colors.bold('  Recommendations:'));
    for (const rec of report.recommendations.slice(0, 5)) {
      lines.push(`    - ${rec}`);
    }
    lines.push('');
  }

  lines.push(colors.dim('\u2500'.repeat(50)));
  return lines.join('\n');
}

function formatFixResult(fixResults) {
  const lines = [];
  lines.push('');
  lines.push(colors.bold('Fix Results'));
  lines.push('');

  for (const result of fixResults) {
    if (result.applied.length > 0) {
      for (const a of result.applied) {
        lines.push(`  ${colors.green('\u2713')} [${result.checker}] ${a.action || a.id}`);
      }
    }
    for (const s of result.skipped) {
      lines.push(`  ${colors.dim('\u25CB')} [${result.checker}] Skipped: ${s.reason}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

module.exports = { formatReport, formatFixResult };
