'use strict';

const path = require('path');
const LicenseChecker = require('../../lib/checkers/license');
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

describe('LicenseChecker', () => {
  let checker;

  beforeEach(() => {
    checker = new LicenseChecker();
  });

  it('has correct metadata', () => {
    expect(checker.name).toBe('license');
    expect(checker.defaultWeight).toBe(5);
  });

  describe('healthy-project', () => {
    it('scores >= 80 (has LICENSE, package.json license)', async () => {
      const ctx = buildContext('healthy-project');
      const result = await checker.check(ctx);

      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it('finds LICENSE file', async () => {
      const ctx = buildContext('healthy-project');
      const result = await checker.check(ctx);

      const finding = result.findings.find(
        (f) => f.id === 'lic-001' && f.severity === 'info',
      );
      expect(finding).toBeDefined();
    });

    it('recognizes MIT as valid SPDX identifier', async () => {
      const ctx = buildContext('healthy-project');
      const result = await checker.check(ctx);

      const finding = result.findings.find(
        (f) => f.id === 'lic-003' && f.severity === 'info',
      );
      expect(finding).toBeDefined();
    });

    it('detects LICENSE content matches declared license', async () => {
      const ctx = buildContext('healthy-project');
      const result = await checker.check(ctx);

      const finding = result.findings.find(
        (f) => f.id === 'lic-004' && f.severity === 'info',
      );
      expect(finding).toBeDefined();
    });
  });

  describe('insecure-project', () => {
    it('scores low (no license field, no LICENSE file)', async () => {
      const ctx = buildContext('insecure-project');
      const result = await checker.check(ctx);

      expect(result.score).toBeLessThan(30);
    });

    it('reports missing LICENSE file', async () => {
      const ctx = buildContext('insecure-project');
      const result = await checker.check(ctx);

      const finding = result.findings.find(
        (f) => f.id === 'lic-001' && f.severity === 'high',
      );
      expect(finding).toBeDefined();
    });

    it('reports missing license field in package.json', async () => {
      const ctx = buildContext('insecure-project');
      const result = await checker.check(ctx);

      const finding = result.findings.find(
        (f) => f.id === 'lic-002' && f.severity === 'high',
      );
      expect(finding).toBeDefined();
    });
  });
});
