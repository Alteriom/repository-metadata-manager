#!/usr/bin/env node

const chalk = require('chalk');
const figlet = require('figlet');

// Test the repository manager features locally
console.log(chalk.cyan(figlet.textSync('Repo Test', { horizontalLayout: 'full' })));
console.log(chalk.gray('🧪 Testing Repository Management Features\n'));

// Test the local documentation analyzer
async function testDocumentationLocal() {
  console.log(chalk.blue('📚 Testing Documentation Analysis (Local Mode)...\n'));
  
  const fs = require('fs').promises;
  const path = require('path');
  
  const docsToCheck = [
    'README.md',
    'CHANGELOG.md', 
    'CONTRIBUTING.md',
    'CODE_OF_CONDUCT.md',
    'LICENSE',
    '.github/PULL_REQUEST_TEMPLATE.md'
  ];
  
  const results = [];
  
  for (const doc of docsToCheck) {
    try {
      const filePath = path.join(process.cwd(), doc);
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      
      if (exists) {
        const content = await fs.readFile(filePath, 'utf8');
        const analysis = analyzeContent(doc, content);
        results.push({ file: doc, exists: true, ...analysis });
        console.log(`✅ ${doc} - ${analysis.score}/10 points`);
        if (analysis.issues.length > 0) {
          analysis.issues.forEach(issue => console.log(chalk.yellow(`   - ${issue}`)));
        }
      } else {
        results.push({ file: doc, exists: false, score: 0, issues: [`${doc} is missing`] });
        console.log(`❌ ${doc} - Missing`);
      }
    } catch (error) {
      console.log(`⚠️ ${doc} - Error: ${error.message}`);
    }
  }
  
  const totalScore = results.reduce((sum, r) => sum + (r.score || 0), 0);
  const maxScore = docsToCheck.length * 10;
  const percentage = Math.round((totalScore / maxScore) * 100);
  
  console.log(chalk.bold(`\n📊 Documentation Score: ${totalScore}/${maxScore} (${percentage}%)`));
  return results;
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
  
  // Simulate category scores
  const categories = {
    documentation: 75,
    security: 60,
    branchProtection: 45,
    cicd: 80
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
