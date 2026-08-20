'use strict';

const Checker = require('../engine/Checker');

class DependenciesChecker extends Checker {
  constructor() {
    super({
      name: 'dependencies',
      version: '2.1.0',
      description: 'Checks dependency hygiene: lock files, license metadata, runtime declaration, direct count, registries',
      defaultWeight: 10,
    });
  }

  async check(context) {
    const startTime = Date.now();
    const findings = [];
    let score = 100;

    if (!context.packageJson) {
      findings.push({
        id: 'dep-000',
        severity: 'info',
        message: 'Node.js dependency checks are not applicable',
        file: null,
      });
      return this.createResult(100, findings, { applicable: false }, startTime);
    }

    // 1. Lock file exists
    const hasLockFile =
      context.fileExists('package-lock.json') ||
      context.fileExists('yarn.lock') ||
      context.fileExists('pnpm-lock.yaml');
    if (!hasLockFile) {
      findings.push({
        id: 'dep-001',
        severity: 'high',
        message: 'No lock file found (package-lock.json, yarn.lock, or pnpm-lock.yaml)',
        file: null,
        line: null,
        fixable: true,
        fix: 'Run npm install or yarn install to generate a lock file',
      });
      score -= 15;
    }

    // 2. package.json has license field
    if (context.packageJson && !context.packageJson.license) {
      findings.push({
        id: 'dep-002',
        severity: 'medium',
        message: 'package.json is missing the "license" field',
        file: 'package.json',
        line: null,
        fixable: true,
        fix: 'Add a "license" field to package.json',
      });
      score -= 10;
    }

    // 3. Count direct dependencies
    const deps = Object.keys(context.packageJson.dependencies || {});
    const depCount = deps.length;
    if (depCount > 100) {
      findings.push({
        id: 'dep-003',
        severity: 'medium',
        message: `High number of direct dependencies: ${depCount}`,
        file: 'package.json',
        line: null,
        fixable: false,
        fix: 'Review dependencies and remove unused ones',
      });
      score -= 10;
    } else if (depCount > 50) {
      findings.push({
        id: 'dep-004',
        severity: 'low',
        message: `Many direct dependencies: ${depCount}`,
        file: 'package.json',
        line: null,
        fixable: false,
        fix: 'Consider reducing dependency count',
      });
      score -= 5;
    }

    // 4. package.json has engines field
    if (context.packageJson && !context.packageJson.engines) {
      findings.push({
        id: 'dep-005',
        severity: 'low',
        message: 'package.json is missing the "engines" field',
        file: 'package.json',
        line: null,
        fixable: true,
        fix: 'Add an "engines" field to specify Node.js version requirements',
      });
      score -= 5;
    }

    // 5. npm vulnerability ownership belongs to SecurityChecker so a CVE is
    // counted exactly once in the aggregate report.

    // 6. Check for deprecated registry URLs in package-lock.json
    if (context.fileExists('package-lock.json')) {
      const lockContent = context.readFile('package-lock.json');
      if (lockContent) {
        const deprecatedRegistries = [
          'registry.bower.io',
          'npm.fontawesome.com',
        ];
        for (const registry of deprecatedRegistries) {
          if (lockContent.includes(registry)) {
            findings.push({
              id: 'dep-008',
              severity: 'low',
              message: `package-lock.json references deprecated registry: ${registry}`,
              file: 'package-lock.json',
              line: null,
              fixable: true,
              fix: `Update dependencies that reference ${registry}`,
            });
            score -= 5;
          }
        }
      }
    }

    return this.createResult(score, findings, {}, startTime);
  }
}

module.exports = DependenciesChecker;
