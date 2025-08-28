const fs = require('fs').promises;
const path = require('path');

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
        analysis.score = weight; // Full points for existence
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
      } else {
        validation.issues.push(`Missing ${section.name} section`);
        validation.recommendations.push(`Add ${section.name} section to README`);
      }
    }

    // Check for badges
    if (/!\[.*\]\(.*badge.*\)/i.test(text)) {
      validation.score += 2;
    } else {
      validation.recommendations.push('Consider adding status badges');
    }

    return validation;
  }

  async validateChangelog(content) {
    const text = Buffer.from(content.content, 'base64').toString();
    const validation = { score: 0, issues: [], recommendations: [] };

    if (/## \[?\d+\.\d+\.\d+\]?/.test(text)) {
      validation.score += 8;
    } else {
      validation.issues.push('No version entries found');
    }

    if (/### (Added|Changed|Deprecated|Removed|Fixed|Security)/i.test(text)) {
      validation.score += 7;
    } else {
      validation.recommendations.push('Use standard changelog categories');
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
      } else {
        validation.recommendations.push(`Add ${section.name} guidelines`);
      }
    }

    return validation;
  }

  async validateCodeOfConduct(content) {
    const text = Buffer.from(content.content, 'base64').toString();
    const validation = { score: 10, issues: [], recommendations: [] };

    if (!/contributor covenant/i.test(text) && text.length < 500) {
      validation.score = 6;
      validation.recommendations.push('Consider using Contributor Covenant template');
    }

    return validation;
  }

  async validateLicense(content) {
    const text = Buffer.from(content.content, 'base64').toString();
    const validation = { score: 0, issues: [], recommendations: [] };

    const licenses = ['MIT', 'Apache', 'GPL', 'BSD', 'ISC'];
    if (licenses.some(license => text.includes(license))) {
      validation.score = 15;
    } else {
      validation.issues.push('Unknown or missing license');
      validation.recommendations.push('Add a standard open source license');
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
        validation.recommendations.push('Consider adding more issue templates');
      }
    } else {
      validation.issues.push('No issue templates found');
      validation.recommendations.push('Create issue templates for bugs and features');
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

    if (validation.score === 0) {
      validation.recommendations.push('Add checklist and description prompts to PR template');
    }

    return validation;
  }

  calculateDocScore(files) {
    const totalWeight = files.reduce((sum, file) => sum + file.weight, 0);
    const earnedScore = files.reduce((sum, file) => sum + file.score, 0);
    return Math.round((earnedScore / totalWeight) * 100);
  }
}

async function testLocalDocAudit() {
  const docManager = new LocalDocumentationManager();
  const result = await docManager.auditDocumentation();
  
  console.log('📋 Local DocumentationManager Audit Results:');
  console.log('Overall Score:', result.score + '%');
  console.log('\nFile Analysis:');
  
  result.files.forEach(file => {
    const status = file.exists ? '✅' : '❌';
    const percentage = file.weight > 0 ? Math.round((file.score / file.weight) * 100) : 0;
    console.log(`  ${status} ${file.file} - ${file.score}/${file.weight} (${percentage}%)`);
    
    if (file.issues.length > 0) {
      file.issues.forEach(issue => console.log(`    ⚠️  ${issue}`));
    }
    
    if (file.recommendations.length > 0) {
      file.recommendations.forEach(rec => console.log(`    💡 ${rec}`));
    }
  });
  
  console.log('\nTotal Weight:', result.files.reduce((sum, f) => sum + f.weight, 0));
  console.log('Total Score:', result.files.reduce((sum, f) => sum + f.score, 0));
}

testLocalDocAudit().catch(console.error);
