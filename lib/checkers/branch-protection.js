'use strict';

const Checker = require('../engine/Checker');

class BranchProtectionChecker extends Checker {
  constructor() {
    super({
      name: 'branch-protection',
      version: '3.0.0',
      description: 'Evaluates local review controls and the effective GitHub default-branch protection policy',
      defaultWeight: 15,
    });
  }

  _finding(findings, id, severity, message, fix) {
    findings.push({ id, severity, message, file: null, fix });
  }

  async check(context) {
    const startTime = Date.now();
    const findings = [];
    let score = 0;

    const hasCodeowners = context.fileExists('.github/CODEOWNERS') || context.fileExists('CODEOWNERS');
    const hasPullRequestTemplate =
      context.fileExists('.github/PULL_REQUEST_TEMPLATE.md') ||
      context.fileExists('.github/pull_request_template.md');
    const workflowFiles = context.listFiles('.github/workflows').filter(file => /\.ya?ml$/i.test(file));
    const hasCi = workflowFiles.length > 0;

    if (hasCodeowners) score += 20;
    else this._finding(findings, 'bp-001', 'high', 'CODEOWNERS file is missing', 'Create .github/CODEOWNERS');

    if (hasPullRequestTemplate) score += 10;
    else this._finding(findings, 'bp-002', 'medium', 'Pull request template is missing', 'Create .github/PULL_REQUEST_TEMPLATE.md');

    if (hasCi) score += 10;
    else this._finding(findings, 'bp-003', 'high', 'No CI workflows were found', 'Add a required CI workflow');

    const owner = context.gitInfo && context.gitInfo.owner;
    const repo = context.gitInfo && context.gitInfo.repo;
    const defaultBranch =
      (context.githubRepo && context.githubRepo.default_branch) ||
      (context.gitInfo && context.gitInfo.defaultBranch) ||
      (context.gitInfo && context.gitInfo.branch && context.gitInfo.branch !== 'HEAD' ? context.gitInfo.branch : 'main');

    if (!context.github || !owner || !repo) {
      this._finding(
        findings,
        'bp-004',
        'medium',
        'Branch protection could not be verified without authenticated GitHub repository context',
        'Run with a GitHub App or GITHUB_TOKEN that can read repository administration settings',
      );
      return this.createResult(score, findings, {
        applicable: true,
        verified: false,
        hasCi,
        defaultBranch,
        githubError: context.githubError,
      }, startTime);
    }

    let protection = null;
    let protectionError = null;
    let branchRules = [];
    try {
      const response = await context.github.repos.getBranchProtection({ owner, repo, branch: defaultBranch });
      protection = response.data;
    } catch (error) {
      protectionError = error;
    }
    if (typeof context.github.repos.getBranchRules === 'function') {
      try {
        const response = await context.github.repos.getBranchRules({ owner, repo, branch: defaultBranch });
        branchRules = response.data || [];
      } catch { /* rulesets may be unavailable to the token */ }
    }

    if (!protection && branchRules.length === 0) {
      const missing = protectionError && protectionError.status === 404;
      this._finding(
        findings,
        'bp-005',
        'high',
        missing
          ? `Default branch "${defaultBranch}" is not protected`
          : `Branch protection could not be read: ${protectionError ? protectionError.message : 'unknown error'}`,
        `Protect ${defaultBranch} using the organization baseline`,
      );
      return this.createResult(score, findings, {
        applicable: true,
        verified: false,
        hasCi,
        defaultBranch,
        apiStatus: protectionError && protectionError.status || null,
      }, startTime);
    }

    const desired = context.config.branchProtection || {};
    const rulesByType = new Map(branchRules.map(rule => [rule.type, rule]));
    const pullRequestRule = rulesByType.get('pull_request');
    const statusRule = rulesByType.get('required_status_checks');
    const checks = protection && protection.required_status_checks;
    const configuredChecks = checks && [
      ...(checks.contexts || []),
      ...(checks.checks || []).map(check => `${check.context}${check.app_id ? `@${check.app_id}` : ''}`),
    ];
    const reviews = protection && protection.required_pull_request_reviews;
    const pullParameters = pullRequestRule && pullRequestRule.parameters || {};
    const statusParameters = statusRule && statusRule.parameters || {};
    const actual = {
      statusChecks: Boolean(
        (configuredChecks && configuredChecks.length > 0) ||
        (statusParameters.required_status_checks && statusParameters.required_status_checks.length > 0)
      ),
      strictStatusChecks: Boolean((checks && checks.strict) || statusParameters.strict_required_status_checks_policy),
      approvals: Math.max(
        reviews ? reviews.required_approving_review_count || 0 : 0,
        pullParameters.required_approving_review_count || 0,
      ),
      codeOwnerReviews: Boolean(
        (reviews && reviews.require_code_owner_reviews) || pullParameters.require_code_owner_review
      ),
      conversationResolution: Boolean(
        (protection && protection.required_conversation_resolution && protection.required_conversation_resolution.enabled) ||
        rulesByType.has('required_review_thread_resolution')
      ),
      enforceAdmins: Boolean(protection && protection.enforce_admins && protection.enforce_admins.enabled),
      signedCommits: Boolean(
        (protection && protection.required_signatures && protection.required_signatures.enabled) ||
        rulesByType.has('required_signatures')
      ),
      linearHistory: Boolean(
        (protection && protection.required_linear_history && protection.required_linear_history.enabled) ||
        rulesByType.has('required_linear_history')
      ),
    };

    const booleanControl = (desiredKey, actualKey, points, id, severity, label) => {
      if (desired[desiredKey] === false || actual[actualKey]) score += points;
      else this._finding(findings, id, severity, `${label} is not enforced on ${defaultBranch}`, `Enable ${label.toLowerCase()} on ${defaultBranch}`);
    };

    const prohibitedBooleanControl = (prohibitKey, actualKey, points, id, label) => {
      if (desired[prohibitKey] !== true || !actual[actualKey]) score += points;
      else this._finding(
        findings,
        id,
        'high',
        `${label} must remain disabled on ${defaultBranch}`,
        `Disable ${label.toLowerCase()} on ${defaultBranch}`,
      );
    };

    booleanControl('requireStatusChecks', 'statusChecks', 12, 'bp-010', 'high', 'Required status checks');
    booleanControl('requireStrictStatusChecks', 'strictStatusChecks', 6, 'bp-011', 'medium', 'Strict status checks');

    const minimumApprovals = desired.requiredApprovals || 0;
    const maximumApprovals = desired.maximumRequiredApprovals;
    const approvalsInRange =
      actual.approvals >= minimumApprovals &&
      (maximumApprovals === undefined || actual.approvals <= maximumApprovals);
    if (approvalsInRange) score += 12;
    else {
      const expectedRange = maximumApprovals === undefined
        ? `at least ${minimumApprovals}`
        : `${minimumApprovals} to ${maximumApprovals}`;
      const fix = actual.approvals < minimumApprovals
        ? `Require at least ${minimumApprovals} approving review(s)`
        : `Require no more than ${maximumApprovals} approving review(s)`;
      this._finding(
        findings,
        'bp-012',
        'high',
        `Required approvals are ${actual.approvals}; policy requires ${expectedRange}`,
        fix,
      );
    }

    if (desired.prohibitCodeOwnerReviews === true) {
      prohibitedBooleanControl('prohibitCodeOwnerReviews', 'codeOwnerReviews', 8, 'bp-013', 'Code-owner reviews');
    } else {
      booleanControl('requireCodeOwnerReviews', 'codeOwnerReviews', 8, 'bp-013', 'medium', 'Code-owner reviews');
    }
    booleanControl('requireConversationResolution', 'conversationResolution', 8, 'bp-014', 'medium', 'Conversation resolution');
    if (desired.prohibitAdminEnforcement === true) {
      prohibitedBooleanControl('prohibitAdminEnforcement', 'enforceAdmins', 8, 'bp-015', 'Administrator enforcement');
    } else {
      booleanControl('enforceAdmins', 'enforceAdmins', 8, 'bp-015', 'medium', 'Administrator enforcement');
    }
    booleanControl('requireSignedCommits', 'signedCommits', 3, 'bp-016', 'low', 'Signed commits');
    booleanControl('requireLinearHistory', 'linearHistory', 3, 'bp-017', 'low', 'Linear history');

    return this.createResult(score, findings, {
      applicable: true,
      verified: true,
      hasCi,
      defaultBranch,
      desired,
      actual,
      effectiveRuleCount: branchRules.length,
    }, startTime);
  }
}

module.exports = BranchProtectionChecker;
