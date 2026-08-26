'use strict';

const path = require('path');
const DependenciesChecker = require('../../lib/checkers/dependencies');
const Context = require('../../lib/engine/Context');
const Cache = require('../../lib/engine/Cache');

const fixturesDir = path.join(__dirname, '..', 'fixtures');

function buildContext(fixtureName) {
  const projectRoot = path.join(fixturesDir, fixtureName);
  const packageJson = Context.readPackageJson(projectRoot);
  const cache = new Cache();

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

  describe('non-Node project', () => {
    it('is not applicable and emits no Node lock-file finding', async () => {
      const ctx = buildContext('iot-project');
      const result = await checker.check(ctx);

      expect(result.metadata.applicable).toBe(false);
      expect(result.score).toBe(100);
      expect(result.findings.map(finding => finding.id)).toEqual(['dep-000']);
    });
  });

});
