const RepositoryManager = require('../core/RepositoryManager');

class CICDManager extends RepositoryManager {
    async auditWorkflows() {
        const results = {
            score: 0,
            maxScore: 100,
            workflows: [],
            recommendations: [],
            securityIssues: [],
        };

        // Get all workflow files
        const workflows = await this.getWorkflowFiles();

        for (const workflow of workflows) {
            const analysis = await this.analyzeWorkflow(workflow);
            results.workflows.push(analysis);
        }

        // Check for essential workflows
        await this.checkEssentialWorkflows(results);

        results.score = this.calculateCICDScore(results);
        return results;
    }

    async getWorkflowFiles() {
        try {
            const workflowDir = await this.getContents('.github/workflows');
            if (!workflowDir || !Array.isArray(workflowDir)) return [];

            const workflows = [];
            for (const file of workflowDir) {
                if (file.name.endsWith('.yml') || file.name.endsWith('.yaml')) {
                    const content = await this.getContents(file.path);
                    workflows.push({
                        name: file.name,
                        path: file.path,
                        content: Buffer.from(
                            content.content,
                            'base64'
                        ).toString(),
                    });
                }
            }
            return workflows;
        } catch (error) {
            return [];
        }
    }

    async analyzeWorkflow(workflow) {
        const analysis = {
            name: workflow.name,
            path: workflow.path,
            score: 0,
            maxScore: 100,
            checks: [],
            securityIssues: [],
            recommendations: [],
        };

        try {
            // Simple YAML parsing for basic analysis
            const content = workflow.content;

            // Security checks
            this.checkWorkflowSecurity(content, analysis);

            // Best practices
            this.checkWorkflowBestPractices(content, analysis);

            // Performance checks
            this.checkWorkflowPerformance(content, analysis);
        } catch (error) {
            analysis.securityIssues.push(`Analysis error: ${error.message}`);
        }

        analysis.score = this.calculateWorkflowScore(analysis.checks);
        return analysis;
    }

    checkWorkflowSecurity(content, analysis) {
        const checks = [];

        // Check for secure checkout
        if (/actions\/checkout@v[34]/.test(content)) {
            checks.push({
                name: 'Secure checkout action',
                status: true,
                weight: 10,
            });
        } else if (/actions\/checkout@v[12]/.test(content)) {
            analysis.securityIssues.push('Outdated checkout action version');
        }

        // Check for hardcoded secrets
        if (
            /(?:password|secret|token|key)\s*[:=]\s*['"][^'"]+['"]/i.test(
                content
            )
        ) {
            analysis.securityIssues.push('Potential hardcoded secret detected');
        }

        // Check for pull_request_target usage
        if (/pull_request_target/.test(content)) {
            analysis.securityIssues.push(
                'Uses pull_request_target - review for security implications'
            );
        }

        // Check permissions
        if (/permissions:/.test(content)) {
            checks.push({
                name: 'Explicit permissions set',
                status: true,
                weight: 15,
            });
        } else {
            analysis.recommendations.push(
                'Set explicit permissions for better security'
            );
        }

        analysis.checks.push(...checks);
    }

    checkWorkflowBestPractices(content, analysis) {
        const checks = [];

        // Check for caching
        if (/actions\/cache|cache:|npm ci/.test(content)) {
            checks.push({ name: 'Uses caching', status: true, weight: 10 });
        } else {
            analysis.recommendations.push('Add caching to improve build times');
        }

        // Check for matrix builds
        if (/strategy:.*matrix:/s.test(content)) {
            checks.push({
                name: 'Uses matrix strategy',
                status: true,
                weight: 8,
            });
        }

        // Check for testing
        if (/test|jest|mocha|cypress|playwright/i.test(content)) {
            checks.push({ name: 'Includes testing', status: true, weight: 15 });
        } else {
            analysis.recommendations.push('Add automated testing to workflow');
        }

        // Check for linting
        if (/lint|eslint|prettier|format/i.test(content)) {
            checks.push({ name: 'Includes linting', status: true, weight: 10 });
        }

        analysis.checks.push(...checks);
    }

    checkWorkflowPerformance(content, analysis) {
        const checks = [];

        // Check for parallel jobs
        const jobMatches = content.match(/^\s{2}[a-zA-Z_-]+:/gm);
        if (jobMatches && jobMatches.length > 1) {
            checks.push({
                name: 'Multiple jobs for parallelism',
                status: true,
                weight: 8,
            });
        }

        analysis.checks.push(...checks);
    }

    async checkEssentialWorkflows(results) {
        const existingWorkflows = results.workflows.map((w) =>
            w.name.toLowerCase()
        );

        const essentialWorkflows = [
            { name: 'ci', patterns: ['ci', 'test', 'build'], weight: 30 },
            {
                name: 'security',
                patterns: ['security', 'codeql', 'dependency'],
                weight: 20,
            },
            {
                name: 'release',
                patterns: ['release', 'publish', 'deploy'],
                weight: 15,
            },
        ];

        let essentialScore = 0;
        const maxEssentialScore = essentialWorkflows.reduce(
            (sum, w) => sum + w.weight,
            0
        );

        for (const essential of essentialWorkflows) {
            const exists = essential.patterns.some((pattern) =>
                existingWorkflows.some((workflow) => workflow.includes(pattern))
            );

            if (exists) {
                essentialScore += essential.weight;
            } else {
                results.recommendations.push(
                    `Consider adding ${essential.name} workflow`
                );
            }
        }

        results.essentialWorkflowsScore = Math.round(
            (essentialScore / maxEssentialScore) * 100
        );
    }

    calculateCICDScore(results) {
        if (results.workflows.length === 0) return 0;

        const workflowScores = results.workflows.map((w) => w.score);
        const avgWorkflowScore =
            workflowScores.reduce((sum, score) => sum + score, 0) /
            workflowScores.length;

        // Combine workflow quality with essential workflows presence
        const essentialScore = results.essentialWorkflowsScore || 0;
        return Math.round(avgWorkflowScore * 0.7 + essentialScore * 0.3);
    }

    calculateWorkflowScore(checks) {
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

    async generateWorkflowTemplates(type = 'node') {
        const templates = {
            node: this.getNodeCITemplate(),
            security: this.getSecurityWorkflowTemplate(),
            release: this.getReleaseWorkflowTemplate(),
        };

        const generated = [];
        for (const [name, content] of Object.entries(templates)) {
            if (type === 'all' || type === name) {
                await this.createOrUpdateFile(
                    `.github/workflows/${name}.yml`,
                    content,
                    `Add ${name} workflow`
                );
                generated.push(`${name}.yml`);
            }
        }

        return generated;
    }

    getNodeCITemplate() {
        return `name: CI

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: \${{ matrix.node-version }}
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run linter
      run: npm run lint --if-present
      
    - name: Run tests
      run: npm test --if-present
      
    - name: Check build
      run: npm run build --if-present

  security:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Run security audit
      run: npm audit --audit-level=high
`;
    }

    getSecurityWorkflowTemplate() {
        return `name: Security Scan

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  schedule:
    - cron: '0 6 * * 1' # Weekly on Monday

permissions:
  contents: read
  security-events: write

jobs:
  codeql:
    name: CodeQL Analysis
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4
      
    - name: Initialize CodeQL
      uses: github/codeql-action/init@v2
      with:
        languages: javascript
        
    - name: Autobuild
      uses: github/codeql-action/autobuild@v2
      
    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v2

  dependency-scan:
    name: Dependency Scan
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run security audit
      run: npm audit --audit-level=moderate
      
    - name: Check for known vulnerabilities
      run: npx audit-ci --moderate
`;
    }

    getReleaseWorkflowTemplate() {
        return `name: Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write
  id-token: write

jobs:
  release:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        registry-url: 'https://registry.npmjs.org'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests
      run: npm test --if-present
      
    - name: Build package
      run: npm run build --if-present
      
    - name: Publish to NPM
      run: npm publish
      env:
        NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}
        
    - name: Create GitHub Release
      uses: actions/create-release@v1
      env:
        GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
      with:
        tag_name: \${{ github.ref }}
        release_name: Release \${{ github.ref }}
        draft: false
        prerelease: false
`;
    }
}

module.exports = CICDManager;
