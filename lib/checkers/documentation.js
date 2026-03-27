'use strict';

const Checker = require('../engine/Checker');

class DocumentationChecker extends Checker {
  constructor() {
    super({
      name: 'documentation',
      version: '2.0.0',
      description: 'Checks documentation completeness: README, CHANGELOG, CONTRIBUTING, LICENSE',
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

    return this.createResult(score, findings, {}, startTime);
  }
}

module.exports = DocumentationChecker;
