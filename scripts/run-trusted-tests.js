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

function testIdentities(result, root) {
  return result.testResults.flatMap((suite) => {
    const suitePath = path.relative(root, suite.name).replace(/\\/g, '/');
    return suite.assertionResults.map(
      (assertion) => `${suitePath}::${assertion.fullName}`
    );
  }).sort();
}

function compareTestIdentities(expected, actual) {
  if (JSON.stringify(expected) === JSON.stringify(actual)) return;

  const expectedCounts = new Map();
  const actualCounts = new Map();
  for (const identity of expected) {
    expectedCounts.set(identity, (expectedCounts.get(identity) || 0) + 1);
  }
  for (const identity of actual) {
    actualCounts.set(identity, (actualCounts.get(identity) || 0) + 1);
  }
  const missing = expected.filter((identity) => {
    const remaining = actualCounts.get(identity) || 0;
    if (remaining > 0) actualCounts.set(identity, remaining - 1);
    return remaining === 0;
  });
  const unexpected = actual.filter((identity) => {
    const remaining = expectedCounts.get(identity) || 0;
    if (remaining > 0) expectedCounts.set(identity, remaining - 1);
    return remaining === 0;
  });
  throw new Error(
    `Protected test identities changed (missing: ${missing.join(', ') || 'none'}; ` +
      `unexpected: ${unexpected.join(', ') || 'none'})`
  );
}

function runJest(root, resultPath, trustedRoot) {
  const jestBin = require.resolve('jest/bin/jest');
  const lockdown = path.join(trustedRoot, 'scripts', 'jest-lockdown.js');
  const ignoredSupervisorTest = path
    .join(root, 'test', 'workflows', 'trusted-runner.test.js')
    .replace(/\\/g, '/');
  const child = childProcess.spawnSync(
    process.execPath,
    [
      jestBin,
      '--config',
      JSON.stringify({
        rootDir: root,
        testEnvironment: 'node',
        setupFilesAfterEnv: [lockdown],
        testPathIgnorePatterns: [ignoredSupervisorTest],
      }),
      '--ci',
      '--maxWorkers=2',
      '--json',
      `--outputFile=${resultPath}`,
    ],
    {
      cwd: root,
      encoding: 'utf8',
      env: process.env,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120000,
    }
  );

  if (child.error) throw child.error;
  if (child.status !== 0) {
    if (child.stdout) process.stdout.write(child.stdout);
    if (child.stderr) process.stderr.write(child.stderr);
    throw new Error(`Trusted Jest process failed with status ${child.status}`);
  }
  if (!fs.existsSync(resultPath)) {
    throw new Error('Trusted Jest process exited without a result document');
  }

  try {
    return JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  } catch {
    throw new Error('Trusted Jest process produced an invalid result document');
  }
}

function runTrustedTests(candidateRoot) {
  const resolvedCandidate = path.resolve(candidateRoot);
  const trustedRoot = path.resolve(__dirname, '..');
  const resultDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'repo-manager-trusted-jest-')
  );
  const baselineResultPath = path.join(resultDirectory, 'baseline.json');
  const candidateResultPath = path.join(resultDirectory, 'candidate.json');

  try {
    const baseline = runJest(trustedRoot, baselineResultPath, trustedRoot);
    validateJestResult(baseline);
    const candidate = runJest(resolvedCandidate, candidateResultPath, trustedRoot);
    validateJestResult(candidate);
    compareTestIdentities(
      testIdentities(baseline, trustedRoot),
      testIdentities(candidate, resolvedCandidate)
    );
    console.log(
      `Protected candidate tests passed: ${candidate.numPassedTestSuites} suites, ` +
        `${candidate.numPassedTests} assertions`
    );
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

module.exports = {
  compareTestIdentities,
  runTrustedTests,
  testIdentities,
  validateJestResult,
};
