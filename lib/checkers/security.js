'use strict';

const fs = require('fs');
const path = require('path');
const Checker = require('../engine/Checker');

class SecurityChecker extends Checker {
  constructor() {
    super({
      name: 'security',
      version: '2.0.0',
      description: 'Checks security posture: secrets, gitignore, SECURITY.md, dependency updates',
      defaultWeight: 30,
    });
  }

  async check(context) {
    const startTime = Date.now();
    const findings = [];
    let score = 100;

    // 1. SECURITY.md exists and has content (>50 chars)
    const securityMd = context.readFile('SECURITY.md');
    if (!securityMd) {
      findings.push({
        id: 'sec-001',
        severity: 'high',
        message: 'SECURITY.md is missing',
        file: 'SECURITY.md',
        line: null,
        fixable: true,
        fix: 'Create a SECURITY.md with vulnerability reporting instructions',
      });
      score -= 15;
    } else if (securityMd.length <= 50) {
      findings.push({
        id: 'sec-002',
        severity: 'medium',
        message: 'SECURITY.md exists but has very little content',
        file: 'SECURITY.md',
        line: null,
        fixable: false,
        fix: 'Add detailed vulnerability reporting instructions',
      });
      score -= 10;
    }

    // 2. .gitignore exists and covers .env
    const gitignore = context.readFile('.gitignore');
    if (!gitignore) {
      findings.push({
        id: 'sec-003',
        severity: 'high',
        message: '.gitignore is missing',
        file: '.gitignore',
        line: null,
        fixable: true,
        fix: 'Create a .gitignore with common patterns',
      });
      score -= 15;
    } else if (!gitignore.split('\n').some((line) => line.trim() === '.env' || line.trim() === '.env*')) {
      findings.push({
        id: 'sec-004',
        severity: 'medium',
        message: '.env is not covered by .gitignore',
        file: '.gitignore',
        line: null,
        fixable: true,
        fix: 'Add .env to .gitignore',
      });
      score -= 10;
    }

    // 3. Scan for .env files in project root
    const rootFiles = context.listFiles('.');
    const envFiles = rootFiles.filter((f) => f === '.env' || f.match(/^\.env\./));
    for (const envFile of envFiles) {
      findings.push({
        id: 'sec-005',
        severity: 'critical',
        message: `Environment file "${envFile}" found in project root — may contain secrets`,
        file: envFile,
        line: null,
        fixable: true,
        fix: `Remove ${envFile} from version control and add to .gitignore`,
      });
      score -= 25;
    }

    // 4. Scan common files for secret patterns
    const filesToScan = ['package.json', 'config.js', 'config.json', '.env', 'docker-compose.yml', 'docker-compose.yaml'];
    const secretPattern = /(?:api[_-]?key|secret|token|password|credential)\s*[:=]\s*['"][^'"]{8,}/i;
    for (const file of filesToScan) {
      const content = context.readFile(file);
      if (!content) continue;
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (secretPattern.test(lines[i])) {
          findings.push({
            id: 'sec-006',
            severity: 'high',
            message: `Possible secret found in ${file}`,
            file,
            line: i + 1,
            fixable: false,
            fix: 'Remove hardcoded secrets and use environment variables',
          });
          score -= 15;
        }
      }
    }

    // 5. Dependabot or Renovate config exists
    const hasDependabot = context.fileExists('.github/dependabot.yml') || context.fileExists('.github/dependabot.yaml');
    const hasRenovate =
      context.fileExists('renovate.json') ||
      context.fileExists('renovate.json5') ||
      context.fileExists('.renovaterc') ||
      context.fileExists('.renovaterc.json');
    if (!hasDependabot && !hasRenovate) {
      findings.push({
        id: 'sec-007',
        severity: 'low',
        message: 'No dependency update tool configured (Dependabot or Renovate)',
        file: null,
        line: null,
        fixable: true,
        fix: 'Add .github/dependabot.yml or renovate.json',
      });
      score -= 5;
    }

    // 6. If packageJson exists: check for license field
    if (context.packageJson && !context.packageJson.license) {
      findings.push({
        id: 'sec-008',
        severity: 'medium',
        message: 'package.json is missing the "license" field',
        file: 'package.json',
        line: null,
        fixable: true,
        fix: 'Add a "license" field to package.json',
      });
      score -= 10;
    }

    return this.createResult(score, findings, { envFilesFound: envFiles.length }, startTime);
  }

  async fix(context, findings) {
    const applied = [];
    const skipped = [];

    const gitignoreFinding = findings.find((f) => f.id === 'sec-003');
    if (gitignoreFinding) {
      const gitignorePath = path.join(context.projectRoot, '.gitignore');
      const content = [
        'node_modules/',
        '.env',
        '.env.*',
        '*.log',
        'coverage/',
        'dist/',
        '.DS_Store',
        '',
      ].join('\n');
      try {
        fs.writeFileSync(gitignorePath, content, 'utf8');
        applied.push({ id: 'sec-003', description: 'Created .gitignore with common patterns' });
      } catch (e) {
        skipped.push({ id: 'sec-003', reason: e.message });
      }
    }

    return { checker: this.name, applied, skipped };
  }
}

module.exports = SecurityChecker;
