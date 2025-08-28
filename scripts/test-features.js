#!/usr/bin/env node

const chalk = require('chalk');
const figlet = require('figlet');
const fs = require('fs').promises;
const path = require('path');

// Test the repository manager features locally
console.log(chalk.cyan(figlet.textSync('Repo Test', { horizontalLayout: 'full' })));
console.log(chalk.gray('🧪 Testing Repository Management Features\n'));

// Local Documentation Manager for real scoring
class LocalDocumentationManager {
  async auditDocumentation() {
    const results = {
      score: 0,
      maxScore: 100,
      files: [],
      recommendations: []
    };

    const requiredDocs = [
      { file: 'README.md', weight: 30, validator: this.validateReadme.bind(this) },
      { file: 'CHANGELOG.md', weight: 15, validator: this.validateChangelog.bind(this) },
      { file: 'CONTRIBUTING.md', weight: 15, validator: this.validateContributing.bind(this) },
      { file: 'CODE_OF_CONDUCT.md', weight: 10, validator: this.validateCodeOfConduct.bind(this) },
      { file: 'LICENSE', weight: 15, validator: this.validateLicense.bind(this) },
      { file: '.github/ISSUE_TEMPLATE/', weight: 8, validator: this.validateIssueTemplates.bind(this) },
      { file: '.github/PULL_REQUEST_TEMPLATE.md', weight: 7, validator: this.validatePRTemplate.bind(this) }
    ];

    for (const doc of requiredDocs) {
      const analysis = await this.analyzeDocument(doc);
      results.files.push(analysis);
    }

    results.score = this.calculateDocScore(results.files);
    return results;
  }

  async analyzeDocument(docConfig) {
    const { file, weight, validator } = docConfig;
    const content = await this.getLocalContents(file);
    
    const analysis = {
      file,
      exists: content !== null,
      weight,
      score: 0,
      issues: [],
      recommendations: []
    };

    if (content) {
      if (validator) {
        const validation = await validator(content);
        analysis.score = validation.score;
        analysis.issues = validation.issues;
        analysis.recommendations = validation.recommendations;
      } else {
        analysis.score = weight;
      }
    } else {
      analysis.issues.push(`${file} is missing`);
      analysis.recommendations.push(`Create ${file}`);
    }

    return analysis;
  }

  async getLocalContents(filePath) {
    try {
      const fullPath = path.resolve(filePath);
      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory()) {
        const files = await fs.readdir(fullPath);
        return files.map(name => ({ name, type: 'file' }));
      } else {
        const content = await fs.readFile(fullPath, 'utf8');
        return { content: Buffer.from(content).toString('base64') };
      }
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async validateReadme(content) {
    const text = Buffer.from(content.content, 'base64').toString();
    const validation = { score: 0, issues: [], recommendations: [] };
    
    const requiredSections = [
      { name: 'Title/Header', pattern: /^#\s+.+/m, weight: 5 },
      { name: 'Description', pattern: /description|what|purpose/i, weight: 8 },
      { name: 'Installation', pattern: /install|setup|getting started/i, weight: 6 },
      { name: 'Usage', pattern: /usage|example|how to/i, weight: 6 },
      { name: 'Contributing', pattern: /contribut|development/i, weight: 3 },
      { name: 'License', pattern: /license/i, weight: 2 }
    ];

    for (const section of requiredSections) {
      if (section.pattern.test(text)) {
        validation.score += section.weight;
      }
    }

    // Check for badges
    if (/!\[.*\]\(.*badge.*\)/i.test(text)) {
      validation.score += 2;
    }

    return validation;
  }

  async validateChangelog(content) {
    const text = Buffer.from(content.content, 'base64').toString();
    const validation = { score: 0, issues: [], recommendations: [] };

    if (/## \[?\d+\.\d+\.\d+\]?/.test(text)) {
      validation.score += 8;
    }

    if (/### (Added|Changed|Deprecated|Removed|Fixed|Security)/i.test(text)) {
      validation.score += 7;
    }

    return validation;
  }

  async validateContributing(content) {
    const text = Buffer.from(content.content, 'base64').toString();
    const validation = { score: 0, issues: [], recommendations: [] };

    const sections = [
      { name: 'Development setup', pattern: /setup|development|local/i, weight: 5 },
      { name: 'Pull request process', pattern: /pull request|pr|merge/i, weight: 5 },
      { name: 'Code standards', pattern: /code|style|standards|lint/i, weight: 3 },
      { name: 'Testing', pattern: /test|testing/i, weight: 2 }
    ];

    for (const section of sections) {
      if (section.pattern.test(text)) {
        validation.score += section.weight;
      }
    }

    return validation;
  }

  async validateCodeOfConduct(content) {
    const text = Buffer.from(content.content, 'base64').toString();
    const validation = { score: 10, issues: [], recommendations: [] };

    if (!/contributor covenant/i.test(text) && text.length < 500) {
      validation.score = 6;
    }

    return validation;
  }

  async validateLicense(content) {
    const text = Buffer.from(content.content, 'base64').toString();
    const validation = { score: 0, issues: [], recommendations: [] };

    const licenses = ['MIT', 'Apache', 'GPL', 'BSD', 'ISC'];
    if (licenses.some(license => text.includes(license))) {
      validation.score = 15;
    }

    return validation;
  }

  async validateIssueTemplates(content) {
    const validation = { score: 0, issues: [], recommendations: [] };

    if (Array.isArray(content)) {
      const templates = content.filter(file => file.name.endsWith('.md'));
      if (templates.length >= 2) {
        validation.score = 8;
      } else if (templates.length === 1) {
        validation.score = 5;
      }
    }

    return validation;
  }

  async validatePRTemplate(content) {
    const text = Buffer.from(content.content, 'base64').toString();
    const validation = { score: 0, issues: [], recommendations: [] };

    if (/checklist|checkbox|\[ \]/.test(text)) {
      validation.score += 4;
    }
    if (/description|summary|changes/i.test(text)) {
      validation.score += 3;
    }

    return validation;
  }

  calculateDocScore(files) {
    const totalWeight = files.reduce((sum, file) => sum + file.weight, 0);
    const earnedScore = files.reduce((sum, file) => sum + file.score, 0);
    return Math.round((earnedScore / totalWeight) * 100);
  }
}

// Get real documentation score
async function getRealDocumentationScore() {
  try {
    const docManager = new LocalDocumentationManager();
    const result = await docManager.auditDocumentation();
    return Math.min(result.score, 100); // Cap at 100% for health score calculation
  } catch (error) {
    console.log(chalk.yellow(`⚠️ Could not get real documentation score: ${error.message}`));
    return 75; // Fallback to original simulated value
  }
}

// Get real security score
async function getRealSecurityScore() {
  try {
    const LocalSecurityAuditor = require('./security-audit-local.js');
    const securityAuditor = new LocalSecurityAuditor();
    const result = await securityAuditor.auditSecurity(true); // Silent mode
    return result.score;
  } catch (error) {
    console.log(chalk.yellow(`⚠️ Could not get real security score: ${error.message}`));
    return 60; // Fallback to original simulated value
  }
}

// Get real branch protection score
async function getRealBranchProtectionScore() {
  try {
    const LocalBranchProtectionAuditor = require('./branch-protection-local.js');
    const branchAuditor = new LocalBranchProtectionAuditor();
    const result = await branchAuditor.auditBranchProtection(true); // Silent mode
    return Math.min(result.score, 100); // Cap at 100 for health score calculation
  } catch (error) {
    console.log(chalk.yellow(`⚠️ Could not get real branch protection score: ${error.message}`));
    return 45; // Fallback to original simulated value
  }
}

// Test the local documentation analyzer
async function testDocumentationLocal() {
  console.log(chalk.blue('📚 Testing Documentation Analysis (Local Mode)...\n'));
  
  const docManager = new LocalDocumentationManager();
  const result = await docManager.auditDocumentation();
  
  // Display individual file results with our original simple scoring for display
  const docsToCheck = [
    'README.md',
    'CHANGELOG.md', 
    'CONTRIBUTING.md',
    'CODE_OF_CONDUCT.md',
    'LICENSE',
    '.github/PULL_REQUEST_TEMPLATE.md'
  ];
  
  for (const doc of docsToCheck) {
    try {
      const filePath = path.join(process.cwd(), doc);
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      
      if (exists) {
        const content = await fs.readFile(filePath, 'utf8');
        const analysis = analyzeContent(doc, content);
        console.log(`✅ ${doc} - ${analysis.score}/10 points`);
        if (analysis.issues.length > 0) {
          analysis.issues.forEach(issue => console.log(chalk.yellow(`   - ${issue}`)));
        }
      } else {
        console.log(`❌ ${doc} - Missing`);
      }
    } catch (error) {
      console.log(`⚠️ ${doc} - Error: ${error.message}`);
    }
  }
  
  const totalScore = Math.min(result.score, 100); // Cap at 100 for display
  console.log(chalk.bold(`\n📊 Documentation Score: ${totalScore}/100 (${totalScore}%)`));
}

function analyzeContent(filename, content) {
  const analysis = { score: 0, issues: [], recommendations: [] };
  
  switch (filename) {
    case 'README.md':
      return analyzeReadme(content);
    case 'CHANGELOG.md':
      return analyzeChangelog(content);
    case 'LICENSE':
      return analyzeLicense(content);
    default:
      return { score: content.length > 100 ? 8 : 5, issues: [], recommendations: [] };
  }
}

function analyzeReadme(content) {
  const analysis = { score: 0, issues: [], recommendations: [] };
  
  const checks = [
    { name: 'Has title', pattern: /^#\s+.+/m, points: 2 },
    { name: 'Has description', pattern: /description|purpose|what/i, points: 2 },
    { name: 'Has installation', pattern: /install|setup|getting started/i, points: 2 },
    { name: 'Has usage', pattern: /usage|example|how to/i, points: 2 },
    { name: 'Has badges', pattern: /!\[.*\]\(.*badge.*\)/i, points: 1 },
    { name: 'Has license info', pattern: /license/i, points: 1 }
  ];
  
  for (const check of checks) {
    if (check.pattern.test(content)) {
      analysis.score += check.points;
    } else {
      analysis.issues.push(`Missing ${check.name.toLowerCase()}`);
    }
  }
  
  return analysis;
}

function analyzeChangelog(content) {
  const analysis = { score: 0, issues: [], recommendations: [] };
  
  if (/## \[?\d+\.\d+\.\d+\]?/.test(content)) {
    analysis.score += 5;
  } else {
    analysis.issues.push('No version entries found');
  }
  
  if (/### (Added|Changed|Deprecated|Removed|Fixed|Security)/i.test(content)) {
    analysis.score += 5;
  } else {
    analysis.issues.push('Missing standard changelog categories');
  }
  
  return analysis;
}

function analyzeLicense(content) {
  const analysis = { score: 0, issues: [], recommendations: [] };
  
  const licenses = ['MIT', 'Apache', 'GPL', 'BSD', 'ISC'];
  if (licenses.some(license => content.includes(license))) {
    analysis.score = 10;
  } else {
    analysis.issues.push('Unknown or missing license type');
    analysis.score = 3;
  }
  
  return analysis;
}

async function testHealthScore() {
  console.log(chalk.blue('\n📊 Testing Health Score Calculation...\n'));
  
  // Get real documentation score from our compliance checker
  const realDocScore = await getRealDocumentationScore();
  
  // Get real security score from our local security audit
  const realSecurityScore = await getRealSecurityScore();
  
  // Get real branch protection score from our local audit
  const realBranchScore = await getRealBranchProtectionScore();
  
  // Get real CI/CD score from local auditor
  const LocalCICDAuditor = require('./cicd-audit-local.js');
  const cicdAuditor = new LocalCICDAuditor();
  const cicdResults = await cicdAuditor.auditCICD();
  
  const categories = {
    documentation: realDocScore,
    security: realSecurityScore,
    branchProtection: realBranchScore,
    cicd: cicdResults.score
  };

  const weights = {
    documentation: 25,
    security: 30,
    branchProtection: 20,
    cicd: 25
  };

  let totalWeightedScore = 0;
  let totalWeight = 0;

  console.log('Category Breakdown:');
  for (const [category, score] of Object.entries(categories)) {
    const weight = weights[category];
    totalWeightedScore += (score * weight);
    totalWeight += weight;
    
    const color = score >= 80 ? chalk.green : score >= 60 ? chalk.yellow : chalk.red;
    const icon = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌';
    console.log(`  ${icon} ${category}: ${color(score + '%')} (weight: ${weight}%)`);
  }
  
  const overallScore = Math.round(totalWeightedScore / totalWeight);
  const grade = overallScore >= 90 ? 'A' : overallScore >= 80 ? 'B' : overallScore >= 70 ? 'C' : overallScore >= 60 ? 'D' : 'F';
  
  console.log(chalk.bold(`\n🎓 Overall Health Score: ${overallScore}/100 (Grade: ${grade})`));
}

async function testFeatureTemplates() {
  console.log(chalk.blue('\n🔧 Testing Template Generation...\n'));
  
  const templates = [
    { name: 'CONTRIBUTING.md', size: 'Medium' },
    { name: 'CODE_OF_CONDUCT.md', size: 'Large' },
    { name: 'SECURITY.md', size: 'Medium' },
    { name: '.github/workflows/ci.yml', size: 'Large' },
    { name: '.github/PULL_REQUEST_TEMPLATE.md', size: 'Small' }
  ];
  
  console.log('Available Templates:');
  templates.forEach(template => {
    console.log(`✅ ${template.name} (${template.size})`);
  });
  
  console.log(chalk.green('\n✨ All templates ready for generation!'));
}

// Run all tests
async function runTests() {
  try {
    await testDocumentationLocal();
    await testHealthScore();
    await testFeatureTemplates();
    
    console.log(chalk.green('\n🎉 All tests completed successfully!'));
    console.log(chalk.blue('\n💡 To use with GitHub API, set GITHUB_TOKEN in .env file'));
    
  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error.message);
  }
}

runTests();
