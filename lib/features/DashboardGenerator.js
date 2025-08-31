/**
 * Simple Dashboard Generator for Organization Health Visualization
 * Creates an HTML report for organization-wide repository health
 */
class DashboardGenerator {
    constructor(config = {}) {
        this.config = config;
    }

    generateHTMLDashboard(orgResults) {
        const report = this.generateHealthReport(orgResults);
        
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alteriom Organization Health Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f7fa;
        }
        
        .dashboard {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .header .subtitle {
            font-size: 1.2rem;
            opacity: 0.9;
        }
        
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .card {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        
        .card h3 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .card .label {
            color: #666;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .grade-a { color: #10b981; }
        .grade-b { color: #3b82f6; }
        .grade-c { color: #f59e0b; }
        .grade-d { color: #ef4444; }
        .grade-f { color: #dc2626; }
        
        .repos-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .repo-card {
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .repo-header {
            display: flex;
            justify-content: between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .repo-name {
            font-weight: 600;
            font-size: 1.1rem;
        }
        
        .repo-score {
            font-size: 1.5rem;
            font-weight: bold;
        }
        
        .categories {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 15px;
        }
        
        .category {
            display: flex;
            justify-content: space-between;
            padding: 8px;
            background: #f8fafc;
            border-radius: 6px;
            font-size: 0.9rem;
        }
        
        .recommendations {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .recommendations h2 {
            margin-bottom: 20px;
            color: #374151;
        }
        
        .recommendation {
            padding: 15px;
            margin-bottom: 10px;
            border-left: 4px solid #3b82f6;
            background: #eff6ff;
            border-radius: 0 6px 6px 0;
        }
        
        .priority-high { border-left-color: #dc2626; background: #fef2f2; }
        .priority-medium { border-left-color: #f59e0b; background: #fffbeb; }
        .priority-low { border-left-color: #10b981; background: #f0fdf4; }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: #666;
            font-size: 0.9rem;
        }
        
        .status-icon {
            font-size: 1.2rem;
            margin-right: 8px;
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>🏢 Alteriom Organization Health Dashboard</h1>
            <div class="subtitle">Repository Compliance & Health Monitoring</div>
            <div style="margin-top: 15px; font-size: 0.9rem;">
                Generated: ${new Date().toLocaleString()} | 
                Total Repositories: ${report.summary.total_repositories}
            </div>
        </div>
        
        <div class="summary-cards">
            <div class="card">
                <h3 class="grade-${report.grade.toLowerCase()}">${report.summary.average_score}/100</h3>
                <div class="label">Average Health Score</div>
            </div>
            <div class="card">
                <h3 class="grade-a">${report.summary.healthy_repositories}</h3>
                <div class="label">Healthy Repositories</div>
            </div>
            <div class="card">
                <h3 class="grade-d">${report.summary.unhealthy_repositories}</h3>
                <div class="label">Need Attention</div>
            </div>
            <div class="card">
                <h3 class="grade-${report.grade.toLowerCase()}">${report.grade}</h3>
                <div class="label">Overall Grade</div>
            </div>
        </div>
        
        <div class="repos-grid">
            ${report.repositories.map(repo => `
                <div class="repo-card">
                    <div class="repo-header">
                        <div class="repo-name">
                            ${this.getStatusIcon(repo.health_score)} ${repo.name}
                        </div>
                        <div class="repo-score grade-${repo.grade.toLowerCase()}">
                            ${repo.health_score}/100 (${repo.grade})
                        </div>
                    </div>
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 10px;">
                        ${repo.description || 'No description available'}
                    </div>
                    <div style="font-size: 0.8rem; color: #888;">
                        Language: ${repo.language || 'Unknown'} | 
                        ${repo.private ? 'Private' : 'Public'}
                    </div>
                    ${repo.categories ? `
                        <div class="categories">
                            ${Object.entries(repo.categories).map(([name, data]) => `
                                <div class="category">
                                    <span>${name}</span>
                                    <span class="grade-${this.getGradeFromScore(data.score).toLowerCase()}">
                                        ${data.score}%
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
        
        ${report.recommendations.length > 0 ? `
            <div class="recommendations">
                <h2>🎯 Organization Recommendations</h2>
                ${report.recommendations.map(rec => `
                    <div class="recommendation priority-${rec.priority}">
                        <strong>${rec.type.toUpperCase()}:</strong> ${rec.message}
                    </div>
                `).join('')}
            </div>
        ` : ''}
        
        <div class="footer">
            <p>Generated by Alteriom Repository Metadata Manager | 
               <a href="https://github.com/Alteriom/repository-metadata-manager">GitHub Repository</a>
            </p>
        </div>
    </div>
</body>
</html>`;
        
        return html;
    }

    generateHealthReport(orgResults) {
        return {
            timestamp: new Date().toISOString(),
            organization: this.config.owner || 'Alteriom',
            summary: orgResults.summary,
            grade: this.getGradeFromScore(orgResults.summary.average_score),
            repositories: orgResults.repositories,
            recommendations: orgResults.recommendations || []
        };
    }

    getGradeFromScore(score) {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    getStatusIcon(score) {
        if (score >= 90) return '🟢';
        if (score >= 70) return '🟡';
        if (score >= 50) return '🟠';
        return '🔴';
    }

    async saveDashboard(orgResults, filename = 'dashboard.html') {
        const fs = require('fs').promises;
        const path = require('path');
        
        const html = this.generateHTMLDashboard(orgResults);
        const filepath = path.join(process.cwd(), filename);
        
        await fs.writeFile(filepath, html, 'utf8');
        console.log(`📊 Dashboard saved to: ${filepath}`);
        
        return filepath;
    }
}

module.exports = DashboardGenerator;