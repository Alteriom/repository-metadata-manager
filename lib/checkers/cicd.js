'use strict';

const Checker = require('../engine/Checker');

class CicdChecker extends Checker {
  constructor() {
    super({
      name: 'cicd',
      version: '2.1.0',
      description: 'Checks CI/CD configuration: workflows, triggers, pinned actions, permissions, security, matrix testing',
      defaultWeight: 20,
    });
  }

  async check(context) {
    const startTime = Date.now();
    const findings = [];
    let score = 100;

    // 1. Check for .github/workflows/ directory with at least one .yml file
    const workflowFiles = context.listFiles('.github/workflows').filter(
      (f) => f.endsWith('.yml') || f.endsWith('.yaml'),
    );
    const filesToAudit = workflowFiles.map(file => `.github/workflows/${file}`);
    const workflowTemplates = context.listFiles('.github/workflow-templates').filter(file => /\.ya?ml$/i.test(file));
    filesToAudit.push(...workflowTemplates.map(file => `.github/workflow-templates/${file}`));
    if (context.fileExists('action.yml')) filesToAudit.push('action.yml');
    if (context.fileExists('action.yaml')) filesToAudit.push('action.yaml');

    if (workflowFiles.length === 0) {
      findings.push({
        id: 'ci-001',
        severity: 'critical',
        message: 'No CI/CD workflows found',
        file: '.github/workflows/',
        line: null,
        fixable: true,
        fix: 'Create a GitHub Actions workflow in .github/workflows/',
      });
      return this.createResult(0, findings, { workflowCount: 0 }, startTime);
    }

    // 2. Parse each workflow file
    let hasTriggersAcrossAll = false;
    let hasPermissionsAcrossAll = false;
    let hasMatrixTesting = false;
    let hasTestStep = false;

    for (const workflowPath of filesToAudit) {
      const wf = workflowPath.split('/').pop();
      const content = context.readFile(workflowPath);
      if (!content) continue;

      // Check for triggers
      if (/on:\s*(pull_request|push|\[)/m.test(content)) {
        hasTriggersAcrossAll = true;
      }

      // Check for permissions block
      if (/^permissions:/m.test(content)) {
        hasPermissionsAcrossAll = true;
      }

      // Check for unpinned actions
      const unpinnedPattern = /uses:\s+([^\s@]+)@([^\s#]+)/g;
      let match;
      while ((match = unpinnedPattern.exec(content)) !== null) {
        if (match[1].startsWith('./') || match[1].startsWith('docker://') || /^[a-f0-9]{40}$/i.test(match[2])) continue;
        const lines = content.substring(0, match.index).split('\n');
        findings.push({
          id: 'ci-004',
          severity: 'medium',
          message: `Action is not pinned to an immutable commit in ${wf}: ${match[0].trim()}`,
          file: workflowPath,
          line: lines.length,
          fixable: true,
          fix: 'Pin the action to a full commit SHA and keep the release tag in a comment',
        });
        score -= 10;
      }

      // Workflow security audit: check for command injection patterns
      // ${{ github.event. in run: blocks is a command injection risk
      const lines = content.split('\n');
      let inRunBlock = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^\s*run:\s*/.test(line)) {
          inRunBlock = true;
        } else if (/^\s*\w+:/.test(line) && !/^\s*run:/.test(line)) {
          inRunBlock = false;
        }

        if (inRunBlock && /\$\{\{\s*(?:github\.event\.|inputs\.)/.test(line)) {
          findings.push({
            id: 'ci-005',
            severity: 'high',
            message: `Command injection risk in ${wf}: untrusted expression interpolated in run block`,
            file: workflowPath,
            line: i + 1,
            fixable: false,
            fix: 'Pass expression values through an environment variable and validate them before use',
          });
          score -= 15;
        }
      }

      // Matrix testing detection
      if (/strategy:\s*\n\s*matrix:/m.test(content) || /strategy:.*matrix/m.test(content)) {
        hasMatrixTesting = true;
      }

      // Test step detection
      if (/name:.*test/im.test(content) || /run:.*npm\s+test/m.test(content)) {
        hasTestStep = true;
      }
    }

    if (!hasTriggersAcrossAll) {
      findings.push({
        id: 'ci-002',
        severity: 'high',
        message: 'No workflow triggers (on: push/pull_request) found across all workflows',
        file: '.github/workflows/',
        line: null,
        fixable: false,
        fix: 'Add trigger configuration to at least one workflow',
      });
      score -= 15;
    }

    if (!hasPermissionsAcrossAll) {
      findings.push({
        id: 'ci-003',
        severity: 'low',
        message: 'No "permissions:" block found in any workflow',
        file: '.github/workflows/',
        line: null,
        fixable: true,
        fix: 'Add explicit permissions to workflows for least-privilege',
      });
      score -= 5;
    }

    // Matrix testing bonus
    if (hasMatrixTesting) {
      findings.push({
        id: 'ci-006',
        severity: 'info',
        message: 'Matrix testing detected — testing across multiple configurations',
        file: '.github/workflows/',
        line: null,
        fixable: false,
        fix: null,
      });
      score += 5;
    }

    // Test step check
    if (!hasTestStep) {
      findings.push({
        id: 'ci-007',
        severity: 'medium',
        message: 'No test step found in any workflow',
        file: '.github/workflows/',
        line: null,
        fixable: true,
        fix: 'Add a test step (e.g., npm test) to your CI workflow',
      });
      score -= 10;
    }

    return this.createResult(score, findings, { workflowCount: workflowFiles.length, auditedFiles: filesToAudit.length }, startTime);
  }
}

module.exports = CicdChecker;
