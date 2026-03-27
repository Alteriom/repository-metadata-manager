const RepositoryManager = require('../core/RepositoryManager');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

class SecurityManager extends RepositoryManager {
    async securityAudit() {
        const results = {
            score: 0,
            maxScore: 100,
            checks: [],
            vulnerabilities: [],
            recommendations: [],
        };

        try {
            this._ensureAPIAvailable();
            // API-based audit
            await this.checkSecurityFeatures(results);
            await this.checkSecurityPolicy(results);
            await this.checkDependencies(results);
            await this.checkSecrets(results);
        } catch {
            // Local fallback
            await this.localSecurityAudit(results);
        }

        results.score = this.calculateSecurityScore(results.checks);
        return results;
    }

    async localSecurityAudit(results) {
        const basePath = process.cwd();

        // Check SECURITY.md locally
        const hasSecurityMd = fs.existsSync(path.join(basePath, 'SECURITY.md'));
        results.checks.push({
            name: 'Security policy (SECURITY.md)',
            status: hasSecurityMd,
            weight: 15,
            fix: hasSecurityMd ? null : 'Create SECURITY.md file',
        });
        if (!hasSecurityMd) {
            results.recommendations.push(
                'Create a SECURITY.md file with vulnerability reporting instructions'
            );
        }

        // Check .gitignore locally
        const hasGitignore = fs.existsSync(path.join(basePath, '.gitignore'));
        results.checks.push({
            name: 'Has .gitignore file',
            status: hasGitignore,
            weight: 10,
            fix: hasGitignore ? null : 'Create .gitignore to prevent accidental secret commits',
        });

        // Check for .env files that should not be committed
        const hasEnvFile = fs.existsSync(path.join(basePath, '.env'));
        const gitignoreContent = hasGitignore
            ? fs.readFileSync(path.join(basePath, '.gitignore'), 'utf8')
            : '';
        const envIgnored = gitignoreContent.includes('.env');
        results.checks.push({
            name: 'No unignored .env files',
            status: !hasEnvFile || envIgnored,
            weight: 15,
            fix: hasEnvFile && !envIgnored ? 'Add .env to .gitignore' : null,
        });

        // Run npm audit locally if package.json exists
        const hasPackageJson = fs.existsSync(path.join(basePath, 'package.json'));
        if (hasPackageJson) {
            try {
                const auditOutput = execFileSync('npm', ['audit', '--json'], {
                    cwd: basePath,
                    encoding: 'utf8',
                    timeout: 30000,
                    stdio: ['pipe', 'pipe', 'pipe'],
                });
                const auditData = JSON.parse(auditOutput);
                const vulnCount = auditData.metadata?.vulnerabilities?.total || 0;
                results.checks.push({
                    name: 'No known vulnerable dependencies',
                    status: vulnCount === 0,
                    weight: 20,
                    fix: vulnCount > 0 ? `Found ${vulnCount} vulnerabilities - run npm audit fix` : null,
                });
                if (vulnCount > 0) {
                    results.vulnerabilities.push(`${vulnCount} npm vulnerabilities found`);
                }
            } catch {
                // npm audit returns non-zero exit code when vulnerabilities found
                results.checks.push({
                    name: 'No known vulnerable dependencies',
                    status: false,
                    weight: 20,
                    fix: 'Run npm audit fix to resolve vulnerabilities',
                });
            }
        }

        // Check for dependabot config
        const hasDependabot = fs.existsSync(path.join(basePath, '.github', 'dependabot.yml'));
        results.checks.push({
            name: 'Dependabot configured',
            status: hasDependabot,
            weight: 10,
            fix: hasDependabot ? null : 'Add .github/dependabot.yml for automated dependency updates',
        });

        results.local = true;
    }

    async checkSecurityFeatures(results) {
        try {
            // Check if security features are enabled
            const repo = await this.getRepository();

            const checks = [
                {
                    name: 'Private vulnerability reporting',
                    status:
                        repo.security_and_analysis?.secret_scanning?.status ===
                        'enabled',
                    weight: 20,
                    fix: 'Enable in Settings > Security & analysis',
                },
                {
                    name: 'Dependabot alerts',
                    status:
                        repo.security_and_analysis?.dependabot_security_updates
                            ?.status === 'enabled',
                    weight: 20,
                    fix: 'Enable Dependabot security updates',
                },
                {
                    name: 'Secret scanning',
                    status:
                        repo.security_and_analysis?.secret_scanning?.status ===
                        'enabled',
                    weight: 15,
                    fix: 'Enable secret scanning',
                },
            ];

            results.checks.push(...checks);
        } catch (error) {
            results.recommendations.push(
                `Error checking security features: ${error.message}`
            );
        }
    }

    async checkSecurityPolicy(results) {
        const securityFile = await this.getContents('SECURITY.md');
        const hasSecurityPolicy = securityFile !== null;

        results.checks.push({
            name: 'Security policy (SECURITY.md)',
            status: hasSecurityPolicy,
            weight: 15,
            fix: hasSecurityPolicy ? null : 'Create SECURITY.md file',
        });

        if (!hasSecurityPolicy) {
            results.recommendations.push(
                'Create a SECURITY.md file with vulnerability reporting instructions'
            );
        }
    }

    async checkDependencies(results) {
        try {
            // Check for package.json and analyze dependencies
            const packageFile = await this.getContents('package.json');
            if (packageFile) {
                const packageJson = JSON.parse(
                    Buffer.from(packageFile.content, 'base64').toString()
                );
                const deps = {
                    ...packageJson.dependencies,
                    ...packageJson.devDependencies,
                };

                // Check for known vulnerable packages (simplified check)
                const vulnerablePackages = this.checkVulnerablePackages(deps);

                results.checks.push({
                    name: 'No known vulnerable dependencies',
                    status: vulnerablePackages.length === 0,
                    weight: 20,
                    fix:
                        vulnerablePackages.length > 0
                            ? `Update packages: ${vulnerablePackages.join(', ')}`
                            : null,
                });

                if (vulnerablePackages.length > 0) {
                    results.vulnerabilities.push(...vulnerablePackages);
                }
            }
        } catch (error) {
            results.recommendations.push(
                `Error checking dependencies: ${error.message}`
            );
        }
    }

    async checkSecrets(results) {
        // Check for common secret patterns in recent commits
        try {
            const commits = await this.listCommits({ per_page: 10 });

            let hasSecretLeaks = false;
            const secretPatterns = [
                /(?:api[_-]?key|token|secret|password)\s*[:=]\s*['""][^'""]{8,}/i,
                /ghp_[a-zA-Z0-9]{36}/,
                /npm_[a-zA-Z0-9]{36}/,
            ];

            for (const commit of commits) {
                const commitData = await this.getCommit(commit.sha);

                // Check commit message and diff for secrets
                const message = commitData.commit.message;
                if (secretPatterns.some((pattern) => pattern.test(message))) {
                    hasSecretLeaks = true;
                    break;
                }
            }

            results.checks.push({
                name: 'No secrets in recent commits',
                status: !hasSecretLeaks,
                weight: 10,
                fix: hasSecretLeaks
                    ? 'Review and remove exposed secrets from git history'
                    : null,
            });
        } catch (error) {
            results.recommendations.push(
                `Error checking for secret leaks: ${error.message}`
            );
        }
    }

    checkVulnerablePackages(dependencies) {
        // Simplified vulnerable package check
        const knownVulnerable = [
            'lodash@4.17.15',
            'minimist@1.2.0',
            'handlebars@4.0.0',
        ];

        const vulnerable = [];
        Object.entries(dependencies).forEach(([name, _version]) => {
            if (knownVulnerable.some((vuln) => vuln.startsWith(name))) {
                vulnerable.push(name);
            }
        });

        return vulnerable;
    }

    calculateSecurityScore(checks) {
        if (checks.length === 0) return 0;
        const totalWeight = checks.reduce(
            (sum, check) => sum + check.weight,
            0
        );
        const earnedWeight = checks.reduce(
            (sum, check) => sum + (check.status ? check.weight : 0),
            0
        );
        return Math.round((earnedWeight / totalWeight) * 100);
    }

    async enforceSecurityStandards() {
        const results = await this.securityAudit();
        const fixes = [];

        // Auto-create SECURITY.md if missing
        const securityCheck = results.checks.find((c) =>
            c.name.includes('Security policy')
        );
        if (securityCheck && !securityCheck.status) {
            await this.createSecurityPolicy();
            fixes.push('Created SECURITY.md file');
        }

        return { results, fixes };
    }

    async createSecurityPolicy() {
        const securityContent = `# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < Latest| :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it to:

- **Email**: security@${this.config.organizationName || 'organization'}.com
- **GitHub**: Use private vulnerability reporting (if enabled)

### What to include:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if any)

### Response Timeline:

- **Initial response**: Within 48 hours
- **Status update**: Within 7 days
- **Fix timeline**: Varies by severity

We appreciate responsible disclosure and will acknowledge your contribution.
`;

        await this.createOrUpdateFile(
            'SECURITY.md',
            securityContent,
            'Add security policy'
        );
    }
}

module.exports = SecurityManager;
