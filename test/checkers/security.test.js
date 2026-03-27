'use strict';

const path = require('path');
const SecurityChecker = require('../../lib/checkers/security');
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

describe('SecurityChecker', () => {
  let checker;

  beforeEach(() => {
    checker = new SecurityChecker();
  });

  it('has correct metadata', () => {
    expect(checker.name).toBe('security');
    expect(checker.defaultWeight).toBe(30);
  });

  describe('healthy-project', () => {
    it('scores >= 80 with no critical findings', async () => {
      const ctx = buildContext('healthy-project');
      const result = await checker.check(ctx);

      expect(result.score).toBeGreaterThanOrEqual(80);
      const criticals = result.findings.filter((f) => f.severity === 'critical');
      expect(criticals).toHaveLength(0);
    });
  });

  describe('insecure-project', () => {
    it('scores < 50', async () => {
      const ctx = buildContext('insecure-project');
      const result = await checker.check(ctx);

      expect(result.score).toBeLessThan(50);
    });

    it('finds .env file (critical)', async () => {
      const ctx = buildContext('insecure-project');
      const result = await checker.check(ctx);

      const envFinding = result.findings.find(
        (f) => f.severity === 'critical' && f.file === '.env',
      );
      expect(envFinding).toBeDefined();
    });

    it('finds missing .gitignore (high)', async () => {
      const ctx = buildContext('insecure-project');
      const result = await checker.check(ctx);

      const gitignoreFinding = result.findings.find(
        (f) => f.id === 'sec-003' && f.severity === 'high',
      );
      expect(gitignoreFinding).toBeDefined();
    });

    it('finds missing SECURITY.md (high)', async () => {
      const ctx = buildContext('insecure-project');
      const result = await checker.check(ctx);

      const securityFinding = result.findings.find(
        (f) => f.id === 'sec-001' && f.severity === 'high',
      );
      expect(securityFinding).toBeDefined();
    });
  });

  describe('secret scanning', () => {
    it('finds AWS key pattern in config.js', async () => {
      const ctx = buildContext('insecure-project');
      const result = await checker.check(ctx);

      const secretFinding = result.findings.find(
        (f) => f.id === 'sec-010' && f.message.includes('AWS Key'),
      );
      expect(secretFinding).toBeDefined();
      expect(secretFinding.severity).toBe('critical');
      expect(secretFinding.file).toBe('config.js');
    });

    it('finds connection string pattern in config.js', async () => {
      const ctx = buildContext('insecure-project');
      const result = await checker.check(ctx);

      const secretFinding = result.findings.find(
        (f) => f.id === 'sec-010' && f.message.includes('Connection String'),
      );
      expect(secretFinding).toBeDefined();
      expect(secretFinding.severity).toBe('critical');
    });

    it('does not find secrets in healthy-project', async () => {
      const ctx = buildContext('healthy-project');
      const result = await checker.check(ctx);

      const secretFindings = result.findings.filter((f) => f.id === 'sec-010');
      expect(secretFindings).toHaveLength(0);
    });
  });

  describe('npm audit integration', () => {
    it('reports critical CVEs from cached audit', async () => {
      const cache = new Cache();
      cache.set('npm-audit', {
        vulnerabilities: {
          'bad-pkg': { severity: 'critical' },
          'worse-pkg': { severity: 'high' },
        },
      });
      const ctx = buildContext('healthy-project', { cache });
      const result = await checker.check(ctx);

      const critFinding = result.findings.find((f) => f.id === 'sec-011');
      expect(critFinding).toBeDefined();
      expect(critFinding.severity).toBe('critical');

      const highFinding = result.findings.find((f) => f.id === 'sec-012');
      expect(highFinding).toBeDefined();
      expect(highFinding.severity).toBe('high');
    });

    it('handles null audit result gracefully', async () => {
      const cache = new Cache();
      cache.set('npm-audit', null);
      const ctx = buildContext('healthy-project', { cache });
      const result = await checker.check(ctx);

      const auditFindings = result.findings.filter(
        (f) => f.id === 'sec-011' || f.id === 'sec-012',
      );
      expect(auditFindings).toHaveLength(0);
    });
  });

  describe('fix()', () => {
    it('creates .gitignore when missing', async () => {
      const fs = require('fs');
      const tmpDir = path.join(fixturesDir, '__tmp_sec_fix');
      fs.mkdirSync(tmpDir, { recursive: true });

      try {
        const ctx = buildContext('insecure-project');
        ctx.projectRoot = tmpDir;

        const fixFindings = [{ id: 'sec-003', severity: 'high', message: '.gitignore is missing' }];
        const fixResult = await checker.fix(ctx, fixFindings);

        expect(fixResult.applied).toHaveLength(1);
        expect(fixResult.applied[0].id).toBe('sec-003');
        expect(fs.existsSync(path.join(tmpDir, '.gitignore'))).toBe(true);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
