const RepositoryManager = require('../core/RepositoryManager');

class SecurityManager extends RepositoryManager {
  async securityAudit() {
    const results = {
      score: 0,
      maxScore: 100,
      checks: [],
      vulnerabilities: [],
      recommendations: []
    };

    // Check security features
    await this.checkSecurityFeatures(results);
    await this.checkSecurityPolicy(results);
    await this.checkDependencies(results);
    await this.checkSecrets(results);
    
    results.score = this.calculateSecurityScore(results.checks);
    return results;
  }

  async checkSecurityFeatures(results) {
    try {
      // Check if security features are enabled
      const repo = await this.getRepository();

      const checks = [
        {
          name: 'Private vulnerability reporting',
          status: repo.security_and_analysis?.secret_scanning?.status === 'enabled',
          weight: 20,
          fix: 'Enable in Settings > Security & analysis'
        },
        {
          name: 'Dependabot alerts',
          status: repo.security_and_analysis?.dependabot_security_updates?.status === 'enabled',
          weight: 20,
          fix: 'Enable Dependabot security updates'
        },
        {
          name: 'Secret scanning',
          status: repo.security_and_analysis?.secret_scanning?.status === 'enabled',
          weight: 15,
          fix: 'Enable secret scanning'
        }
      ];

      results.checks.push(...checks);
    } catch (error) {
      results.recommendations.push(`Error checking security features: ${error.message}`);
    }
  }

  async checkSecurityPolicy(results) {
    const securityFile = await this.getContents('SECURITY.md');
    const hasSecurityPolicy = securityFile !== null;
    
    results.checks.push({
      name: 'Security policy (SECURITY.md)',
      status: hasSecurityPolicy,
      weight: 15,
      fix: hasSecurityPolicy ? null : 'Create SECURITY.md file'
    });

    if (!hasSecurityPolicy) {
      results.recommendations.push('Create a SECURITY.md file with vulnerability reporting instructions');
    }
  }

  async checkDependencies(results) {
    try {
      // Check for package.json and analyze dependencies
      const packageFile = await this.getContents('package.json');
      if (packageFile) {
        const packageJson = JSON.parse(Buffer.from(packageFile.content, 'base64').toString());
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        // Check for known vulnerable packages (simplified check)
        const vulnerablePackages = this.checkVulnerablePackages(deps);
        
        results.checks.push({
          name: 'No known vulnerable dependencies',
          status: vulnerablePackages.length === 0,
          weight: 20,
          fix: vulnerablePackages.length > 0 ? `Update packages: ${vulnerablePackages.join(', ')}` : null
        });

        if (vulnerablePackages.length > 0) {
          results.vulnerabilities.push(...vulnerablePackages);
        }
      }
    } catch (error) {
      results.recommendations.push(`Error checking dependencies: ${error.message}`);
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
        /npm_[a-zA-Z0-9]{36}/
      ];

      for (const commit of commits) {
        const commitData = await this.getCommit(commit.sha);

        // Check commit message and diff for secrets
        const message = commitData.commit.message;
        if (secretPatterns.some(pattern => pattern.test(message))) {
          hasSecretLeaks = true;
          break;
        }
      }

      results.checks.push({
        name: 'No secrets in recent commits',
        status: !hasSecretLeaks,
        weight: 10,
        fix: hasSecretLeaks ? 'Review and remove exposed secrets from git history' : null
      });

    } catch (error) {
      results.recommendations.push(`Error checking for secret leaks: ${error.message}`);
    }
  }

  checkVulnerablePackages(dependencies) {
    // Simplified vulnerable package check
    const knownVulnerable = [
      'lodash@4.17.15',
      'minimist@1.2.0',
      'handlebars@4.0.0'
    ];
    
    const vulnerable = [];
    Object.entries(dependencies).forEach(([name, version]) => {
      if (knownVulnerable.some(vuln => vuln.startsWith(name))) {
        vulnerable.push(name);
      }
    });
    
    return vulnerable;
  }

  calculateSecurityScore(checks) {
    if (checks.length === 0) return 0;
    const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
    const earnedWeight = checks.reduce((sum, check) => sum + (check.status ? check.weight : 0), 0);
    return Math.round((earnedWeight / totalWeight) * 100);
  }

  async enforceSecurityStandards() {
    const results = await this.securityAudit();
    const fixes = [];

    // Auto-create SECURITY.md if missing
    const securityCheck = results.checks.find(c => c.name.includes('Security policy'));
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
