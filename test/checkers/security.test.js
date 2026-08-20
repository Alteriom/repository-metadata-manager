'use strict';

const path = require('path');
const childProcess = require('child_process');
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

    it('scans nested source files while allowing documented example env files', async () => {
      const fs = require('fs');
      const os = require('os');
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-manager-security-'));
      fs.mkdirSync(path.join(root, 'src'));
      fs.writeFileSync(path.join(root, '.env.example'), 'GITHUB_TOKEN=replace_me\n');
      const syntheticAwsKey = ['AKIA', '1234567890ABCDEF'].join('');
      fs.writeFileSync(path.join(root, 'src', 'config.js'), `const key = "${syntheticAwsKey}";\n`);
      fs.writeFileSync(path.join(root, '.gitignore'), '.env\n.env*\n');
      fs.writeFileSync(path.join(root, 'SECURITY.md'), 'Report vulnerabilities privately using the documented security process.');

      try {
        const ctx = new Context({
          projectRoot: root,
          projectType: 'generic',
          github: null,
          packageJson: null,
          gitInfo: null,
          config: { security: { ignoredDirectories: [], ignoredPaths: [], maxFileSizeBytes: 1048576 } },
          cache: new Cache(),
        });
        const result = await checker.check(ctx);
        expect(result.findings.some(finding => finding.file === 'src/config.js' && finding.id === 'sec-010')).toBe(true);
        expect(result.findings.some(finding => finding.file === '.env.example' && finding.id === 'sec-005')).toBe(false);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  });

  describe('npm audit integration', () => {
    it('runs npm audit without inherited credentials or candidate registry control', async () => {
      const previousGitHubToken = process.env.GITHUB_TOKEN;
      const previousRuntimeToken = process.env.ACTIONS_RUNTIME_TOKEN;
      const credentialSentinel = String(process.pid);
      process.env.GITHUB_TOKEN = credentialSentinel;
      process.env.ACTIONS_RUNTIME_TOKEN = credentialSentinel;
      const audit = jest.spyOn(childProcess, 'execSync').mockReturnValue(JSON.stringify({
        vulnerabilities: {},
      }));

      try {
        const ctx = buildContext('healthy-project', { cache: new Cache() });
        await checker.check(ctx);

        expect(audit).toHaveBeenCalledTimes(1);
        const [command, options] = audit.mock.calls[0];
        expect(command).toContain('--registry=https://registry.npmjs.org/');
        expect(command).toContain('--ignore-scripts');
        expect(options.env.GITHUB_TOKEN).toBeUndefined();
        expect(options.env.ACTIONS_RUNTIME_TOKEN).toBeUndefined();
        expect(options.env.NPM_CONFIG_REGISTRY).toBe('https://registry.npmjs.org/');
        expect(options.env.HOME).toBe(options.env.USERPROFILE);
        expect(options.env.HOME).not.toBe(process.env.HOME);
      } finally {
        audit.mockRestore();
        if (previousGitHubToken === undefined) delete process.env.GITHUB_TOKEN;
        else process.env.GITHUB_TOKEN = previousGitHubToken;
        if (previousRuntimeToken === undefined) delete process.env.ACTIONS_RUNTIME_TOKEN;
        else process.env.ACTIONS_RUNTIME_TOKEN = previousRuntimeToken;
      }
    });

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

    it('reports when npm audit cannot be verified', async () => {
      const cache = new Cache();
      cache.set('npm-audit', null);
      const ctx = buildContext('healthy-project', { cache });
      const result = await checker.check(ctx);

      expect(result.findings.some(finding => finding.id === 'sec-013')).toBe(true);
    });
  });

  describe('plan()', () => {
    it('plans .gitignore creation without changing the repository', async () => {
      const ctx = buildContext('insecure-project');
      const result = await checker.plan(ctx, [{ id: 'sec-003' }]);

      expect(result.operations).toHaveLength(1);
      expect(result.operations[0]).toEqual(expect.objectContaining({
        type: 'write-file',
        path: '.gitignore',
        beforeHash: null,
      }));
      expect(ctx.fileExists('.gitignore')).toBe(false);
    });
  });
});
