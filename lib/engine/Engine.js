'use strict';

const Context = require('./Context');
const Report = require('./Report');

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
      checkerConfigs[checker.name] = { weight: cfg.weight || checker.defaultWeight };
    }

    return Report.aggregate(results, checkerConfigs);
  }

  async fix({ dryRun = false } = {}) {
    const report = await this.run();
    const context = await this._getContext();
    const fixResults = [];

    for (const checker of this._checkers) {
      const result = report.checkers[checker.name];
      if (!result) continue;

      const fixableFindings = result.findings.filter(f => f.fixable);
      if (fixableFindings.length === 0) continue;

      if (dryRun) {
        fixResults.push({
          checker: checker.name,
          applied: [],
          skipped: fixableFindings.map(f => ({ id: f.id, reason: 'Dry run' })),
        });
      } else {
        try {
          const fixResult = await checker.fix(context, fixableFindings);
          fixResults.push(fixResult);
        } catch (error) {
          fixResults.push({
            checker: checker.name,
            applied: [],
            skipped: fixableFindings.map(f => ({ id: f.id, reason: error.message })),
          });
        }
      }
    }

    return { report, fixes: fixResults };
  }
}

module.exports = Engine;
