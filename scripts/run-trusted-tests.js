'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function validateJestResult(result) {
  if (!result || result.success !== true || result.wasInterrupted === true) {
    throw new Error('Trusted Jest run did not complete successfully');
  }
  if (
    result.numTotalTestSuites <= 0 ||
    result.numPassedTestSuites !== result.numTotalTestSuites ||
    result.numFailedTestSuites !== 0 ||
    result.numRuntimeErrorTestSuites !== 0
  ) {
    throw new Error('Trusted Jest run did not complete every test suite');
  }
  if (
    result.numTotalTests <= 0 ||
    result.numPassedTests !== result.numTotalTests ||
    result.numFailedTests !== 0 ||
    result.numPendingTests !== 0 ||
    result.numTodoTests !== 0
  ) {
    throw new Error('Trusted Jest run did not complete every assertion');
  }
}

function runTrustedTests(candidateRoot) {
  const resolvedCandidate = path.resolve(candidateRoot);
  const resultDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'repo-manager-trusted-jest-')
  );
  const resultPath = path.join(resultDirectory, 'result.json');
  const jestBin = require.resolve('jest/bin/jest');

  try {
    const child = childProcess.spawnSync(
      process.execPath,
      [
        jestBin,
        '--config',
        JSON.stringify({ rootDir: resolvedCandidate, testEnvironment: 'node' }),
        '--ci',
        '--maxWorkers=2',
        '--json',
        `--outputFile=${resultPath}`,
      ],
      {
        cwd: resolvedCandidate,
        encoding: 'utf8',
        env: process.env,
        maxBuffer: 10 * 1024 * 1024,
        timeout: 120000,
      }
    );

    if (child.stdout) process.stdout.write(child.stdout);
    if (child.stderr) process.stderr.write(child.stderr);
    if (child.error) throw child.error;
    if (child.status !== 0) {
      throw new Error(`Trusted Jest process failed with status ${child.status}`);
    }
    if (!fs.existsSync(resultPath)) {
      throw new Error('Trusted Jest process exited without a result document');
    }

    let result;
    try {
      result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
    } catch {
      throw new Error('Trusted Jest process produced an invalid result document');
    }
    validateJestResult(result);
  } finally {
    fs.rmSync(resultDirectory, { recursive: true, force: true });
  }
}

if (require.main === module) {
  try {
    if (process.argv.length !== 3) {
      throw new Error('Usage: run-trusted-tests.js <candidate-root>');
    }
    runTrustedTests(process.argv[2]);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { runTrustedTests, validateJestResult };
