'use strict';

const Checker = require('../engine/Checker');

class BranchProtectionChecker extends Checker {
  constructor() {
    super({
      name: 'branch-protection',
      version: '2.0.0',
      description: 'Checks branch protection practices: CODEOWNERS, PR template, CI, branch rules',
      defaultWeight: 15,
    });
  }

  async check(context) {
    const startTime = Date.now();
    const findings = [];
    let score = 0;

    // 1. CODEOWNERS exists
    if (context.fileExists('.github/CODEOWNERS') || context.fileExists('CODEOWNERS')) {
      score += 30;
    } else {
      findings.push({
        id: 'bp-001',
        severity: 'high',
        message: 'CODEOWNERS file is missing',
        file: '.github/CODEOWNERS',
        line: null,
        fixable: true,
        fix: 'Create a .github/CODEOWNERS file to define code ownership',
      });
    }

    // 2. PR template exists
    if (
      context.fileExists('.github/PULL_REQUEST_TEMPLATE.md') ||
      context.fileExists('.github/pull_request_template.md')
    ) {
      score += 20;
    } else {
      findings.push({
        id: 'bp-002',
        severity: 'medium',
        message: 'Pull request template is missing',
        file: '.github/PULL_REQUEST_TEMPLATE.md',
        line: null,
        fixable: true,
        fix: 'Create a .github/PULL_REQUEST_TEMPLATE.md',
      });
    }

    // 3. CI workflow exists
    const workflowFiles = context.listFiles('.github/workflows').filter(
      (f) => f.endsWith('.yml') || f.endsWith('.yaml'),
    );
    const hasCi = workflowFiles.length > 0;
    if (hasCi) {
      score += 20;
    } else {
      findings.push({
        id: 'bp-003',
        severity: 'medium',
        message: 'No CI workflows found — branch protection without CI is less effective',
        file: '.github/workflows/',
        line: null,
        fixable: false,
        fix: 'Add a CI workflow to enforce quality gates on PRs',
      });
    }

    // 4. Branch protection via API or config
    if (context.github) {
      // API available — attempt to check branch protection rules
      try {
        const gitInfo = context.gitInfo;
        if (gitInfo && gitInfo.remoteUrl) {
          const match = gitInfo.remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
          if (match) {
            const [, owner, repo] = match;
            const { data } = await context.github.repos.getBranchProtection({
              owner,
              repo,
              branch: 'main',
            });
            if (data) {
              score += 30;
            }
          }
        }
      } catch {
        // API call failed — fall through to config check
        findings.push({
          id: 'bp-004',
          severity: 'medium',
          message: 'Could not verify branch protection rules via API',
          file: null,
          line: null,
          fixable: false,
          fix: 'Enable branch protection rules on the default branch',
        });
      }
    } else {
      // No API — check for config file or use CI as proxy
      const hasProtectionConfig =
        context.fileExists('.github/branch-protection.yml') ||
        context.fileExists('.github/branch-protection.yaml') ||
        context.fileExists('.github/settings.yml');

      if (hasProtectionConfig) {
        score += 30;
      } else if (hasCi) {
        // CI exists as proxy for "probably has branch protection"
        score += 15;
        findings.push({
          id: 'bp-005',
          severity: 'low',
          message: 'No branch protection config found, but CI exists (partial credit)',
          file: null,
          line: null,
          fixable: false,
          fix: 'Add branch protection rules or a .github/settings.yml',
        });
      } else {
        findings.push({
          id: 'bp-006',
          severity: 'high',
          message: 'No branch protection configuration or CI found',
          file: null,
          line: null,
          fixable: false,
          fix: 'Enable branch protection rules on the default branch',
        });
      }
    }

    return this.createResult(score, findings, { hasCi, hasApi: !!context.github }, startTime);
  }
}

module.exports = BranchProtectionChecker;
