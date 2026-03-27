'use strict';

const fs = require('fs');
const path = require('path');
// Safe: execSync is only called with hardcoded 'npm audit --json' command,
// no user input is interpolated into the command string.
const { execSync } = require('child_process');
const Checker = require('../engine/Checker');

const SECRET_PATTERNS = [
  { name: 'AWS Key', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'GitHub Token', pattern: /gh[ps]_[A-Za-z0-9_]{36,}/ },
  { name: 'Generic Secret', pattern: /(?:secret|token|password|api_key|apikey)\s*[:=]\s*['"][^'"]{8,}/i },
  { name: 'Private Key', pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
  { name: 'Connection String', pattern: /(?:mongodb|postgres|mysql|redis):\/\/[^\s'"]+/ },
];

const SCANNABLE_EXTENSIONS = ['.js', '.ts', '.json', '.yml', '.yaml', '.cfg', '.conf'];

class SecurityChecker extends Checker {
  constructor() {
    super({
      name: 'security',
      version: '2.1.0',
      description: 'Checks security posture: secrets, gitignore, SECURITY.md, dependency updates, Docker security, npm audit',
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

    // 4. File-level secret scanning across all scannable files
    this._scanForSecrets(context, findings);
    const secretFindings = findings.filter((f) => f.id === 'sec-010');
    score -= secretFindings.length * 25;

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

    // 7. Real npm audit integration (shared cache with dependencies checker)
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
          try { return JSON.parse(e.stdout || '{}'); } catch { return null; }
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
            id: 'sec-011',
            severity: 'critical',
            message: `${criticalCount} critical CVE${criticalCount > 1 ? 's' : ''} found by npm audit`,
            file: null,
            line: null,
            fixable: true,
            fix: 'Run npm audit fix or update vulnerable packages',
          });
          score -= criticalCount * 25;
        }

        if (highCount > 0) {
          findings.push({
            id: 'sec-012',
            severity: 'high',
            message: `${highCount} high-severity CVE${highCount > 1 ? 's' : ''} found by npm audit`,
            file: null,
            line: null,
            fixable: true,
            fix: 'Run npm audit fix or update vulnerable packages',
          });
          score -= highCount * 15;
        }
      }
    }

    // 8. Docker security checks
    this._checkDockerSecurity(context, findings);
    const dockerFindings = findings.filter((f) => f.id && f.id.startsWith('sec-020'));
    for (const df of dockerFindings) {
      if (df.severity === 'critical') score -= 25;
      else if (df.severity === 'high') score -= 15;
      else if (df.severity === 'medium') score -= 10;
    }

    return this.createResult(score, findings, { envFilesFound: envFiles.length }, startTime);
  }

  _scanForSecrets(context, findings) {
    const rootFiles = context.listFiles('.');
    const filesToScan = [];

    for (const f of rootFiles) {
      if (f === 'node_modules' || f === '.git') continue;
      const ext = path.extname(f);
      if (SCANNABLE_EXTENSIONS.includes(ext) || f.startsWith('.env')) {
        filesToScan.push(f);
      }
    }

    for (const file of filesToScan) {
      const content = context.readFile(file);
      if (!content) continue;
      // Skip binary-looking files
      if (content.includes('\0')) continue;

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        for (const sp of SECRET_PATTERNS) {
          if (sp.pattern.test(lines[i])) {
            findings.push({
              id: 'sec-010',
              severity: 'critical',
              message: `Possible ${sp.name} found in ${file}`,
              file,
              line: i + 1,
              fixable: false,
              fix: 'Remove hardcoded secrets and use environment variables',
            });
            break; // one finding per line
          }
        }
      }
    }
  }

  _checkDockerSecurity(context, findings) {
    const dockerfile = context.readFile('Dockerfile');
    if (dockerfile) {
      // Check for USER root or no USER directive
      const hasUserDirective = /^USER\s+/m.test(dockerfile);
      const hasUserRoot = /^USER\s+root\b/m.test(dockerfile);

      if (hasUserRoot) {
        findings.push({
          id: 'sec-020a',
          severity: 'medium',
          message: 'Dockerfile runs as USER root',
          file: 'Dockerfile',
          line: null,
          fixable: false,
          fix: 'Add a non-root USER directive to the Dockerfile',
        });
      } else if (!hasUserDirective) {
        findings.push({
          id: 'sec-020b',
          severity: 'medium',
          message: 'Dockerfile has no USER directive (defaults to root)',
          file: 'Dockerfile',
          line: null,
          fixable: false,
          fix: 'Add a non-root USER directive to the Dockerfile',
        });
      }

      // Check for secrets in ENV directives
      const envLines = dockerfile.split('\n').filter((l) => /^ENV\s+/i.test(l.trim()));
      for (const line of envLines) {
        for (const sp of SECRET_PATTERNS) {
          if (sp.pattern.test(line)) {
            findings.push({
              id: 'sec-020c',
              severity: 'critical',
              message: `Possible ${sp.name} in Dockerfile ENV directive`,
              file: 'Dockerfile',
              line: null,
              fixable: false,
              fix: 'Use Docker secrets or build args instead of ENV for sensitive values',
            });
            break;
          }
        }
      }
    }

    // Check docker-compose for --privileged
    for (const composeFile of ['docker-compose.yml', 'docker-compose.yaml']) {
      const content = context.readFile(composeFile);
      if (!content) continue;
      if (/privileged:\s*true/i.test(content) || /--privileged/.test(content)) {
        findings.push({
          id: 'sec-020d',
          severity: 'high',
          message: `Privileged mode found in ${composeFile}`,
          file: composeFile,
          line: null,
          fixable: false,
          fix: 'Avoid running containers in privileged mode',
        });
      }
    }
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
