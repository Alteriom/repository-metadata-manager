'use strict';

const path = require('path');
const BranchProtectionChecker = require('../../lib/checkers/branch-protection');
const Context = require('../../lib/engine/Context');
const Cache = require('../../lib/engine/Cache');

const fixturesDir = path.join(__dirname, '..', 'fixtures');

function buildContext(fixtureName, overrides = {}) {
  const projectRoot = path.join(fixturesDir, fixtureName);
  const packageJson = Context.readPackageJson(projectRoot);
  return new Context({
    projectRoot,
    projectType: Context.detectProjectType(projectRoot),
    github: null,
    packageJson,
    gitInfo: null,
    config: {},
    cache: new Cache(),
    ...overrides,
  });
}

describe('BranchProtectionChecker', () => {
  let checker;

  beforeEach(() => {
    checker = new BranchProtectionChecker();
  });

  it('has correct metadata', () => {
    expect(checker.name).toBe('branch-protection');
    expect(checker.defaultWeight).toBe(15);
  });

  describe('healthy-project', () => {
    it('scores local controls but does not claim unverified API protection', async () => {
      const ctx = buildContext('healthy-project');
      const result = await checker.check(ctx);

      expect(result.score).toBe(40);
      expect(result.metadata.verified).toBe(false);
      expect(result.findings.some(finding => finding.id === 'bp-004')).toBe(true);
    });
  });

  describe('no-ci-project', () => {
    it('scores <= 30', async () => {
      const ctx = buildContext('no-ci-project');
      const result = await checker.check(ctx);

      expect(result.score).toBeLessThanOrEqual(30);
    });
  });

  describe('GitHub protection evaluation', () => {
    it('awards full credit only when the effective controls meet policy', async () => {
      const ctx = buildContext('healthy-project', {
        gitInfo: { owner: 'example', repo: 'healthy', branch: 'feature' },
        githubRepo: { default_branch: 'trunk' },
        github: {
          repos: {
            getBranchProtection: jest.fn().mockResolvedValue({ data: {
              required_status_checks: { strict: true, contexts: ['ci'], checks: [] },
              required_pull_request_reviews: { required_approving_review_count: 1, require_code_owner_reviews: true },
              required_conversation_resolution: { enabled: true },
              enforce_admins: { enabled: true },
              required_signatures: { enabled: false },
              required_linear_history: { enabled: false },
            } }),
          },
        },
        config: {
          branchProtection: {
            requiredApprovals: 1,
            requireStatusChecks: true,
            requireStrictStatusChecks: true,
            requireCodeOwnerReviews: true,
            requireConversationResolution: true,
            enforceAdmins: true,
            requireSignedCommits: false,
            requireLinearHistory: false,
          },
        },
      });

      const result = await checker.check(ctx);
      expect(result.score).toBe(100);
      expect(result.metadata.defaultBranch).toBe('trunk');
      expect(result.metadata.verified).toBe(true);
    });

    it('reports weak controls instead of treating any protection object as compliant', async () => {
      const ctx = buildContext('healthy-project', {
        gitInfo: { owner: 'example', repo: 'healthy', branch: 'main' },
        githubRepo: { default_branch: 'main' },
        github: { repos: { getBranchProtection: jest.fn().mockResolvedValue({ data: {
          required_status_checks: { strict: false, contexts: [], checks: [] },
          required_pull_request_reviews: { required_approving_review_count: 0, require_code_owner_reviews: false },
          required_conversation_resolution: { enabled: true },
          enforce_admins: { enabled: false },
          required_signatures: { enabled: false },
          required_linear_history: { enabled: false },
        } }) } },
        config: {
          branchProtection: {
            requiredApprovals: 1, requireStatusChecks: true, requireStrictStatusChecks: true,
            requireCodeOwnerReviews: true, requireConversationResolution: true, enforceAdmins: true,
            requireSignedCommits: false, requireLinearHistory: false,
          },
        },
      });

      const result = await checker.check(ctx);
      expect(result.score).toBeLessThan(70);
      expect(result.findings.some(finding => finding.id === 'bp-010' && finding.severity === 'high')).toBe(true);
      expect(result.findings.some(finding => finding.id === 'bp-012' && finding.severity === 'high')).toBe(true);
    });

    it('requires every configured status-check context by exact name', async () => {
      const ctx = buildContext('healthy-project', {
        gitInfo: { owner: 'example', repo: 'healthy', branch: 'main' },
        githubRepo: { default_branch: 'main' },
        github: { repos: { getBranchProtection: jest.fn().mockResolvedValue({ data: {
          required_status_checks: { strict: true, contexts: ['unrelated-check'], checks: [] },
          required_pull_request_reviews: { required_approving_review_count: 0, require_code_owner_reviews: false },
          required_conversation_resolution: { enabled: true },
          enforce_admins: { enabled: false },
        } }) } },
        config: {
          branchProtection: {
            requiredApprovals: 0,
            requireStatusChecks: true,
            requiredStatusCheckContexts: ['ci', 'security'],
            requireStrictStatusChecks: true,
            requireCodeOwnerReviews: false,
            requireConversationResolution: true,
            enforceAdmins: false,
            requireSignedCommits: false,
            requireLinearHistory: false,
          },
        },
      });

      const result = await checker.check(ctx);
      expect(result.metadata.actual.statusCheckContexts).toEqual(['unrelated-check']);
      expect(result.findings).toContainEqual(expect.objectContaining({
        id: 'bp-010',
        severity: 'high',
        message: expect.stringContaining('missing required contexts: ci, security'),
      }));
    });

    it('aggregates pull-request and status-check controls across every applicable ruleset', async () => {
      const branchRules = [
        {
          type: 'pull_request',
          ruleset_id: 101,
          parameters: { required_approving_review_count: 0, require_code_owner_review: false },
        },
        {
          type: 'pull_request',
          ruleset_id: 102,
          parameters: { required_approving_review_count: 2, require_code_owner_review: true },
        },
        {
          type: 'required_status_checks',
          ruleset_id: 101,
          parameters: {
            strict_required_status_checks_policy: false,
            required_status_checks: [{ context: 'ci' }],
          },
        },
        {
          type: 'required_status_checks',
          ruleset_id: 102,
          parameters: {
            strict_required_status_checks_policy: true,
            required_status_checks: [{ context: 'security' }],
          },
        },
      ];
      const ctx = buildContext('healthy-project', {
        gitInfo: { owner: 'example', repo: 'healthy', branch: 'main' },
        githubRepo: { default_branch: 'main' },
        github: {
          request: jest.fn().mockResolvedValue({ data: {
            bypass_actors: [{ actor_id: 5, actor_type: 'RepositoryRole', bypass_mode: 'always' }],
          } }),
          repos: {
            getBranchProtection: jest.fn().mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 })),
            getBranchRules: jest.fn().mockResolvedValue({ data: branchRules }),
          },
        },
        config: {
          branchProtection: {
            requiredApprovals: 0,
            maximumRequiredApprovals: 0,
            requireStatusChecks: true,
            requiredStatusCheckContexts: ['ci', 'security'],
            requireStrictStatusChecks: true,
            requireCodeOwnerReviews: false,
            prohibitCodeOwnerReviews: true,
            requireConversationResolution: false,
            enforceAdmins: false,
            prohibitAdminEnforcement: true,
            requireSignedCommits: false,
            requireLinearHistory: false,
          },
        },
      });

      const result = await checker.check(ctx);
      expect(result.metadata.actual).toMatchObject({
        approvals: 2,
        codeOwnerReviews: true,
        statusCheckContexts: ['ci', 'security'],
        strictStatusChecks: true,
        enforceAdmins: false,
      });
      expect(result.findings).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'bp-012', severity: 'high' }),
        expect.objectContaining({ id: 'bp-013', severity: 'high' }),
      ]));
      expect(ctx.github.request).toHaveBeenCalledTimes(2);
    });

    it('fails closed when ruleset administrator bypass actors cannot be audited', async () => {
      const ctx = buildContext('healthy-project', {
        gitInfo: { owner: 'example', repo: 'healthy', branch: 'main' },
        githubRepo: { default_branch: 'main' },
        github: {
          request: jest.fn().mockResolvedValue({ data: { id: 101 } }),
          repos: {
            getBranchProtection: jest.fn().mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 })),
            getBranchRules: jest.fn().mockResolvedValue({ data: [{
              type: 'pull_request',
              ruleset_id: 101,
              parameters: { required_approving_review_count: 0 },
            }] }),
          },
        },
        config: {
          branchProtection: {
            requiredApprovals: 0,
            requireStatusChecks: false,
            requireStrictStatusChecks: false,
            requireCodeOwnerReviews: false,
            requireConversationResolution: false,
            enforceAdmins: false,
            prohibitAdminEnforcement: true,
            requireSignedCommits: false,
            requireLinearHistory: false,
          },
        },
      });

      const result = await checker.check(ctx);
      expect(result.metadata.verified).toBe(false);
      expect(result.metadata.unverifiableRulesets).toEqual([101]);
      expect(result.findings).toContainEqual(expect.objectContaining({
        id: 'bp-018',
        severity: 'high',
      }));
    });

    it('treats a ruleset without an organization-admin bypass as admin enforcement', async () => {
      const ctx = buildContext('healthy-project', {
        gitInfo: { owner: 'example', repo: 'healthy', branch: 'main' },
        githubRepo: { default_branch: 'main' },
        github: {
          request: jest.fn().mockResolvedValue({ data: { bypass_actors: [] } }),
          repos: {
            getBranchProtection: jest.fn().mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 })),
            getBranchRules: jest.fn().mockResolvedValue({ data: [{
              type: 'pull_request',
              ruleset_id: 101,
              parameters: { required_approving_review_count: 0 },
            }] }),
          },
        },
        config: {
          branchProtection: {
            requiredApprovals: 0,
            requireStatusChecks: false,
            requireStrictStatusChecks: false,
            requireCodeOwnerReviews: false,
            requireConversationResolution: false,
            enforceAdmins: false,
            prohibitAdminEnforcement: true,
            requireSignedCommits: false,
            requireLinearHistory: false,
          },
        },
      });

      const result = await checker.check(ctx);
      expect(result.metadata.verified).toBe(true);
      expect(result.metadata.actual.enforceAdmins).toBe(true);
      expect(result.metadata.rulesetsWithoutAdminBypass).toEqual([101]);
      expect(result.findings).toContainEqual(expect.objectContaining({
        id: 'bp-015',
        severity: 'high',
      }));
    });

    it('fails when live approvals exceed the configured maximum', async () => {
      const ctx = buildContext('healthy-project', {
        gitInfo: { owner: 'example', repo: 'healthy', branch: 'main' },
        githubRepo: { default_branch: 'main' },
        github: { repos: { getBranchProtection: jest.fn().mockResolvedValue({ data: {
          required_status_checks: { strict: true, contexts: ['ci'], checks: [] },
          required_pull_request_reviews: { required_approving_review_count: 1, require_code_owner_reviews: false },
          required_conversation_resolution: { enabled: true },
          enforce_admins: { enabled: false },
          required_signatures: { enabled: false },
          required_linear_history: { enabled: false },
        } }) } },
        config: {
          branchProtection: {
            requiredApprovals: 0, maximumRequiredApprovals: 0,
            requireStatusChecks: true, requireStrictStatusChecks: true,
            requireCodeOwnerReviews: false, requireConversationResolution: true, enforceAdmins: false,
            requireSignedCommits: false, requireLinearHistory: false,
          },
        },
      });

      const result = await checker.check(ctx);
      expect(result.metadata.verified).toBe(true);
      expect(result.findings).toContainEqual(expect.objectContaining({
        id: 'bp-012',
        severity: 'high',
        message: 'Required approvals are 1; policy requires 0 to 0',
      }));
    });

    it('fails when controls prohibited by a solo profile are enabled', async () => {
      const ctx = buildContext('healthy-project', {
        gitInfo: { owner: 'example', repo: 'healthy', branch: 'main' },
        githubRepo: { default_branch: 'main' },
        github: { repos: { getBranchProtection: jest.fn().mockResolvedValue({ data: {
          required_status_checks: { strict: true, contexts: ['ci'], checks: [] },
          required_pull_request_reviews: { required_approving_review_count: 0, require_code_owner_reviews: true },
          required_conversation_resolution: { enabled: true },
          enforce_admins: { enabled: true },
          required_signatures: { enabled: false },
          required_linear_history: { enabled: false },
        } }) } },
        config: {
          branchProtection: {
            requiredApprovals: 0, maximumRequiredApprovals: 0,
            requireStatusChecks: true, requireStrictStatusChecks: true,
            requireCodeOwnerReviews: false, prohibitCodeOwnerReviews: true,
            requireConversationResolution: true,
            enforceAdmins: false, prohibitAdminEnforcement: true,
            requireSignedCommits: false, requireLinearHistory: false,
          },
        },
      });

      const result = await checker.check(ctx);
      expect(result.metadata.verified).toBe(true);
      expect(result.findings).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'bp-013', severity: 'high' }),
        expect.objectContaining({ id: 'bp-015', severity: 'high' }),
      ]));
    });
  });
});
