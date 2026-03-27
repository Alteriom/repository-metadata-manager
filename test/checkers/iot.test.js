'use strict';

const path = require('path');
const IotChecker = require('../../lib/checkers/iot');
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

describe('IotChecker', () => {
  let checker;

  beforeEach(() => {
    checker = new IotChecker();
  });

  it('has correct metadata', () => {
    expect(checker.name).toBe('iot');
    expect(checker.defaultWeight).toBe(10);
  });

  describe('iot-project', () => {
    it('scores >= 80', async () => {
      const ctx = buildContext('iot-project');
      const result = await checker.check(ctx);

      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it('is detected as IoT', async () => {
      const ctx = buildContext('iot-project');
      const result = await checker.check(ctx);

      expect(result.metadata.isIot).toBe(true);
    });
  });

  describe('healthy-project (not IoT)', () => {
    it('scores 100', async () => {
      const ctx = buildContext('healthy-project');
      const result = await checker.check(ctx);

      expect(result.score).toBe(100);
    });

    it('has info finding "Not an IoT project"', async () => {
      const ctx = buildContext('healthy-project');
      const result = await checker.check(ctx);

      const finding = result.findings.find(
        (f) => f.severity === 'info' && f.message.includes('Not an IoT project'),
      );
      expect(finding).toBeDefined();
    });

    it('is detected as not IoT', async () => {
      const ctx = buildContext('healthy-project');
      const result = await checker.check(ctx);

      expect(result.metadata.isIot).toBe(false);
    });
  });
});
