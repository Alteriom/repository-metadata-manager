'use strict';

// Safe: execSync is only called with hardcoded 'npm audit --json' command,
// no user input is interpolated into the command string.
const { execSync } = require('child_process');
const Checker = require('../engine/Checker');

class DependenciesChecker extends Checker {
  constructor() {
    super({
      name: 'dependencies',
      version: '2.1.0',
      description: 'Checks dependency health: lock files, license, dep count, audit, deprecated registries',
      defaultWeight: 10,
    });
  }

  async check(context) {
    const startTime = Date.now();
    const findings = [];
    let score = 100;

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
    if (context.packageJson) {
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

    // 5. npm audit via shared cache (same key as security checker)
    if (context.packageJson) {
      const auditResult = await context.cache.getOrSet('npm-audit', async () => {
        try {
          // Safe: hardcoded command, no user input
          const output = execSync('npm audit --json', {
            cwd: context.projectRoot,
            encoding: 'utf8',
            timeout: 30000,
          });
          return JSON.parse(output);
        } catch (e) {
          // npm audit exits non-zero when vulns found, but still outputs JSON
          try {
            return JSON.parse(e.stdout || '{}');
          } catch {
            return null;
          }
        }
      });

      if (auditResult && auditResult.vulnerabilities) {
        const vulns = auditResult.vulnerabilities;
        let criticalCount = 0;
        let highCount = 0;
        for (const [, info] of Object.entries(vulns)) {
          if (info.severity === 'critical') criticalCount++;
          else if (info.severity === 'high') highCount++;
        }

        if (criticalCount > 0) {
          findings.push({
            id: 'dep-006',
            severity: 'critical',
            message: `${criticalCount} critical vulnerability${criticalCount > 1 ? 'ies' : 'y'} found by npm audit`,
            file: null,
            line: null,
            fixable: true,
            fix: 'Run npm audit fix or update vulnerable packages',
          });
          score -= criticalCount * 10;
        }

        if (highCount > 0) {
          findings.push({
            id: 'dep-007',
            severity: 'high',
            message: `${highCount} high vulnerability${highCount > 1 ? 'ies' : 'y'} found by npm audit`,
            file: null,
            line: null,
            fixable: true,
            fix: 'Run npm audit fix or update vulnerable packages',
          });
          score -= highCount * 5;
        }
      }
    }

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
