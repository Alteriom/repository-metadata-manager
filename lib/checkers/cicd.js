'use strict';

const Checker = require('../engine/Checker');

class CicdChecker extends Checker {
  constructor() {
    super({
      name: 'cicd',
      version: '2.0.0',
      description: 'Checks CI/CD configuration: workflows, triggers, pinned actions, permissions',
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

    for (const wf of workflowFiles) {
      const content = context.readFile(`.github/workflows/${wf}`);
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
      const unpinnedPattern = /uses:\s+\S+@(main|master)\b/g;
      let match;
      while ((match = unpinnedPattern.exec(content)) !== null) {
        const lines = content.substring(0, match.index).split('\n');
        findings.push({
          id: 'ci-004',
          severity: 'medium',
          message: `Unpinned action found in ${wf}: ${match[0].trim()}`,
          file: `.github/workflows/${wf}`,
          line: lines.length,
          fixable: true,
          fix: 'Pin the action to a specific SHA or version tag',
        });
        score -= 10;
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

    return this.createResult(score, findings, { workflowCount: workflowFiles.length }, startTime);
  }
}

module.exports = CicdChecker;
