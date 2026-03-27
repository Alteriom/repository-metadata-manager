'use strict';

const Checker = require('../engine/Checker');

class IotChecker extends Checker {
  constructor() {
    super({
      name: 'iot',
      version: '2.0.0',
      description: 'Checks IoT project structure: platformio, firmware version, hardware docs',
      defaultWeight: 10,
    });
  }

  async check(context) {
    const startTime = Date.now();
    const findings = [];
    let score = 0;

    // Detect IoT project
    const hasPlatformio = context.fileExists('platformio.ini');
    const hasFirmwareVersion = context.fileExists('firmware_version.json');
    const rootFiles = context.listFiles('.');
    const hasInoFiles = rootFiles.some((f) => f.endsWith('.ino'));

    const isIot = hasPlatformio || hasFirmwareVersion || hasInoFiles;

    if (!isIot) {
      findings.push({
        id: 'iot-001',
        severity: 'info',
        message: 'Not an IoT project — checks skipped',
        file: null,
        line: null,
        fixable: false,
        fix: null,
      });
      return this.createResult(100, findings, { isIot: false }, startTime);
    }

    // IoT checks
    if (hasPlatformio) {
      score += 25;
    } else {
      findings.push({
        id: 'iot-002',
        severity: 'medium',
        message: 'platformio.ini is missing',
        file: 'platformio.ini',
        line: null,
        fixable: true,
        fix: 'Add a platformio.ini configuration file',
      });
    }

    if (hasFirmwareVersion) {
      score += 25;
    } else {
      findings.push({
        id: 'iot-003',
        severity: 'medium',
        message: 'firmware_version.json is missing',
        file: 'firmware_version.json',
        line: null,
        fixable: true,
        fix: 'Create a firmware_version.json to track firmware versions',
      });
    }

    // README has hardware section
    const readme = context.readFile('README.md');
    if (readme && /hardware|firmware/i.test(readme)) {
      score += 25;
    } else {
      findings.push({
        id: 'iot-004',
        severity: 'medium',
        message: 'README.md is missing hardware/firmware documentation',
        file: 'README.md',
        line: null,
        fixable: false,
        fix: 'Add a Hardware or Firmware section to README.md',
      });
    }

    // src/ directory exists
    if (context.fileExists('src') || context.listFiles('src').length > 0) {
      score += 25;
    } else {
      findings.push({
        id: 'iot-005',
        severity: 'medium',
        message: 'src/ directory is missing',
        file: 'src/',
        line: null,
        fixable: true,
        fix: 'Create a src/ directory for source code',
      });
    }

    return this.createResult(score, findings, { isIot: true }, startTime);
  }
}

module.exports = IotChecker;
