'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class Context {
  constructor({ projectRoot, projectType, github, packageJson, gitInfo, config, cache }) {
    this.projectRoot = projectRoot;
    this.projectType = projectType;
    this.github = github;
    this.packageJson = packageJson;
    this.gitInfo = gitInfo;
    this.config = config;
    this.cache = cache;
  }

  static async build({ projectRoot, token, configPath }) {
    const Cache = require('./Cache');
    const cache = new Cache();

    const projectType = Context.detectProjectType(projectRoot);
    const packageJson = Context.readPackageJson(projectRoot);
    const gitInfo = Context.readGitInfo(projectRoot);
    const config = Context.loadConfig(projectRoot, configPath);

    let github = null;
    if (token) {
      try {
        const { Octokit } = require('@octokit/rest');
        github = new Octokit({ auth: token });
      } catch {
        // @octokit/rest not installed — API not available
      }
    }

    return new Context({ projectRoot, projectType, github, packageJson, gitInfo, config, cache });
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
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: projectRoot, encoding: 'utf8' }).trim();
      let remoteUrl = '';
      try { remoteUrl = execSync('git remote get-url origin', { cwd: projectRoot, encoding: 'utf8' }).trim(); } catch { /* no remote */ }
      return { branch, remoteUrl };
    } catch { return null; }
  }

  static loadConfig(projectRoot, configPath) {
    const cfgPath = path.join(projectRoot, configPath || '.repo-manager.json');
    if (!fs.existsSync(cfgPath)) return {};
    try { return JSON.parse(fs.readFileSync(cfgPath, 'utf8')); }
    catch { return {}; }
  }

  getCheckerConfig(checkerName) {
    const checkerConfigs = (this.config && this.config.checkers) || {};
    return checkerConfigs[checkerName] || {};
  }

  fileExists(relativePath) {
    return fs.existsSync(path.join(this.projectRoot, relativePath));
  }

  readFile(relativePath) {
    const fullPath = path.join(this.projectRoot, relativePath);
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath, 'utf8');
  }

  listFiles(relativeDir) {
    const fullPath = path.join(this.projectRoot, relativeDir);
    if (!fs.existsSync(fullPath)) return [];
    return fs.readdirSync(fullPath);
  }
}

module.exports = Context;
