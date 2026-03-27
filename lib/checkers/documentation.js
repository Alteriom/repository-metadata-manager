'use strict';

const fs = require('fs');
const path = require('path');
const Checker = require('../engine/Checker');

class DocumentationChecker extends Checker {
  constructor() {
    super({
      name: 'documentation',
      version: '2.1.0',
      description: 'Checks documentation completeness: README quality, CHANGELOG, CONTRIBUTING, LICENSE, JSDoc coverage',
      defaultWeight: 25,
    });
  }

  async check(context) {
    const startTime = Date.now();
    const findings = [];
    let score = 0;

    // 1. README.md
    const readme = context.readFile('README.md');
    if (!readme) {
      findings.push({
        id: 'doc-001',
        severity: 'high',
        message: 'README.md is missing',
        file: 'README.md',
        line: null,
        fixable: true,
        fix: 'Create a README.md with project description, installation, and usage sections',
      });
    } else {
      score += 10;

      if (/## Installation|## Install/i.test(readme)) {
        score += 5;
      } else {
        findings.push({
          id: 'doc-002',
          severity: 'low',
          message: 'README.md is missing an Installation section',
          file: 'README.md',
          line: null,
          fixable: false,
          fix: 'Add a ## Installation section to README.md',
        });
      }

      if (/## Usage/i.test(readme)) {
        score += 5;
      } else {
        findings.push({
          id: 'doc-003',
          severity: 'low',
          message: 'README.md is missing a Usage section',
          file: 'README.md',
          line: null,
          fixable: false,
          fix: 'Add a ## Usage section to README.md',
        });
      }

      if (/## License/i.test(readme)) {
        score += 5;
      } else {
        findings.push({
          id: 'doc-004',
          severity: 'low',
          message: 'README.md is missing a License section',
          file: 'README.md',
          line: null,
          fixable: false,
          fix: 'Add a ## License section to README.md',
        });
      }

      if (readme.length > 200) {
        score += 5;
      } else {
        findings.push({
          id: 'doc-005',
          severity: 'low',
          message: 'README.md is very short (< 200 characters)',
          file: 'README.md',
          line: null,
          fixable: false,
          fix: 'Expand README.md with more detailed project information',
        });
      }

      if (/\[!\[/.test(readme)) {
        score += 5;
      } else {
        findings.push({
          id: 'doc-006',
          severity: 'low',
          message: 'README.md has no badges',
          file: 'README.md',
          line: null,
          fixable: false,
          fix: 'Add status badges (CI, coverage, version) to README.md',
        });
      }

      // README quality scoring: code examples, links, images
      const codeBlockCount = (readme.match(/```/g) || []).length / 2;
      const linkCount = (readme.match(/\[([^\]]+)\]\(/g) || []).length;
      const imageCount = (readme.match(/!\[([^\]]*)\]\(/g) || []).length;

      if (codeBlockCount >= 1) {
        score += 3;
        findings.push({
          id: 'doc-013',
          severity: 'info',
          message: `README.md contains ${Math.floor(codeBlockCount)} code example(s)`,
          file: 'README.md',
          line: null,
          fixable: false,
          fix: null,
        });
      } else {
        findings.push({
          id: 'doc-014',
          severity: 'low',
          message: 'README.md has no code examples',
          file: 'README.md',
          line: null,
          fixable: false,
          fix: 'Add code examples with triple backtick blocks to README.md',
        });
      }

      if (linkCount >= 3) {
        score += 2;
      }
      if (imageCount >= 1) {
        score += 2;
      }
    }

    // 2. CHANGELOG.md
    const changelog = context.readFile('CHANGELOG.md');
    if (!changelog) {
      findings.push({
        id: 'doc-007',
        severity: 'high',
        message: 'CHANGELOG.md is missing',
        file: 'CHANGELOG.md',
        line: null,
        fixable: true,
        fix: 'Create a CHANGELOG.md following Keep a Changelog format',
      });
    } else if (/Keep a Changelog/i.test(changelog)) {
      score += 20;
    } else {
      score += 10;
      findings.push({
        id: 'doc-008',
        severity: 'low',
        message: 'CHANGELOG.md does not reference Keep a Changelog format',
        file: 'CHANGELOG.md',
        line: null,
        fixable: false,
        fix: 'Add Keep a Changelog header to CHANGELOG.md',
      });
    }

    // 3. CONTRIBUTING.md
    const contributing = context.readFile('CONTRIBUTING.md');
    if (!contributing) {
      findings.push({
        id: 'doc-009',
        severity: 'medium',
        message: 'CONTRIBUTING.md is missing',
        file: 'CONTRIBUTING.md',
        line: null,
        fixable: true,
        fix: 'Create a CONTRIBUTING.md with contribution guidelines',
      });
    } else if (contributing.length > 50) {
      score += 15;
    } else {
      score += 5;
      findings.push({
        id: 'doc-010',
        severity: 'low',
        message: 'CONTRIBUTING.md exists but has very little content',
        file: 'CONTRIBUTING.md',
        line: null,
        fixable: false,
        fix: 'Expand CONTRIBUTING.md with detailed guidelines',
      });
    }

    // 4. LICENSE file
    if (context.fileExists('LICENSE') || context.fileExists('LICENSE.md') || context.fileExists('LICENSE.txt')) {
      score += 25;
    } else {
      findings.push({
        id: 'doc-011',
        severity: 'high',
        message: 'LICENSE file is missing',
        file: 'LICENSE',
        line: null,
        fixable: true,
        fix: 'Add a LICENSE file',
      });
    }

    // 5. package.json has description field
    if (context.packageJson && context.packageJson.description) {
      score += 5;
    } else if (context.packageJson) {
      findings.push({
        id: 'doc-012',
        severity: 'low',
        message: 'package.json is missing the "description" field',
        file: 'package.json',
        line: null,
        fixable: true,
        fix: 'Add a "description" field to package.json',
      });
    }

    // 6. JSDoc coverage (for Node projects)
    if (context.projectType === 'node') {
      this._checkJsDocCoverage(context, findings);
    }

    return this.createResult(score, findings, {}, startTime);
  }

  _checkJsDocCoverage(context, findings) {
    // Scan .js files in lib/ or src/ for JSDoc comments on exported functions
    const dirs = ['lib', 'src'];
    let totalExports = 0;
    let documentedExports = 0;

    for (const dir of dirs) {
      const files = this._listJsFilesRecursive(context, dir);
      for (const file of files) {
        const content = context.readFile(file);
        if (!content) continue;

        // Count exported functions/classes
        const exportMatches = content.match(/(?:module\.exports|exports\.\w+)\s*=/g) || [];
        totalExports += exportMatches.length;

        // Count JSDoc comments (/** ... */)
        const jsdocMatches = content.match(/\/\*\*[\s\S]*?\*\//g) || [];
        documentedExports += jsdocMatches.length;
      }
    }

    if (totalExports > 0) {
      const coverage = documentedExports / totalExports;
      if (coverage >= 0.5) {
        findings.push({
          id: 'doc-015',
          severity: 'info',
          message: `JSDoc coverage: ${Math.round(coverage * 100)}% of exports have documentation`,
          file: null,
          line: null,
          fixable: false,
          fix: null,
        });
      } else {
        findings.push({
          id: 'doc-016',
          severity: 'low',
          message: `Low JSDoc coverage: ${Math.round(coverage * 100)}% of exports have documentation`,
          file: null,
          line: null,
          fixable: false,
          fix: 'Add JSDoc comments to exported functions and classes',
        });
      }
    }
  }

  _listJsFilesRecursive(context, dir) {
    const results = [];
    const entries = context.listFiles(dir);
    for (const entry of entries) {
      const relPath = `${dir}/${entry}`;
      const fullPath = path.join(context.projectRoot, relPath);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          results.push(...this._listJsFilesRecursive(context, relPath));
        } else if (entry.endsWith('.js')) {
          results.push(relPath);
        }
      } catch {
        // skip inaccessible files
      }
    }
    return results;
  }
}

module.exports = DocumentationChecker;
