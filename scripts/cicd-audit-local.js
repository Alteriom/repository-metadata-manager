#!/usr/bin/env node

/**
 * Local CI/CD Auditor
 * Assesses CI/CD workflows and practices without requiring GitHub API access
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class LocalCICDAuditor {
  constructor(basePath = process.cwd()) {
    this.basePath = basePath;
  }

  async auditCICD() {
    const results = {
      score: 0,
      maxScore: 100,
      checks: [],
      workflows: [],
      recommendations: []
    };

    console.log('🔍 Running local CI/CD audit...\n');

    // Check for workflow files
    await this.checkWorkflowFiles(results);
    
    // Check package.json scripts
    await this.checkNpmScripts(results);
    
    // Check for CI/CD best practices
    await this.checkCICDBestPractices(results);
    
    // Check for testing setup
    await this.checkTestingSetup(results);
    
    // Check for automation
    await this.checkAutomation(results);

    results.score = this.calculateCICDScore(results.checks);
    this.displayResults(results);
    
    return results;
  }

  async checkWorkflowFiles(results) {
    let score = 0;
    const issues = [];
    const recommendations = [];
    const workflows = [];

    const workflowsPath = path.join(this.basePath, '.github', 'workflows');
    
    if (fs.existsSync(workflowsPath)) {
      const workflowFiles = fs.readdirSync(workflowsPath)
        .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));
      
      if (workflowFiles.length > 0) {
        score += 20; // Base points for having workflows
        
        // Analyze each workflow
        workflowFiles.forEach(file => {
          const filePath = path.join(workflowsPath, file);
          const content = fs.readFileSync(filePath, 'utf8');
          
          const workflowAnalysis = this.analyzeWorkflow(file, content);
          workflows.push(workflowAnalysis);
          score += workflowAnalysis.score;
        });
        
        // Check for essential workflow types
        const workflowTypes = this.categorizeWorkflows(workflowFiles);
        
        if (workflowTypes.ci) {
          score += 15;
        } else {
          recommendations.push('Add CI workflow for automated testing');
        }
        
        if (workflowTypes.security) {
          score += 10;
        } else {
          recommendations.push('Add security scanning workflow');
        }
        
        if (workflowTypes.release) {
          score += 10;
        } else {
          recommendations.push('Add release/deployment workflow');
        }
        
      } else {
        issues.push('No workflow files found');
        recommendations.push('Create GitHub Actions workflows for CI/CD');
      }
    } else {
      issues.push('No .github/workflows directory found');
      recommendations.push('Set up GitHub Actions workflows');
    }

    results.checks.push({
      name: 'GitHub Actions Workflows',
      status: score >= 30,
      score: Math.min(score, 60), // Cap at 60 for this check
      weight: 60,
      issues: issues,
      recommendations: recommendations,
      workflows: workflows
    });
  }

  analyzeWorkflow(filename, content) {
    const analysis = {
      name: filename,
      score: 0,
      features: [],
      issues: [],
      recommendations: []
    };

    // Check for security best practices
    if (/actions\/checkout@v[4-9]/.test(content)) {
      analysis.features.push('Uses latest checkout action');
      analysis.score += 3;
    } else if (/actions\/checkout@v[23]/.test(content)) {
      analysis.features.push('Uses recent checkout action');
      analysis.score += 2;
    } else {
      analysis.issues.push('Uses outdated checkout action');
    }

    // Check for permissions
    if (/permissions:/.test(content)) {
      analysis.features.push('Defines explicit permissions');
      analysis.score += 5;
    } else {
      analysis.recommendations.push('Add explicit permissions for security');
    }

    // Check for caching
    if (/cache:|actions\/cache/.test(content)) {
      analysis.features.push('Uses caching');
      analysis.score += 4;
    } else {
      analysis.recommendations.push('Add caching to improve performance');
    }

    // Check for matrix builds
    if (/strategy:.*matrix:/s.test(content)) {
      analysis.features.push('Uses matrix strategy');
      analysis.score += 3;
    }

    // Check for testing
    if (/npm test|yarn test|test/i.test(content)) {
      analysis.features.push('Includes testing');
      analysis.score += 5;
    }

    // Check for linting
    if (/lint|eslint|prettier/i.test(content)) {
      analysis.features.push('Includes linting');
      analysis.score += 3;
    }

    // Check for multiple jobs
    const jobMatches = content.match(/^\s{2,4}[a-zA-Z_-]+:/gm);
    if (jobMatches && jobMatches.length > 1) {
      analysis.features.push('Multiple jobs for parallelism');
      analysis.score += 2;
    }

    return analysis;
  }

  categorizeWorkflows(workflowFiles) {
    return {
      ci: workflowFiles.some(f => /ci|test|build/i.test(f)),
      security: workflowFiles.some(f => /security|codeql|dependency/i.test(f)),
      release: workflowFiles.some(f => /release|deploy|publish/i.test(f))
    };
  }

  async checkNpmScripts(results) {
    let score = 0;
    const issues = [];
    const recommendations = [];

    const packageJsonPath = path.join(this.basePath, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const scripts = packageJson.scripts || {};
        
        // Check for essential scripts
        const essentialScripts = [
          { name: 'test', weight: 8 },
          { name: 'lint', weight: 5 },
          { name: 'build', weight: 5 },
          { name: 'start', weight: 3 }
        ];
        
        essentialScripts.forEach(({ name, weight }) => {
          if (scripts[name]) {
            score += weight;
          } else {
            recommendations.push(`Add '${name}' script to package.json`);
          }
        });

        // Check for CI-specific scripts
        const ciScripts = ['test:ci', 'lint:ci', 'build:ci', 'audit'];
        ciScripts.forEach(script => {
          if (scripts[script]) {
            score += 2;
          }
        });

        // Check for release scripts
        const releaseScripts = Object.keys(scripts).filter(s => s.includes('release'));
        if (releaseScripts.length > 0) {
          score += 5;
        } else {
          recommendations.push('Add release scripts for version management');
        }

      } catch (error) {
        issues.push('Error reading package.json');
      }
    } else {
      issues.push('No package.json found');
    }

    results.checks.push({
      name: 'NPM Scripts Configuration',
      status: score >= 15,
      score: score,
      weight: 25,
      issues: issues,
      recommendations: recommendations
    });
  }

  async checkCICDBestPractices(results) {
    let score = 0;
    const issues = [];
    const recommendations = [];

    // Check for .gitignore
    if (fs.existsSync(path.join(this.basePath, '.gitignore'))) {
      score += 3;
    } else {
      issues.push('No .gitignore file');
    }

    // Check for environment files
    if (fs.existsSync(path.join(this.basePath, '.env.example'))) {
      score += 3;
    } else {
      recommendations.push('Add .env.example for environment configuration');
    }

    // Check for Docker support
    if (fs.existsSync(path.join(this.basePath, 'Dockerfile'))) {
      score += 5;
    } else {
      recommendations.push('Consider adding Dockerfile for containerization');
    }

    // Check for dependency lock files
    if (fs.existsSync(path.join(this.basePath, 'package-lock.json'))) {
      score += 4;
    } else if (fs.existsSync(path.join(this.basePath, 'yarn.lock'))) {
      score += 4;
    } else {
      issues.push('No dependency lock file found');
    }

    results.checks.push({
      name: 'CI/CD Best Practices',
      status: score >= 8,
      score: score,
      weight: 15,
      issues: issues,
      recommendations: recommendations
    });
  }

  async checkTestingSetup(results) {
    let score = 0;
    const issues = [];
    const recommendations = [];

    const packageJsonPath = path.join(this.basePath, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // Check for test dependencies
        const devDeps = packageJson.devDependencies || {};
        const testFrameworks = ['jest', 'mocha', 'jasmine', 'vitest', 'cypress', 'playwright'];
        
        const hasTestFramework = testFrameworks.some(framework => devDeps[framework]);
        if (hasTestFramework) {
          score += 8;
        } else {
          issues.push('No testing framework found in devDependencies');
          recommendations.push('Add a testing framework (Jest, Mocha, etc.)');
        }
        
        // Check for test configuration files
        const testConfigs = [
          'jest.config.js', 'jest.config.json',
          '.mocharc.json', 'mocha.opts',
          'cypress.config.js', 'playwright.config.js'
        ];
        
        const hasTestConfig = testConfigs.some(config => 
          fs.existsSync(path.join(this.basePath, config))
        );
        
        if (hasTestConfig) {
          score += 4;
        }
        
        // Check for test directory
        const testDirs = ['test', 'tests', '__tests__', 'spec'];
        const hasTestDir = testDirs.some(dir => 
          fs.existsSync(path.join(this.basePath, dir))
        );
        
        if (hasTestDir) {
          score += 3;
        } else {
          recommendations.push('Create a dedicated test directory');
        }

      } catch (error) {
        issues.push('Error analyzing test setup');
      }
    }

    results.checks.push({
      name: 'Testing Setup',
      status: score >= 10,
      score: score,
      weight: 20,
      issues: issues,
      recommendations: recommendations
    });
  }

  async checkAutomation(results) {
    let score = 0;
    const issues = [];
    const recommendations = [];

    // Check for dependabot
    if (fs.existsSync(path.join(this.basePath, '.github', 'dependabot.yml'))) {
      score += 5;
    } else {
      recommendations.push('Add dependabot.yml for automated dependency updates');
    }

    // Check for code owners
    if (fs.existsSync(path.join(this.basePath, '.github', 'CODEOWNERS'))) {
      score += 3;
    }

    // Check for issue/PR templates
    const templatesPath = path.join(this.basePath, '.github');
    if (fs.existsSync(templatesPath)) {
      const templates = fs.readdirSync(templatesPath, { withFileTypes: true });
      
      if (templates.some(t => t.name.includes('ISSUE_TEMPLATE'))) {
        score += 2;
      }
      
      if (templates.some(t => t.name.includes('PULL_REQUEST_TEMPLATE'))) {
        score += 2;
      }
    }

    // Check for release automation
    const packageJsonPath = path.join(this.basePath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const scripts = packageJson.scripts || {};
        
        const releaseScripts = Object.keys(scripts).filter(s => 
          s.includes('release') || s.includes('version')
        );
        
        if (releaseScripts.length > 0) {
          score += 3;
        }
      } catch (error) {
        // Ignore
      }
    }

    results.checks.push({
      name: 'Process Automation',
      status: score >= 8,
      score: score,
      weight: 15,
      issues: issues,
      recommendations: recommendations
    });
  }

  calculateCICDScore(checks) {
    if (checks.length === 0) return 0;
    const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
    const earnedScore = checks.reduce((sum, check) => sum + (check.score / check.weight * check.weight), 0);
    return Math.round((earnedScore / totalWeight) * 100);
  }

  displayResults(results) {
    console.log(chalk.bold('⚙️ LOCAL CI/CD AUDIT RESULTS'));
    console.log('='.repeat(50));
    console.log(chalk.bold(`Overall Score: ${results.score}/100`));
    
    const status = results.score >= 90 ? '🟢 Excellent' : 
                   results.score >= 75 ? '🟡 Good' : 
                   results.score >= 50 ? '🟠 Fair' : '🔴 Needs Improvement';
    console.log(`Status: ${status}\n`);

    console.log('📁 CI/CD CHECKS:');
    console.log('-'.repeat(50));
    
    results.checks.forEach(check => {
      const icon = check.status ? '✅' : '❌';
      const percentage = Math.round((check.score / check.weight) * 100);
      console.log(`${icon} ${check.name} - ${check.score}/${check.weight} (${percentage}%)`);
      
      if (check.workflows && check.workflows.length > 0) {
        check.workflows.forEach(workflow => {
          console.log(`   📄 ${workflow.name} (Score: ${workflow.score})`);
          if (workflow.features.length > 0) {
            workflow.features.slice(0, 2).forEach(feature => {
              console.log(chalk.green(`      ✅ ${feature}`));
            });
          }
          if (workflow.issues.length > 0) {
            workflow.issues.slice(0, 1).forEach(issue => {
              console.log(chalk.yellow(`      ⚠️  ${issue}`));
            });
          }
        });
      }
      
      if (check.issues && check.issues.length > 0) {
        check.issues.forEach(issue => {
          console.log(chalk.yellow(`   ⚠️  ${issue}`));
        });
      }
      
      if (check.recommendations && check.recommendations.length > 0) {
        check.recommendations.slice(0, 2).forEach(rec => {
          console.log(chalk.blue(`   💡 ${rec}`));
        });
      }
    });

    console.log('\n🚀 RECOMMENDED IMPROVEMENTS:');
    console.log('-'.repeat(50));
    console.log('1. Add comprehensive CI workflow with matrix testing');
    console.log('2. Implement security scanning (CodeQL, dependency audit)');
    console.log('3. Set up automated testing and code quality checks');
    console.log('4. Configure caching for faster builds');
    console.log('5. Add deployment/release automation\n');
  }
}

// Run audit if called directly
if (require.main === module) {
  const auditor = new LocalCICDAuditor();
  auditor.auditCICD().catch(console.error);
}

module.exports = LocalCICDAuditor;
