'use strict';

const path = require('path');
const Context = require('../../lib/engine/Context');

const FIXTURES = path.join(__dirname, '..', 'fixtures');

describe('Context', () => {
  describe('detectProjectType()', () => {
    it('detects node projects', () => {
      expect(Context.detectProjectType(path.join(FIXTURES, 'healthy-project'))).toBe('node');
    });

    it('detects iot projects', () => {
      expect(Context.detectProjectType(path.join(FIXTURES, 'iot-project'))).toBe('iot');
    });

    it('returns generic for unknown projects', () => {
      expect(Context.detectProjectType(path.join(FIXTURES))).toBe('generic');
    });
  });

  describe('readPackageJson()', () => {
    it('reads and parses package.json', () => {
      const pkg = Context.readPackageJson(path.join(FIXTURES, 'healthy-project'));
      expect(pkg.name).toBe('healthy-project');
      expect(pkg.version).toBe('1.0.0');
    });

    it('returns null when package.json is missing', () => {
      const pkg = Context.readPackageJson(path.join(FIXTURES, 'iot-project'));
      expect(pkg).toBeNull();
    });
  });

  describe('readGitInfo()', () => {
    it('returns null when .git is missing', () => {
      const info = Context.readGitInfo(path.join(FIXTURES, 'healthy-project'));
      expect(info).toBeNull();
    });
  });

  describe('build()', () => {
    it('builds context for a node project', async () => {
      const ctx = await Context.build({ projectRoot: path.join(FIXTURES, 'healthy-project') });
      expect(ctx.projectType).toBe('node');
      expect(ctx.packageJson.name).toBe('healthy-project');
      expect(ctx.cache).toBeTruthy();
      expect(ctx.config).toEqual({});
    });

    it('builds context for an iot project', async () => {
      const ctx = await Context.build({ projectRoot: path.join(FIXTURES, 'iot-project') });
      expect(ctx.projectType).toBe('iot');
      expect(ctx.packageJson).toBeNull();
    });
  });

  describe('instance methods', () => {
    let ctx;

    beforeAll(async () => {
      ctx = await Context.build({ projectRoot: path.join(FIXTURES, 'healthy-project') });
    });

    it('fileExists returns true for existing files', () => {
      expect(ctx.fileExists('package.json')).toBe(true);
      expect(ctx.fileExists('LICENSE')).toBe(true);
    });

    it('fileExists returns false for missing files', () => {
      expect(ctx.fileExists('nonexistent.txt')).toBe(false);
    });

    it('readFile returns file content', () => {
      const content = ctx.readFile('SECURITY.md');
      expect(content).toContain('Reporting Vulnerabilities');
    });

    it('readFile returns null for missing files', () => {
      expect(ctx.readFile('nonexistent.txt')).toBeNull();
    });

    it('listFiles returns directory contents', () => {
      const files = ctx.listFiles('.github');
      expect(files).toContain('workflows');
      expect(files).toContain('CODEOWNERS');
      expect(files).toContain('dependabot.yml');
    });

    it('listFiles returns empty array for missing directories', () => {
      expect(ctx.listFiles('nonexistent')).toEqual([]);
    });

    it('getCheckerConfig returns empty object for unknown checker', () => {
      expect(ctx.getCheckerConfig('unknown')).toEqual({});
    });
  });
});
