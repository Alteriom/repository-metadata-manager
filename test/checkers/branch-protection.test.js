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
  });
});
