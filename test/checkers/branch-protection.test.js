'use strict';

const path = require('path');
const BranchProtectionChecker = require('../../lib/checkers/branch-protection');
const Context = require('../../lib/engine/Context');
const Cache = require('../../lib/engine/Cache');

const fixturesDir = path.join(__dirname, '..', 'fixtures');

function buildContext(fixtureName) {
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
    it('scores >= 70 (has CODEOWNERS, PR template, CI)', async () => {
      const ctx = buildContext('healthy-project');
      const result = await checker.check(ctx);

      expect(result.score).toBeGreaterThanOrEqual(70);
    });
  });

  describe('no-ci-project', () => {
    it('scores <= 30', async () => {
      const ctx = buildContext('no-ci-project');
      const result = await checker.check(ctx);

      expect(result.score).toBeLessThanOrEqual(30);
    });
  });
});
