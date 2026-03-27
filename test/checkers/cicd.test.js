'use strict';

const path = require('path');
const CicdChecker = require('../../lib/checkers/cicd');
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

describe('CicdChecker', () => {
  let checker;

  beforeEach(() => {
    checker = new CicdChecker();
  });

  it('has correct metadata', () => {
    expect(checker.name).toBe('cicd');
    expect(checker.defaultWeight).toBe(20);
  });

  describe('healthy-project', () => {
    it('scores >= 80', async () => {
      const ctx = buildContext('healthy-project');
      const result = await checker.check(ctx);

      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it('has no unpinned actions', async () => {
      const ctx = buildContext('healthy-project');
      const result = await checker.check(ctx);

      const unpinned = result.findings.filter((f) => f.id === 'ci-004');
      expect(unpinned).toHaveLength(0);
    });

    it('reports workflow count in metadata', async () => {
      const ctx = buildContext('healthy-project');
      const result = await checker.check(ctx);

      expect(result.metadata.workflowCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('no-ci-project', () => {
    it('scores 0', async () => {
      const ctx = buildContext('no-ci-project');
      const result = await checker.check(ctx);

      expect(result.score).toBe(0);
    });

    it('has critical finding "No CI/CD workflows found"', async () => {
      const ctx = buildContext('no-ci-project');
      const result = await checker.check(ctx);

      const finding = result.findings.find(
        (f) => f.severity === 'critical' && f.message === 'No CI/CD workflows found',
      );
      expect(finding).toBeDefined();
    });
  });

  describe('insecure-project', () => {
    it('finds unpinned action', async () => {
      const ctx = buildContext('insecure-project');
      const result = await checker.check(ctx);

      const unpinned = result.findings.filter((f) => f.id === 'ci-004');
      expect(unpinned.length).toBeGreaterThanOrEqual(1);
    });
  });
});
