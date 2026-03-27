'use strict';

const path = require('path');
const DocumentationChecker = require('../../lib/checkers/documentation');
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

describe('DocumentationChecker', () => {
  let checker;

  beforeEach(() => {
    checker = new DocumentationChecker();
  });

  it('has correct metadata', () => {
    expect(checker.name).toBe('documentation');
    expect(checker.defaultWeight).toBe(25);
  });

  describe('healthy-project', () => {
    it('scores >= 90', async () => {
      const ctx = buildContext('healthy-project');
      const result = await checker.check(ctx);

      expect(result.score).toBeGreaterThanOrEqual(90);
    });
  });

  describe('undocumented-project', () => {
    it('scores < 30', async () => {
      const ctx = buildContext('undocumented-project');
      const result = await checker.check(ctx);

      expect(result.score).toBeLessThan(30);
    });

    it('finds missing CHANGELOG', async () => {
      const ctx = buildContext('undocumented-project');
      const result = await checker.check(ctx);

      const finding = result.findings.find((f) => f.id === 'doc-007');
      expect(finding).toBeDefined();
    });

    it('finds missing CONTRIBUTING', async () => {
      const ctx = buildContext('undocumented-project');
      const result = await checker.check(ctx);

      const finding = result.findings.find((f) => f.id === 'doc-009');
      expect(finding).toBeDefined();
    });

    it('finds missing LICENSE', async () => {
      const ctx = buildContext('undocumented-project');
      const result = await checker.check(ctx);

      const finding = result.findings.find((f) => f.id === 'doc-011');
      expect(finding).toBeDefined();
    });

    it('finds missing README sections', async () => {
      const ctx = buildContext('undocumented-project');
      const result = await checker.check(ctx);

      // Should find missing Installation, Usage, License sections and badges
      const sectionFindings = result.findings.filter(
        (f) => ['doc-002', 'doc-003', 'doc-004', 'doc-005', 'doc-006'].includes(f.id),
      );
      expect(sectionFindings.length).toBeGreaterThanOrEqual(3);
    });
  });
});
