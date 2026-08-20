'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const Policy = require('../policy/Policy');

class Context {
  constructor({ projectRoot, projectType, github, githubRepo, githubError, packageJson, gitInfo, config, policySource, cache }) {
    this.projectRoot = projectRoot;
    this.projectType = projectType;
    this.github = github;
    this.githubRepo = githubRepo || null;
    this.githubError = githubError || null;
    this.packageJson = packageJson;
    this.gitInfo = gitInfo;
    this.config = config;
    this.policySource = policySource;
    this.cache = cache;
  }

  static async build({ projectRoot, token, configPath }) {
    const Cache = require('./Cache');
    const cache = new Cache();

    const resolvedRoot = path.resolve(projectRoot || process.cwd());
    if (!fs.existsSync(resolvedRoot) || !fs.statSync(resolvedRoot).isDirectory()) {
      throw new Error(`Project root is not a directory: ${resolvedRoot}`);
    }

    const projectType = Context.detectProjectType(resolvedRoot);
    const packageJson = Context.readPackageJson(resolvedRoot);
    const gitInfo = Context.readGitInfo(resolvedRoot);
    const loadedPolicy = Policy.load(resolvedRoot, configPath);
    const config = loadedPolicy.policy;

    let github = null;
    let githubRepo = null;
    let githubError = null;
    if (token) {
      try {
        const { Octokit } = require('@octokit/rest');
        github = new Octokit({ auth: token });
        if (gitInfo && gitInfo.owner && gitInfo.repo) {
          const response = await github.repos.get({ owner: gitInfo.owner, repo: gitInfo.repo });
          githubRepo = response.data;
        }
      } catch (error) {
        githubError = error.message;
      }
    }

    return new Context({
      projectRoot: resolvedRoot,
      projectType,
      github,
      githubRepo,
      githubError,
      packageJson,
      gitInfo,
      config,
      policySource: loadedPolicy.source,
      cache,
    });
  }

  static detectProjectType(projectRoot) {
    if (fs.existsSync(path.join(projectRoot, 'platformio.ini'))) return 'iot';
    if (fs.existsSync(path.join(projectRoot, 'package.json'))) return 'node';
    if (fs.existsSync(path.join(projectRoot, 'requirements.txt')) ||
        fs.existsSync(path.join(projectRoot, 'pyproject.toml'))) return 'python';
    return 'generic';
  }

  static readPackageJson(projectRoot) {
    const pkgPath = path.join(projectRoot, 'package.json');
    if (!fs.existsSync(pkgPath)) return null;
    try { return JSON.parse(fs.readFileSync(pkgPath, 'utf8')); }
    catch { return null; }
  }

  static readGitInfo(projectRoot) {
    const gitDir = path.join(projectRoot, '.git');
    if (!fs.existsSync(gitDir)) return null;
    try {
      // Safe: no user input in these commands, only hardcoded git operations
      const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: projectRoot, encoding: 'utf8' }).trim();
      const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: projectRoot, encoding: 'utf8' }).trim();
      let remoteUrl = '';
      try { remoteUrl = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: projectRoot, encoding: 'utf8' }).trim(); } catch { /* no remote */ }
      let defaultBranch = null;
      try {
        const symbolic = execFileSync('git', ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], { cwd: projectRoot, encoding: 'utf8' }).trim();
        defaultBranch = symbolic.replace(/^origin\//, '');
      } catch { /* remote HEAD not configured */ }
      const remote = Context.parseGitHubRemote(remoteUrl);
      return { branch, commit, remoteUrl, defaultBranch, ...remote };
    } catch { return null; }
  }

  static parseGitHubRemote(remoteUrl) {
    if (!remoteUrl) return { owner: null, repo: null };
    const match = remoteUrl.match(/github\.com(?::|\/)([^/]+)\/(.+?)(?:\.git)?$/i);
    if (!match) return { owner: null, repo: null };
    return { owner: match[1], repo: match[2].replace(/\.git$/i, '') };
  }

  static loadConfig(projectRoot, configPath) {
    return Policy.load(projectRoot, configPath).policy;
  }

  getCheckerConfig(checkerName) {
    const checkerConfigs = (this.config && this.config.checkers) || {};
    return checkerConfigs[checkerName] || {};
  }

  fileExists(relativePath) {
    return fs.existsSync(this.resolvePath(relativePath));
  }

  readFile(relativePath) {
    const fullPath = this.resolvePath(relativePath);
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath, 'utf8');
  }

  listFiles(relativeDir) {
    const fullPath = this.resolvePath(relativeDir);
    if (!fs.existsSync(fullPath)) return [];
    try { return fs.readdirSync(fullPath); } catch { return []; }
  }

  resolvePath(relativePath) {
    const resolved = path.resolve(this.projectRoot, relativePath);
    if (resolved !== this.projectRoot && !resolved.startsWith(`${this.projectRoot}${path.sep}`)) {
      throw new Error(`Path escapes project root: ${relativePath}`);
    }
    return resolved;
  }

  walkFiles({ extensions = null, includeNames = [], ignoredDirectories = [], ignoredPaths = [], maxFileSizeBytes = Infinity } = {}) {
    const results = [];
    const ignored = new Set(ignoredDirectories);
    const visit = (relativeDir) => {
      const directory = this.resolvePath(relativeDir || '.');
      let entries;
      try { entries = fs.readdirSync(directory, { withFileTypes: true }); } catch { return; }
      for (const entry of entries) {
        if (entry.isSymbolicLink()) continue;
        const relative = relativeDir && relativeDir !== '.' ? `${relativeDir}/${entry.name}` : entry.name;
        if (ignoredPaths.some(ignoredPath => relative === ignoredPath || relative.startsWith(`${ignoredPath}/`))) continue;
        if (entry.isDirectory()) {
          if (!ignored.has(entry.name)) visit(relative);
          continue;
        }
        if (!entry.isFile()) continue;
        const extensionMatches = !extensions || extensions.includes(path.extname(entry.name).toLowerCase());
        if (!extensionMatches && !includeNames.includes(entry.name)) continue;
        try {
          if (fs.statSync(this.resolvePath(relative)).size <= maxFileSizeBytes) results.push(relative);
        } catch { /* inaccessible file */ }
      }
    };
    visit('.');
    return results.sort();
  }

  repositoryIdentity() {
    return {
      root: this.projectRoot,
      type: this.projectType,
      owner: this.gitInfo && this.gitInfo.owner,
      name: this.gitInfo && this.gitInfo.repo,
      remoteUrl: this.gitInfo && this.gitInfo.remoteUrl,
      branch: this.gitInfo && this.gitInfo.branch,
      commit: this.gitInfo && this.gitInfo.commit,
      defaultBranch: (this.githubRepo && this.githubRepo.default_branch) || (this.gitInfo && this.gitInfo.defaultBranch),
    };
  }
}

module.exports = Context;
