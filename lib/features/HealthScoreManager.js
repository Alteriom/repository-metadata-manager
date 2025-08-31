const SecurityManager = require('./SecurityManager');
const BranchProtectionManager = require('./BranchProtectionManager');
const DocumentationManager = require('./DocumentationManager');
const CICDManager = require('./CICDManager');
const { spawn } = require('child_process');
const path = require('path');

class HealthScoreManager {
    constructor(config) {
        this.config = config;
        this.security = new SecurityManager(config);
        this.branches = new BranchProtectionManager(config);
        this.docs = new DocumentationManager(config);
        this.cicd = new CICDManager(config);
        this.useLocalFallback = false;
    }

    async calculateHealthScore() {
        const results = {
            score: 0,
            grade: 'F',
            categories: {},
            recommendations: [],
            criticalIssues: [],
            summary: {},
        };

        console.log('🔍 Calculating repository health score...');
        
        // Try GitHub API first, fallback to local auditing
        let securityAudit, branchAudit, docsAudit, cicdAudit;

        try {
            // Run all audits in parallel
            [securityAudit, branchAudit, docsAudit, cicdAudit] = await Promise.all([
                this.security.securityAudit().catch((err) => ({ score: 0, error: err.message })),
                this.branches.auditBranchProtection().catch((err) => ({ score: 0, error: err.message })),
                this.docs.auditDocumentation().catch((err) => ({ score: 0, error: err.message })),
                this.cicd.auditWorkflows().catch((err) => ({ score: 0, error: err.message }))
            ]);

            // If any failed due to API issues, use local fallback
            if (securityAudit.error || branchAudit.error || docsAudit.error || cicdAudit.error) {
                console.log('⚠️  API audits failed, using enhanced local auditing...');
                this.useLocalFallback = true;
                
                // Use local audit scripts as fallback
                [securityAudit, branchAudit, docsAudit, cicdAudit] = await Promise.all([
                    this.runLocalSecurityAudit(),
                    this.runLocalBranchAudit(),
                    this.runLocalDocumentationAudit(),
                    this.runLocalCICDAudit()
                ]);
            }
        } catch (error) {
            console.log('⚠️  All audits failed, using enhanced local auditing...');
            this.useLocalFallback = true;
            
            // Use local audit scripts as fallback
            [securityAudit, branchAudit, docsAudit, cicdAudit] = await Promise.all([
                this.runLocalSecurityAudit(),
                this.runLocalBranchAudit(),
                this.runLocalDocumentationAudit(),
                this.runLocalCICDAudit()
            ]);
        }

        // Category weights
        const weights = {
            security: 30,
            documentation: 25,
            cicd: 25,
            branchProtection: 20,
        };

        // Store category results
        results.categories = {
            security: { ...securityAudit, weight: weights.security },
            documentation: { ...docsAudit, weight: weights.documentation },
            cicd: { ...cicdAudit, weight: weights.cicd },
            branchProtection: {
                ...branchAudit,
                weight: weights.branchProtection,
            },
        };

        // Calculate weighted score
        let totalWeightedScore = 0;
        let totalWeight = 0;

        for (const [category, data] of Object.entries(results.categories)) {
            if (!data.error && typeof data.score === 'number') {
                totalWeightedScore += data.score * data.weight;
                totalWeight += data.weight;
            } else {
                results.criticalIssues.push(`${category}: ${data.error || 'Invalid score'}`);
            }
        }

        results.score = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
        results.grade = this.calculateGrade(results.score);

        // Generate recommendations
        this.generateRecommendations(results);

        // Create summary
        this.generateSummary(results);

        return results;
    }

    async runLocalSecurityAudit() {
        try {
            const result = await this.runLocalScript('security-audit-local.js');
            // Parse the security score from local audit output
            const scoreMatch = result.match(/Overall Score: (\d+)\/100/);
            const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
            
            return {
                score,
                local: true,
                source: 'local-audit',
                details: result
            };
        } catch (error) {
            return { score: 0, error: `Local security audit failed: ${error.message}` };
        }
    }

    async runLocalBranchAudit() {
        try {
            const result = await this.runLocalScript('branch-protection-local.js');
            // Parse branch protection score from local audit output
            const scoreMatch = result.match(/Overall Score: (\d+)\/100/);
            const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
            
            return {
                score,
                local: true,
                source: 'local-audit',
                details: result
            };
        } catch (error) {
            return { score: 0, error: `Local branch audit failed: ${error.message}` };
        }
    }

    async runLocalDocumentationAudit() {
        try {
            const result = await this.runLocalScript('docs-compliance-check.js');
            // Parse documentation score from local audit output
            const scoreMatch = result.match(/Overall Score: (\d+)\/100/);
            const score = scoreMatch ? parseInt(scoreMatch[1]) : 100; // Default to 100 if no issues found
            
            return {
                score,
                local: true,
                source: 'local-audit',
                details: result
            };
        } catch (error) {
            return { score: 0, error: `Local documentation audit failed: ${error.message}` };
        }
    }

    async runLocalCICDAudit() {
        try {
            const result = await this.runLocalScript('cicd-audit-local.js');
            // Parse CI/CD score from local audit output
            const scoreMatch = result.match(/Overall Score: (\d+)\/100/);
            const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
            
            return {
                score,
                local: true,
                source: 'local-audit',
                details: result
            };
        } catch (error) {
            return { score: 0, error: `Local CI/CD audit failed: ${error.message}` };
        }
    }

    async runLocalScript(scriptName) {
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(process.cwd(), 'scripts', scriptName);
            const child = spawn('node', [scriptPath], {
                cwd: process.cwd(),
                stdio: 'pipe'
            });

            let output = '';
            let errorOutput = '';

            child.stdout.on('data', (data) => {
                output += data.toString();
            });

            child.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve(output);
                } else {
                    reject(new Error(`Script failed with code ${code}: ${errorOutput}`));
                }
            });

            child.on('error', (error) => {
                reject(error);
            });
        });
    }

    calculateGrade(score) {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    generateRecommendations(results) {
        const recommendations = [];

        // Priority recommendations based on scores
        for (const [category, data] of Object.entries(results.categories)) {
            if (data.score < 70) {
                if (category === 'security') {
                    recommendations.push('🔴 Critical security issues need immediate attention');
                } else if (category === 'cicd') {
                    recommendations.push('🔴 CI/CD pipeline needs significant improvement');
                } else if (category === 'branchProtection') {
                    recommendations.push('🔴 Branch protection is critically lacking');
                } else if (category === 'documentation') {
                    recommendations.push('📝 Documentation quality needs improvement');
                }
            }
        }

        // Add specific recommendations based on local audit results
        if (this.useLocalFallback) {
            recommendations.push('ℹ️  GitHub API access limited - consider configuring API token for enhanced features');
        }

        // Sort by priority (security first)
        const priorityOrder = ['security', 'branchProtection', 'cicd', 'documentation'];
        recommendations.sort((a, b) => {
            const priorityA = priorityOrder.findIndex(p => a.toLowerCase().includes(p));
            const priorityB = priorityOrder.findIndex(p => b.toLowerCase().includes(p));
            return priorityA - priorityB;
        });

        results.recommendations = recommendations.slice(0, 5); // Top 5 recommendations
    }

    generateSummary(results) {
        results.summary = {
            totalScore: results.score,
            grade: results.grade,
            categoryCount: Object.keys(results.categories).length,
            passingCategories: Object.values(results.categories).filter(c => c.score >= 70).length,
            criticalIssues: results.criticalIssues.length,
            localAudit: this.useLocalFallback,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = HealthScoreManager;