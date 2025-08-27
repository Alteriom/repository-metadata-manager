const SecurityManager = require('./SecurityManager');
const BranchProtectionManager = require('./BranchProtectionManager');
const DocumentationManager = require('./DocumentationManager');
const CICDManager = require('./CICDManager');

class HealthScoreManager {
  constructor(config) {
    this.config = config;
    this.security = new SecurityManager(config);
    this.branches = new BranchProtectionManager(config);
    this.docs = new DocumentationManager(config);
    this.cicd = new CICDManager(config);
  }

  async calculateHealthScore() {
    const results = {
      overallScore: 0,
      grade: 'F',
      categories: {},
      recommendations: [],
      criticalIssues: [],
      summary: {}
    };

    // Run all audits in parallel
    const [securityAudit, branchAudit, docsAudit, cicdAudit] = await Promise.all([
      this.security.securityAudit().catch(err => ({ score: 0, error: err.message })),
      this.branches.auditBranchProtection().catch(err => ({ score: 0, error: err.message })),
      this.docs.auditDocumentation().catch(err => ({ score: 0, error: err.message })),
      this.cicd.auditWorkflows().catch(err => ({ score: 0, error: err.message }))
    ]);

    // Category weights
    const weights = {
      security: 30,
      documentation: 25,
      cicd: 25,
      branchProtection: 20
    };

    // Store category results
    results.categories = {
      security: { ...securityAudit, weight: weights.security },
      documentation: { ...docsAudit, weight: weights.documentation },
      cicd: { ...cicdAudit, weight: weights.cicd },
      branchProtection: { ...branchAudit, weight: weights.branchProtection }
    };

    // Calculate weighted score
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const [category, data] of Object.entries(results.categories)) {
      if (!data.error) {
        totalWeightedScore += (data.score * data.weight);
        totalWeight += data.weight;
      } else {
        results.criticalIssues.push(`${category}: ${data.error}`);
      }
    }

    results.overallScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
    results.grade = this.calculateGrade(results.overallScore);

    // Generate recommendations
    this.generateRecommendations(results);

    // Create summary
    this.generateSummary(results);

    return results;
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
        recommendations.push({
          category,
          priority: data.score < 40 ? 'HIGH' : 'MEDIUM',
          message: this.getCategoryRecommendation(category, data.score),
          actions: this.getCategoryActions(category, data)
        });
      }
    }

    // Sort by priority and score
    recommendations.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    results.recommendations = recommendations;
  }

  getCategoryRecommendation(category, score) {
    const messages = {
      security: score < 40 ? 'Critical security issues need immediate attention' : 'Security practices need improvement',
      documentation: score < 40 ? 'Essential documentation is missing' : 'Documentation could be more comprehensive',
      cicd: score < 40 ? 'CI/CD pipeline needs significant improvement' : 'CI/CD practices could be enhanced',
      branchProtection: score < 40 ? 'Branch protection is critically lacking' : 'Branch protection rules need strengthening'
    };
    return messages[category] || 'Needs improvement';
  }

  getCategoryActions(category, data) {
    const actions = {
      security: [
        'Enable security features in repository settings',
        'Add SECURITY.md file',
        'Set up Dependabot alerts',
        'Review and update dependencies'
      ],
      documentation: [
        'Create missing documentation files',
        'Improve README structure and content',
        'Add contributing guidelines',
        'Set up issue and PR templates'
      ],
      cicd: [
        'Add automated testing workflow',
        'Set up security scanning',
        'Implement release automation',
        'Add code quality checks'
      ],
      branchProtection: [
        'Enable branch protection on main branch',
        'Require pull request reviews',
        'Set up required status checks',
        'Enable admin enforcement'
      ]
    };

    return actions[category] || [];
  }

  generateSummary(results) {
    const summary = {
      strengths: [],
      weaknesses: [],
      quickWins: [],
      longTermGoals: []
    };

    // Identify strengths (scores > 80)
    for (const [category, data] of Object.entries(results.categories)) {
      if (data.score > 80) {
        summary.strengths.push(`${category}: ${data.score}%`);
      } else if (data.score < 50) {
        summary.weaknesses.push(`${category}: ${data.score}%`);
      }
    }

    // Quick wins (easy improvements)
    if (results.categories.documentation.score < 70) {
      summary.quickWins.push('Add missing documentation files');
    }
    if (results.categories.branchProtection.score < 70) {
      summary.quickWins.push('Enable branch protection rules');
    }

    // Long term goals
    if (results.categories.security.score < 80) {
      summary.longTermGoals.push('Implement comprehensive security practices');
    }
    if (results.categories.cicd.score < 80) {
      summary.longTermGoals.push('Establish robust CI/CD pipeline');
    }

    results.summary = summary;
  }

  async generateHealthReport() {
    const health = await this.calculateHealthScore();
    
    let report = `# Repository Health Report
Generated: ${new Date().toISOString().split('T')[0]}

## Overall Score: ${health.overallScore}/100 (Grade: ${health.grade})

`;

    // Category breakdown
    report += `## Category Scores\n\n`;
    for (const [category, data] of Object.entries(health.categories)) {
      const status = data.score >= 80 ? '✅' : data.score >= 60 ? '⚠️' : '❌';
      report += `- ${status} **${category}**: ${data.score}% (Weight: ${data.weight}%)\n`;
    }

    // Recommendations
    if (health.recommendations.length > 0) {
      report += `\n## Priority Recommendations\n\n`;
      health.recommendations.forEach((rec, index) => {
        const priority = rec.priority === 'HIGH' ? '🔴' : '🟡';
        report += `${index + 1}. ${priority} **${rec.category}**: ${rec.message}\n`;
        rec.actions.slice(0, 3).forEach(action => {
          report += `   - ${action}\n`;
        });
        report += '\n';
      });
    }

    // Summary
    report += `## Summary\n\n`;
    if (health.summary.strengths.length > 0) {
      report += `**Strengths**: ${health.summary.strengths.join(', ')}\n\n`;
    }
    if (health.summary.weaknesses.length > 0) {
      report += `**Areas for Improvement**: ${health.summary.weaknesses.join(', ')}\n\n`;
    }
    if (health.summary.quickWins.length > 0) {
      report += `**Quick Wins**: ${health.summary.quickWins.join(', ')}\n\n`;
    }

    return { health, report };
  }
}

module.exports = HealthScoreManager;
