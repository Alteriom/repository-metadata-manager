'use strict';

const Checker = require('../engine/Checker');

const REPOSITORY_ADMIN_ROLE_ID = 5;

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
    let branchRulesVerified = false;
    let branchRulesError = null;
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
        branchRulesVerified = true;
      } catch (error) {
        branchRulesError = error.message;
      }
    } else {
      branchRulesError = 'GitHub client does not support the branch-rules endpoint';
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
        branchRulesVerified,
        branchRulesError,
      }, startTime);
    }

    const desired = context.config.branchProtection || {};
    const rulesByType = new Map();
    for (const rule of branchRules) {
      if (!rulesByType.has(rule.type)) rulesByType.set(rule.type, []);
      rulesByType.get(rule.type).push(rule);
    }
    const pullRequestRules = rulesByType.get('pull_request') || [];
    const statusRules = rulesByType.get('required_status_checks') || [];
    const checks = protection && protection.required_status_checks;
    const configuredChecks = checks ? [
      ...(checks.contexts || []),
      ...(checks.checks || []).map(check => check.context),
    ] : [];
    const reviews = protection && protection.required_pull_request_reviews;
    const pullParameters = pullRequestRules.map(rule => rule.parameters || {});
    const statusParameters = statusRules.map(rule => rule.parameters || {});
    const statusCheckContexts = [...new Set([
      ...configuredChecks,
      ...statusParameters.flatMap(parameters =>
        (parameters.required_status_checks || []).map(check => check.context)
      ),
    ].filter(Boolean))].sort();

    const rulesetIds = [...new Set(branchRules.map(rule => rule.ruleset_id).filter(Boolean))];
    let rulesetAdminBypassVerified = true;
    const rulesetsWithoutAdminBypass = [];
    const unverifiableRulesets = [];
    for (const rulesetId of rulesetIds) {
      let ruleset;
      try {
        let response;
        if (typeof context.github.request === 'function') {
          response = await context.github.request('GET /repos/{owner}/{repo}/rulesets/{ruleset_id}', {
            owner,
            repo,
            ruleset_id: rulesetId,
            includes_parents: true,
          });
        } else if (typeof context.github.repos.getRepoRuleset === 'function') {
          response = await context.github.repos.getRepoRuleset({
            owner,
            repo,
            ruleset_id: rulesetId,
            includes_parents: true,
          });
        }
        ruleset = response && response.data;
      } catch { /* ruleset bypass actors require write access to the ruleset */ }

      if (!ruleset || !Array.isArray(ruleset.bypass_actors)) {
        rulesetAdminBypassVerified = false;
        unverifiableRulesets.push(rulesetId);
        continue;
      }

      const hasAdminBypass = ruleset.bypass_actors.some(actor => {
        const isAdministrator =
          actor.actor_type === 'OrganizationAdmin' ||
          (actor.actor_type === 'RepositoryRole' &&
            Number(actor.actor_id) === REPOSITORY_ADMIN_ROLE_ID);
        return isAdministrator && actor.bypass_mode !== 'pull_request';
      });
      if (!hasAdminBypass) rulesetsWithoutAdminBypass.push(rulesetId);
    }

    const classicAdminEnforcement = Boolean(
      protection && protection.enforce_admins && protection.enforce_admins.enabled
    );
    const actual = {
      statusChecks: statusCheckContexts.length > 0,
      statusCheckContexts,
      strictStatusChecks: Boolean(
        (checks && checks.strict) ||
        statusParameters.some(parameters => parameters.strict_required_status_checks_policy)
      ),
      approvals: Math.max(
        reviews ? reviews.required_approving_review_count || 0 : 0,
        ...pullParameters.map(parameters => parameters.required_approving_review_count || 0),
      ),
      codeOwnerReviews: Boolean(
        (reviews && reviews.require_code_owner_reviews) ||
        pullParameters.some(parameters => parameters.require_code_owner_review)
      ),
      conversationResolution: Boolean(
        (protection && protection.required_conversation_resolution && protection.required_conversation_resolution.enabled) ||
        rulesByType.has('required_review_thread_resolution')
      ),
      enforceAdmins: classicAdminEnforcement || rulesetsWithoutAdminBypass.length > 0,
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

    const requiredStatusCheckContexts = desired.requiredStatusCheckContexts || [];
    const missingStatusCheckContexts = requiredStatusCheckContexts.filter(
      contextName => !actual.statusCheckContexts.includes(contextName)
    );
    if (desired.requireStatusChecks === false ||
        (actual.statusChecks && missingStatusCheckContexts.length === 0)) {
      score += 12;
    } else {
      const detail = missingStatusCheckContexts.length > 0
        ? `; missing required contexts: ${missingStatusCheckContexts.join(', ')}`
        : '';
      this._finding(
        findings,
        'bp-010',
        'high',
        `Required status checks are not fully enforced on ${defaultBranch}${detail}`,
        missingStatusCheckContexts.length > 0
          ? `Require these status-check contexts on ${defaultBranch}: ${missingStatusCheckContexts.join(', ')}`
          : `Enable required status checks on ${defaultBranch}`,
      );
    }
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

    if (!rulesetAdminBypassVerified) {
      this._finding(
        findings,
        'bp-018',
        'high',
        `Administrator bypass could not be verified for ruleset(s): ${unverifiableRulesets.join(', ')}`,
        'Use a GitHub App token with write access to the applicable rulesets so bypass actors can be audited',
      );
    }

    if (!branchRulesVerified) {
      this._finding(
        findings,
        'bp-019',
        'high',
        `Applicable rulesets could not be verified for ${defaultBranch}: ${branchRulesError}`,
        'Use a current GitHub client and token that can read the effective rules for the default branch',
      );
    }

    return this.createResult(score, findings, {
      applicable: true,
      verified: branchRulesVerified && rulesetAdminBypassVerified,
      hasCi,
      defaultBranch,
      desired,
      actual,
      effectiveRuleCount: branchRules.length,
      branchRulesVerified,
      branchRulesError,
      rulesetAdminBypassVerified,
      rulesetsWithoutAdminBypass,
      unverifiableRulesets,
    }, startTime);
  }
}

module.exports = BranchProtectionChecker;
