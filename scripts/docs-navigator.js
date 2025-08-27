#!/usr/bin/env node

/**
 * Documentation Navigation Helper
 * Helps users quickly find and open documentation files
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class DocNavigator {
  constructor() {
    this.docsPath = path.join(__dirname, '..', 'docs');
    this.rootPath = path.join(__dirname, '..');
  }

  async listDocs() {
    console.log('\n📚 REPOSITORY DOCUMENTATION');
    console.log('=' .repeat(50));
    
    console.log('\n🏠 ROOT DOCUMENTATION:');
    const rootDocs = [
      'README.md',
      'CONTRIBUTING.md', 
      'CHANGELOG.md',
      'CODE_OF_CONDUCT.md',
      'LICENSE'
    ];
    
    rootDocs.forEach((doc, i) => {
      const exists = fs.existsSync(path.join(this.rootPath, doc));
      console.log(`  ${i + 1}. ${exists ? '✅' : '❌'} ${doc}`);
    });

    console.log('\n📁 ORGANIZED DOCUMENTATION:');
    await this.listDocsInDirectory(this.docsPath, '  ');
    
    console.log('\n🔧 GITHUB TEMPLATES:');
    const githubPath = path.join(this.rootPath, '.github');
    if (fs.existsSync(githubPath)) {
      await this.listDocsInDirectory(githubPath, '  ');
    }
  }

  async listDocsInDirectory(dirPath, prefix = '') {
    if (!fs.existsSync(dirPath)) {
      console.log(`${prefix}❌ Directory not found: ${dirPath}`);
      return;
    }

    const items = fs.readdirSync(dirPath);
    let counter = 1;

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        console.log(`${prefix}📁 ${item}/`);
        await this.listDocsInDirectory(itemPath, prefix + '  ');
      } else if (item.endsWith('.md') || item === 'LICENSE') {
        console.log(`${prefix}${counter}. 📄 ${item}`);
        counter++;
      }
    }
  }

  async openDoc(docPath) {
    const fullPath = path.resolve(docPath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ File not found: ${docPath}`);
      return;
    }

    console.log(`📖 Opening: ${docPath}`);
    
    // Try to open with default application
    const isWindows = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    
    let command;
    if (isWindows) {
      command = `start "" "${fullPath}"`;
    } else if (isMac) {
      command = `open "${fullPath}"`;
    } else {
      command = `xdg-open "${fullPath}"`;
    }
    
    exec(command, (error) => {
      if (error) {
        console.log(`⚠️  Could not open file automatically. Please open manually: ${fullPath}`);
      } else {
        console.log('✅ File opened successfully');
      }
    });
  }

  async quickAccess() {
    console.log('\n🚀 QUICK ACCESS DOCUMENTATION');
    console.log('=' .repeat(50));
    
    const quickLinks = [
      { name: 'Main README', path: 'README.md', desc: 'Project overview and setup' },
      { name: 'Documentation Index', path: 'docs/README.md', desc: 'Complete documentation overview' },
      { name: 'Contributing Guide', path: 'CONTRIBUTING.md', desc: 'How to contribute to the project' },
      { name: 'CLI Guide', path: 'docs/guides/CLI.md', desc: 'Command-line interface reference' },
      { name: 'API Reference', path: 'docs/development/API.md', desc: 'Detailed API documentation' },
      { name: 'Environment Setup', path: 'docs/guides/ENVIRONMENT.md', desc: 'Development environment setup' },
      { name: 'Organization Setup', path: 'docs/guides/ORGANIZATION_SETUP.md', desc: 'Organization configuration' },
      { name: 'Implementation Details', path: 'docs/development/IMPLEMENTATION_SUMMARY.md', desc: 'Technical architecture' },
      { name: 'Changelog', path: 'CHANGELOG.md', desc: 'Version history and changes' },
      { name: 'License', path: 'LICENSE', desc: 'Project license information' }
    ];
    
    quickLinks.forEach((link, i) => {
      const fullPath = path.join(this.rootPath, link.path);
      const exists = fs.existsSync(fullPath);
      const status = exists ? '✅' : '❌';
      console.log(`  ${i + 1}. ${status} ${link.name.padEnd(20)} - ${link.desc}`);
      if (exists) {
        console.log(`      📁 ${link.path}`);
      }
    });
  }

  async validateStructure() {
    console.log('\n🔍 DOCUMENTATION STRUCTURE VALIDATION');
    console.log('=' .repeat(50));
    
    const expectedStructure = {
      'README.md': 'Main project documentation',
      'CONTRIBUTING.md': 'Contribution guidelines', 
      'CHANGELOG.md': 'Version history',
      'LICENSE': 'Project license',
      'CODE_OF_CONDUCT.md': 'Community guidelines',
      'docs/README.md': 'Documentation index',
      'docs/guides/': 'User guides directory',
      'docs/development/': 'Development documentation directory',
      'docs/releases/': 'Release documentation directory',
      '.github/ISSUE_TEMPLATE/': 'Issue templates directory',
      '.github/PULL_REQUEST_TEMPLATE.md': 'PR template'
    };
    
    let score = 0;
    const total = Object.keys(expectedStructure).length;
    
    for (const [filePath, description] of Object.entries(expectedStructure)) {
      const fullPath = path.join(this.rootPath, filePath);
      const exists = fs.existsSync(fullPath);
      
      if (exists) {
        score++;
        console.log(`✅ ${filePath.padEnd(35)} - ${description}`);
      } else {
        console.log(`❌ ${filePath.padEnd(35)} - ${description} (MISSING)`);
      }
    }
    
    const percentage = Math.round((score / total) * 100);
    console.log(`\n📊 Structure Completeness: ${score}/${total} (${percentage}%)`);
    
    if (percentage >= 90) {
      console.log('🟢 Excellent documentation structure!');
    } else if (percentage >= 70) {
      console.log('🟡 Good documentation structure with room for improvement');
    } else {
      console.log('🔴 Documentation structure needs significant improvement');
    }
  }

  showHelp() {
    console.log('\n📚 DOCUMENTATION NAVIGATOR');
    console.log('=' .repeat(50));
    console.log('\nUsage: node scripts/docs-navigator.js [command]\n');
    console.log('Commands:');
    console.log('  list      - List all documentation files');
    console.log('  quick     - Show quick access to key documents');
    console.log('  validate  - Validate documentation structure');
    console.log('  open <file> - Open a documentation file');
    console.log('  help      - Show this help message');
    console.log('\nExamples:');
    console.log('  node scripts/docs-navigator.js list');
    console.log('  node scripts/docs-navigator.js quick');
    console.log('  node scripts/docs-navigator.js open docs/README.md');
  }
}

// CLI Interface
async function main() {
  const navigator = new DocNavigator();
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'list':
      await navigator.listDocs();
      break;
    case 'quick':
      await navigator.quickAccess();
      break;
    case 'validate':
      await navigator.validateStructure();
      break;
    case 'open':
      if (arg) {
        await navigator.openDoc(arg);
      } else {
        console.log('❌ Please specify a file to open');
      }
      break;
    case 'help':
    case '--help':
    case '-h':
      navigator.showHelp();
      break;
    default:
      console.log('📚 Welcome to Documentation Navigator!');
      await navigator.quickAccess();
      console.log('\n💡 Run with "help" to see all available commands');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DocNavigator;
