'use strict';

const path = require('path');
const DependenciesChecker = require('../../lib/checkers/dependencies');
const Context = require('../../lib/engine/Context');
const Cache = require('../../lib/engine/Cache');

const fixturesDir = path.join(__dirname, '..', 'fixtures');

function buildContext(fixtureName, cacheOverrides = {}) {
  const projectRoot = path.join(fixturesDir, fixtureName);
  const packageJson = Context.readPackageJson(projectRoot);
  const cache = new Cache();

  // Pre-populate cache with mock npm audit result so we never run npm audit in tests
  cache.set('npm-audit', cacheOverrides.npmAudit !== undefined ? cacheOverrides.npmAudit : null);

  return new Context({
    projectRoot,
    projectType: Context.detectProjectType(projectRoot),
    github: null,
    packageJson,
    gitInfo: null,
    config: {},
    cache,
  });
}

describe('DependenciesChecker', () => {
  let checker;

  beforeEach(() => {
    checker = new DependenciesChecker();
  });

  it('has correct metadata', () => {
    expect(checker.name).toBe('dependencies');
    expect(checker.defaultWeight).toBe(10);
  });

  describe('healthy-project', () => {
    it('scores >= 70 (has lock file, license)', async () => {
      const ctx = buildContext('healthy-project');
      const result = await checker.check(ctx);

      expect(result.score).toBeGreaterThanOrEqual(70);
    });
  });

  describe('insecure-project', () => {
    it('has lower score (no license, no lock file)', async () => {
      const ctx = buildContext('insecure-project');
      const result = await checker.check(ctx);

      // insecure-project has no license, no lock file, no engines
      expect(result.score).toBeLessThan(80);
    });

    it('finds missing license', async () => {
      const ctx = buildContext('insecure-project');
      const result = await checker.check(ctx);

      const finding = result.findings.find((f) => f.id === 'dep-002');
      expect(finding).toBeDefined();
    });

    it('finds missing lock file', async () => {
      const ctx = buildContext('insecure-project');
      const result = await checker.check(ctx);

      const finding = result.findings.find((f) => f.id === 'dep-001');
      expect(finding).toBeDefined();
    });
  });

  describe('npm audit integration', () => {
    it('reports critical vulnerabilities from cached audit', async () => {
      const ctx = buildContext('healthy-project', {
        npmAudit: {
          vulnerabilities: {
            'bad-pkg': { severity: 'critical' },
            'worse-pkg': { severity: 'high' },
          },
        },
      });
      const result = await checker.check(ctx);

      const critFinding = result.findings.find((f) => f.id === 'dep-006');
      expect(critFinding).toBeDefined();
      expect(critFinding.severity).toBe('critical');

      const highFinding = result.findings.find((f) => f.id === 'dep-007');
      expect(highFinding).toBeDefined();
    });

    it('handles null audit result gracefully', async () => {
      const ctx = buildContext('healthy-project', { npmAudit: null });
      const result = await checker.check(ctx);

      // Should not crash, no audit findings
      const auditFindings = result.findings.filter(
        (f) => f.id === 'dep-006' || f.id === 'dep-007',
      );
      expect(auditFindings).toHaveLength(0);
    });
  });
});
