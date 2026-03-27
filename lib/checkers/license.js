'use strict';

const Checker = require('../engine/Checker');

const SPDX_IDENTIFIERS = [
  'MIT', 'Apache-2.0', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause',
  'GPL-2.0', 'GPL-3.0', 'LGPL-2.1', 'LGPL-3.0',
  'MPL-2.0', 'AGPL-3.0', 'Unlicense', 'CC0-1.0',
];

const LICENSE_KEYWORDS = {
  'MIT': ['MIT License', 'Permission is hereby granted, free of charge'],
  'Apache-2.0': ['Apache License', 'Version 2.0'],
  'ISC': ['ISC License', 'Permission to use, copy, modify'],
  'BSD-2-Clause': ['BSD 2-Clause', 'Redistribution and use'],
  'BSD-3-Clause': ['BSD 3-Clause', 'Neither the name'],
  'GPL-2.0': ['GNU General Public License', 'Version 2'],
  'GPL-3.0': ['GNU General Public License', 'Version 3'],
  'LGPL-2.1': ['GNU Lesser General Public License', 'Version 2.1'],
  'LGPL-3.0': ['GNU Lesser General Public License', 'Version 3'],
  'MPL-2.0': ['Mozilla Public License', 'Version 2.0'],
  'AGPL-3.0': ['GNU Affero General Public License', 'Version 3'],
  'Unlicense': ['This is free and unencumbered software', 'unlicense.org'],
  'CC0-1.0': ['CC0', 'Creative Commons', 'public domain'],
};

const COPYLEFT_LICENSES = ['AGPL-3.0', 'GPL-2.0', 'GPL-3.0'];

class LicenseChecker extends Checker {
  constructor() {
    super({
      name: 'license',
      version: '2.1.0',
      description: 'Checks license compliance: LICENSE file, SPDX identifier, content matching, dependency conflicts',
      defaultWeight: 5,
    });
  }

  async check(context) {
    const startTime = Date.now();
    const findings = [];
    let score = 0;

    // 1. LICENSE file exists (30 pts)
    const licenseContent = context.readFile('LICENSE') ||
      context.readFile('LICENSE.md') ||
      context.readFile('LICENSE.txt');

    if (licenseContent) {
      score += 30;
      findings.push({
        id: 'lic-001',
        severity: 'info',
        message: 'LICENSE file found',
        file: 'LICENSE',
        line: null,
        fixable: false,
        fix: null,
      });
    } else {
      findings.push({
        id: 'lic-001',
        severity: 'high',
        message: 'LICENSE file is missing',
        file: 'LICENSE',
        line: null,
        fixable: true,
        fix: 'Add a LICENSE file to the project root',
      });
    }

    // 2. package.json has license field (20 pts)
    const declaredLicense = context.packageJson && context.packageJson.license;
    if (declaredLicense) {
      score += 20;
      findings.push({
        id: 'lic-002',
        severity: 'info',
        message: `package.json declares license: ${declaredLicense}`,
        file: 'package.json',
        line: null,
        fixable: false,
        fix: null,
      });
    } else if (context.packageJson) {
      findings.push({
        id: 'lic-002',
        severity: 'high',
        message: 'package.json is missing the "license" field',
        file: 'package.json',
        line: null,
        fixable: true,
        fix: 'Add a "license" field to package.json (e.g., "MIT")',
      });
    }

    // 3. License is a recognized SPDX identifier (20 pts)
    if (declaredLicense) {
      // Handle SPDX expression — normalize to check the base identifier
      const normalizedLicense = declaredLicense.replace(/-only$/, '').replace(/-or-later$/, '');
      if (SPDX_IDENTIFIERS.includes(normalizedLicense) || SPDX_IDENTIFIERS.includes(declaredLicense)) {
        score += 20;
        findings.push({
          id: 'lic-003',
          severity: 'info',
          message: `License "${declaredLicense}" is a recognized SPDX identifier`,
          file: 'package.json',
          line: null,
          fixable: false,
          fix: null,
        });
      } else {
        findings.push({
          id: 'lic-003',
          severity: 'medium',
          message: `License "${declaredLicense}" is not a recognized SPDX identifier`,
          file: 'package.json',
          line: null,
          fixable: false,
          fix: 'Use a standard SPDX license identifier (e.g., MIT, Apache-2.0, ISC)',
        });
      }
    }

    // 4. LICENSE file content matches declared license (15 pts)
    if (licenseContent && declaredLicense) {
      const keywords = LICENSE_KEYWORDS[declaredLicense] || LICENSE_KEYWORDS[declaredLicense.replace(/-only$/, '')] || [];
      if (keywords.length > 0) {
        const matches = keywords.some((kw) => licenseContent.includes(kw));
        if (matches) {
          score += 15;
          findings.push({
            id: 'lic-004',
            severity: 'info',
            message: 'LICENSE file content matches declared license',
            file: 'LICENSE',
            line: null,
            fixable: false,
            fix: null,
          });
        } else {
          findings.push({
            id: 'lic-004',
            severity: 'medium',
            message: `LICENSE file content does not appear to match declared license "${declaredLicense}"`,
            file: 'LICENSE',
            line: null,
            fixable: false,
            fix: 'Ensure the LICENSE file content matches the license declared in package.json',
          });
        }
      } else {
        // Unknown license — cannot verify, give partial credit
        score += 7;
      }
    }

    // 5. No conflicting licenses in dependencies (15 pts)
    if (context.packageJson && declaredLicense) {
      const isPermissive = !COPYLEFT_LICENSES.includes(declaredLicense);
      if (isPermissive) {
        const deps = Object.keys(context.packageJson.dependencies || {});
        const conflicting = this._findCopyleftDeps(context, deps);
        if (conflicting.length > 0) {
          findings.push({
            id: 'lic-005',
            severity: 'info',
            message: `Potential license conflict: project is ${declaredLicense} but depends on copyleft-licensed packages: ${conflicting.join(', ')}`,
            file: 'package.json',
            line: null,
            fixable: false,
            fix: 'Review copyleft dependencies for license compatibility',
          });
          score += 5; // partial credit — info-level only
        } else {
          score += 15;
        }
      } else {
        score += 15;
      }
    }

    return this.createResult(score, findings, { declaredLicense: declaredLicense || null }, startTime);
  }

  _findCopyleftDeps(context, deps) {
    // Try to read each dependency's package.json from node_modules
    const conflicting = [];
    for (const dep of deps) {
      const depPkg = context.readFile(`node_modules/${dep}/package.json`);
      if (!depPkg) continue;
      try {
        const parsed = JSON.parse(depPkg);
        if (parsed.license && COPYLEFT_LICENSES.includes(parsed.license)) {
          conflicting.push(`${dep} (${parsed.license})`);
        }
      } catch {
        // skip unparseable
      }
    }
    return conflicting;
  }
}

module.exports = LicenseChecker;
