'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
// Safe: execSync receives a hardcoded npm audit command and a credential-free
// environment; no candidate value is interpolated into the command string.
const childProcess = require('child_process');
const Checker = require('../engine/Checker');

const SECRET_PATTERNS = [
  { name: 'AWS Key', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'GitHub Token', pattern: /gh[ps]_[A-Za-z0-9_]{36,}/ },
  { name: 'Generic Secret', pattern: /(?:secret|token|password|api_key|apikey)\s*[:=]\s*['"][^'"]{8,}/i },
  { name: 'Private Key', pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
  { name: 'Connection String', pattern: /(?:mongodb|postgres|mysql|redis):\/\/[^\s'"]+/ },
];

const SCANNABLE_EXTENSIONS = ['.js', '.ts', '.json', '.yml', '.yaml', '.cfg', '.conf'];

function npmAuditEnvironment(auditHome) {
  const environment = {};
  const trustedNetworkVariables = [
    'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY',
    'http_proxy', 'https_proxy', 'no_proxy',
    'NODE_EXTRA_CA_CERTS', 'NODE_USE_ENV_PROXY', 'SSL_CERT_FILE', 'SSL_CERT_DIR',
    'NPM_CONFIG_CAFILE', 'NPM_CONFIG_STRICT_SSL',
  ];
  for (const name of [
    'PATH', 'Path', 'PATHEXT', 'SystemRoot', 'COMSPEC', 'TEMP', 'TMP',
    ...trustedNetworkVariables,
  ]) {
    if (process.env[name] !== undefined) environment[name] = process.env[name];
  }
  const registry =
    process.env.REPO_MANAGER_NPM_AUDIT_REGISTRY ||
    process.env.NPM_CONFIG_REGISTRY ||
    process.env.npm_config_registry ||
    'https://registry.npmjs.org/';
  return {
    ...environment,
    HOME: auditHome,
    USERPROFILE: auditHome,
    NPM_CONFIG_USERCONFIG: path.join(auditHome, 'user.npmrc'),
    NPM_CONFIG_GLOBALCONFIG: path.join(auditHome, 'global.npmrc'),
    NPM_CONFIG_REGISTRY: registry,
    NPM_CONFIG_IGNORE_SCRIPTS: 'true',
    NPM_CONFIG_OMIT: '',
    NPM_CONFIG_CACHE: path.join(auditHome, 'cache'),
  };
}

function npmAuditCommand(packageJson) {
  const workspaces = packageJson.workspaces;
  const hasWorkspaces = Array.isArray(workspaces)
    ? workspaces.length > 0
    : Boolean(workspaces && typeof workspaces === 'object');
  const workspaceScope = hasWorkspaces
    ? ' --workspaces --include-workspace-root'
    : '';
  return 'npm audit --json --ignore-scripts --include=dev ' +
    `--include=optional --include=peer${workspaceScope}`;
}

function prepareNpmAuditProject(context, auditHome) {
  const auditProjectRoot = path.join(auditHome, 'project');
  fs.mkdirSync(auditProjectRoot, { recursive: true });

  const packageText = context.readFile('package.json');
  const lockText = context.readFile('package-lock.json');
  if (!packageText || !lockText) {
    throw new Error('npm audit requires readable package manifests');
  }
  fs.writeFileSync(path.join(auditProjectRoot, 'package.json'), packageText);
  fs.writeFileSync(path.join(auditProjectRoot, 'package-lock.json'), lockText);

  const lock = JSON.parse(lockText);
  for (const packagePath of Object.keys(lock.packages || {})) {
    if (!packagePath || packagePath.split('/').includes('node_modules')) continue;
    const relativeManifest = `${packagePath}/package.json`;
    const manifestText = context.readFile(relativeManifest);
    if (!manifestText) continue;

    const destination = path.resolve(
      auditProjectRoot,
      ...relativeManifest.split('/')
    );
    const auditPrefix = `${path.resolve(auditProjectRoot)}${path.sep}`;
    if (!destination.startsWith(auditPrefix)) {
      throw new Error('package-lock.json contains a workspace outside the audit root');
    }
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, manifestText);
  }
  return auditProjectRoot;
}

class SecurityChecker extends Checker {
  constructor() {
    super({
      name: 'security',
      version: '2.3.0',
      description: 'Checks security posture: secrets, gitignore, SECURITY.md, dependency updates, Docker security, npm audit',
      defaultWeight: 30,
      fixableFindingIds: ['sec-003', 'sec-004'],
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
    const envFiles = rootFiles.filter((f) =>
      (f === '.env' || /^\.env\./.test(f)) &&
      !/\.(?:example|sample|template|dist)$/i.test(f)
    );
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
    if (context.packageJson && context.fileExists('package-lock.json')) {
      const auditResult = await context.cache.getOrSet('npm-audit', async () => {
        const auditHome = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-manager-npm-audit-'));
        try {
          // Audit a manifest-only copy so candidate project .npmrc settings
          // cannot filter workspaces or otherwise change audit semantics. The
          // subprocess also receives only a minimal, credential-free environment.
          const auditProjectRoot = prepareNpmAuditProject(context, auditHome);
          const output = childProcess.execSync(
            npmAuditCommand(context.packageJson), {
            cwd: auditProjectRoot,
            encoding: 'utf8',
            timeout: 30000,
            env: npmAuditEnvironment(auditHome),
          });
          return JSON.parse(output);
        } catch (e) {
          try { return JSON.parse(e.stdout || '{}'); } catch { return null; }
        } finally {
          fs.rmSync(auditHome, { recursive: true, force: true });
        }
      });

      if (!auditResult || !auditResult.vulnerabilities) {
        findings.push({
          id: 'sec-013',
          severity: 'medium',
          message: 'npm audit could not produce a vulnerability result',
          file: 'package-lock.json',
          fix: 'Verify registry access and run npm audit --json',
        });
        score -= 10;
      } else {
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
    const policy = context.config.security || {};
    const candidates = context.walkFiles({
      ignoredDirectories: policy.ignoredDirectories || [],
      ignoredPaths: policy.ignoredPaths || [],
      maxFileSizeBytes: policy.maxFileSizeBytes || 1048576,
    });
    const filesToScan = candidates.filter(file => {
      const name = path.basename(file);
      return SCANNABLE_EXTENSIONS.includes(path.extname(name).toLowerCase()) || name.startsWith('.env');
    });

    for (const file of filesToScan) {
      const content = context.readFile(file);
      if (!content) continue;
      // Skip binary-looking files
      if (content.includes('\0')) continue;

      const lines = content.split('\n');
      const isExample = /(?:^|\/)(?:\.env.*\.(?:example|sample|template|dist)|[^/]*\.(?:example|sample))$/i.test(file);
      for (let i = 0; i < lines.length; i++) {
        for (const sp of SECRET_PATTERNS) {
          if (isExample && sp.name === 'Generic Secret') continue;
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

  async plan(context, findings) {
    const operations = [];
    const unsupported = [];
    const Planner = require('../control/Planner');

    if (findings.some(finding => finding.id === 'sec-003')) {
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
      operations.push({
        id: 'security:create-gitignore',
        checker: this.name,
        findingId: 'sec-003',
        type: 'write-file',
        path: '.gitignore',
        description: 'Create .gitignore with common secret and build exclusions',
        beforeHash: null,
        content,
      });
    }

    if (findings.some(finding => finding.id === 'sec-004')) {
      const current = context.readFile('.gitignore') || '';
      const separator = current.length > 0 && !current.endsWith('\n') ? '\n' : '';
      operations.push({
        id: 'security:protect-env-files',
        checker: this.name,
        findingId: 'sec-004',
        type: 'write-file',
        path: '.gitignore',
        description: 'Add .env patterns to .gitignore',
        beforeHash: Planner.hash(current),
        content: `${current}${separator}.env\n.env.*\n`,
      });
    }

    for (const finding of findings) {
      if (!['sec-003', 'sec-004'].includes(finding.id)) unsupported.push({ id: finding.id, reason: 'No safe automatic remediation' });
    }
    return { checker: this.name, operations, unsupported };
  }
}

module.exports = SecurityChecker;
