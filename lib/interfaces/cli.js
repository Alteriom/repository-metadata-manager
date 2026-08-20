'use strict';

const colors = require('../utils/colors');

function formatReport(report, { verbose = false } = {}) {
  const lines = [];

  lines.push('');
  lines.push(colors.bold(`Repository Health Report`));
  lines.push(colors.dim('\u2500'.repeat(50)));
  lines.push('');

  // Overall score
  const scoreColor = report.score >= 80 ? 'green' : report.score >= 60 ? 'yellow' : 'red';
  lines.push(`  Overall Score: ${colors[scoreColor](report.score + '/100')} (${report.grade})`);
  const statusColor = report.status === 'pass' ? 'green' : 'red';
  lines.push(`  Policy Status: ${colors[statusColor](String(report.status || 'unknown').toUpperCase())}`);
  if (report.policy) lines.push(`  Policy: ${report.policy.id}@${report.policy.version}`);
  lines.push('');

  // Per-checker scores
  lines.push(colors.bold('  Checkers:'));
  for (const [name, result] of Object.entries(report.checkers)) {
    const color = result.score >= 80 ? 'green' : result.score >= 60 ? 'yellow' : 'red';
    const findingCount = result.findings ? result.findings.length : 0;
    lines.push(`    ${name.padEnd(20)} ${colors[color](String(result.score).padStart(3))}/100 (${result.grade})  ${findingCount} findings`);
  }
  lines.push('');

  // Verbose mode: show detailed findings per checker
  if (verbose) {
    lines.push(colors.bold('  Detailed Findings:'));
    for (const [name, result] of Object.entries(report.checkers)) {
      if (!result.findings || result.findings.length === 0) continue;
      lines.push('');
      lines.push(`    ${colors.bold(name)}:`);
      for (const finding of result.findings) {
        const severityColor = finding.severity === 'critical' || finding.severity === 'high' ? 'red'
          : finding.severity === 'medium' ? 'yellow'
            : finding.severity === 'info' ? 'cyan' : 'dim';
        const loc = finding.file ? (finding.line ? ` (${finding.file}:${finding.line})` : ` (${finding.file})`) : '';
        lines.push(`      ${colors[severityColor](`[${finding.severity}]`)} ${finding.message}${loc}`);
        if (finding.fix) {
          lines.push(`        ${colors.dim('Fix:')} ${finding.fix}`);
        }
      }
    }
    lines.push('');
  }

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

  const failedGates = (report.gates || []).filter(gate => !gate.passed);
  if (failedGates.length > 0) {
    lines.push(colors.bold('  Failed Gates:'));
    for (const gate of failedGates) {
      lines.push(`    ${colors.red(gate.id)}: actual ${gate.actual}, expected ${gate.expected}`);
    }
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

function formatGitHubAnnotations(report) {
  const lines = [];
  const allFindings = [];

  // Collect all findings from all checkers
  for (const [, result] of Object.entries(report.checkers)) {
    if (result.findings) {
      allFindings.push(...result.findings);
    }
  }

  for (const finding of allFindings) {
    // Skip info-level findings entirely
    if (finding.severity === 'info') continue;

    const level = finding.severity === 'critical' || finding.severity === 'high' ? 'error' : 'warning';
    if (finding.file) {
      if (finding.line) {
        lines.push(`::${level} file=${escapeProperty(finding.file)},line=${finding.line}::${escapeData(finding.message)}`);
      } else {
        lines.push(`::${level} file=${escapeProperty(finding.file)}::${escapeData(finding.message)}`);
      }
    } else {
      lines.push(`::${level}::${escapeData(finding.message)}`);
    }
  }

  // Add overall score summary as a notice
  lines.push(`::notice::Repository health score: ${report.score}/100 (${report.grade})`);
  lines.push(`::notice::Repository policy status: ${String(report.status || 'unknown').toUpperCase()}`);

  return lines.join('\n');
}

function escapeData(value) {
  return String(value).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

function escapeProperty(value) {
  return escapeData(value).replace(/:/g, '%3A').replace(/,/g, '%2C');
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

module.exports = { formatReport, formatFixResult, formatGitHubAnnotations };
