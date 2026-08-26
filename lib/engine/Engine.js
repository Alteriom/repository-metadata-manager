'use strict';

const Context = require('./Context');
const Report = require('./Report');
const Planner = require('../control/Planner');
const Executor = require('../control/Executor');
const pkg = require('../../package.json');

class Engine {
  constructor({ projectRoot, token, config } = {}) {
    this.projectRoot = projectRoot || process.cwd();
    this.token = token || process.env.GITHUB_TOKEN || null;
    this.configPath = config || '.repo-manager.json';
    this._checkers = [];
    this._context = null;
  }

  register(checker) {
    this._checkers.push(checker);
    return this;
  }

  loadBuiltinCheckers() {
    const fs = require('fs');
    const path = require('path');
    const checkersDir = path.join(__dirname, '..', 'checkers');
    if (!fs.existsSync(checkersDir)) return this;

    for (const file of fs.readdirSync(checkersDir)) {
      if (file.endsWith('.js')) {
        const CheckerClass = require(path.join(checkersDir, file));
        if (typeof CheckerClass === 'function') {
          this._checkers.push(new CheckerClass());
        }
      }
    }
    this._checkers.sort((a, b) => a.name.localeCompare(b.name));
    return this;
  }

  async _getContext() {
    if (!this._context) {
      this._context = await Context.build({
        projectRoot: this.projectRoot,
        token: this.token,
        configPath: this.configPath,
      });
    }
    return this._context;
  }

  async run(only) {
    if (this._checkers.length === 0) this.loadBuiltinCheckers();
    const context = await this._getContext();

    // Filter checkers
    let checkers = this._checkers;
    if (only && only.length > 0) {
      const available = new Set(this._checkers.map(checker => checker.name));
      const unknown = only.filter(name => !available.has(name));
      if (unknown.length > 0) throw new Error(`Unknown checker(s): ${unknown.join(', ')}`);
      checkers = checkers.filter(c => only.includes(c.name));
    }

    // Filter disabled checkers
    checkers = checkers.filter(c => {
      const cfg = context.getCheckerConfig(c.name);
      return cfg.enabled !== false;
    });

    // Run in parallel
    const results = await Promise.all(
      checkers.map(async (checker) => {
        try {
          return await checker.check(context);
        } catch (error) {
          // Checker crashed — return error result
          return {
            checker: checker.name,
            score: 0,
            grade: 'F',
            findings: [{
              id: `${checker.name}-error`,
              severity: 'critical',
              message: `Checker crashed: ${error.message}`,
              file: null,
              line: null,
              fixable: false,
              fix: null,
            }],
            metadata: { error: error.message },
            duration: 0,
          };
        }
      })
    );

    // Build checker configs for weighting
    const checkerConfigs = {};
    for (const checker of checkers) {
      const cfg = context.getCheckerConfig(checker.name);
      checkerConfigs[checker.name] = { weight: cfg.weight ?? checker.defaultWeight };
    }

    return Report.aggregate(results, checkerConfigs, {
      tool: { name: pkg.name, version: pkg.version },
      repository: context.repositoryIdentity(),
      policy: context.config,
      checkerScope: only && only.length > 0 ? only : null,
    });
  }

  async plan({ only } = {}) {
    const report = await this.run(only);
    const context = await this._getContext();
    return Planner.create({ context, report, checkers: this._checkers });
  }

  async applyPlan(plan, options = {}) {
    const context = await this._getContext();
    if (plan?.repository?.commit && context.gitInfo?.commit && plan.repository.commit !== context.gitInfo.commit) {
      throw new Error(`Plan is stale: repository commit changed from ${plan.repository.commit} to ${context.gitInfo.commit}`);
    }
    return Executor.apply(plan, { projectRoot: context.projectRoot, ...options });
  }

  async fix({ dryRun = true, approved = false, auditPath = null } = {}) {
    const report = await this.run();
    const context = await this._getContext();
    const plan = await Planner.create({ context, report, checkers: this._checkers });
    const application = Executor.apply(plan, {
      projectRoot: context.projectRoot,
      dryRun,
      approved,
      auditPath,
    });
    return { report, plan, application };
  }
}

module.exports = Engine;
