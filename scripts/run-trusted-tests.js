'use strict';

const childProcess = require('child_process');
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

function runJest(root, trustedRoot) {
  const jestBin = require.resolve('jest/bin/jest');
  const lockdown = path.join(trustedRoot, 'scripts', 'jest-lockdown.js');
  const authorityReporter = path.join(
    trustedRoot,
    'scripts',
    'jest-authority-reporter.js'
  );
  const ignoredSupervisorTest = path
    .join(root, 'test', 'workflows', 'trusted-runner.test.js')
    .replace(/\\/g, '/');
  const requireIsolation =
    process.env.REPO_MANAGER_TRUSTED_TEST_ISOLATION === 'required';
  if (
    requireIsolation &&
    (process.platform !== 'linux' ||
      typeof process.getuid !== 'function' ||
      process.getuid() !== 0)
  ) {
    throw new Error(
      'Trusted candidate tests require a root Linux supervisor for worker isolation'
    );
  }
  const controllerEnvironment = { ...process.env };
  delete controllerEnvironment.JEST_WORKER_ID;
  delete controllerEnvironment.REPOSITORY_MANAGER_JEST_AUTH_FD;
  const ipcModule = path.join(
    trustedRoot,
    'scripts',
    'jest-worker-ipc.js'
  );
  const nodeOptions = [`--require=${ipcModule}`];
  if (requireIsolation) {
    const isolationModule = path.join(
      trustedRoot,
      'scripts',
      'jest-controller-isolation.js'
    );
    nodeOptions.push(`--require=${isolationModule}`);
    controllerEnvironment.REPO_MANAGER_TRUSTED_WORKER_UID = '65534';
    controllerEnvironment.REPO_MANAGER_TRUSTED_WORKER_GID = '65534';
  }
  controllerEnvironment.NODE_OPTIONS = [
    controllerEnvironment.NODE_OPTIONS,
    ...nodeOptions,
  ].filter(Boolean).join(' ');
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(
      process.execPath,
      [
        '--disable-sigusr1',
        jestBin,
        '--config',
        JSON.stringify({
          rootDir: root,
          testEnvironment: 'node',
          setupFilesAfterEnv: [lockdown],
          testPathIgnorePatterns: [ignoredSupervisorTest],
        }),
        '--ci',
        '--no-cache',
        '--maxWorkers=2',
        '--reporters=default',
        `--reporters=${authorityReporter}`,
      ],
      {
        cwd: root,
        env: controllerEnvironment,
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      }
    );
    let authorityResult;
    let duplicateAuthorityResult = false;
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => child.kill(), 120000);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('message', (message) => {
      if (message?.type !== 'repository-manager:trusted-jest-result') return;
      if (authorityResult !== undefined) duplicateAuthorityResult = true;
      else authorityResult = message.result;
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (status, signal) => {
      clearTimeout(timeout);
      if (status !== 0 || signal) {
        if (stdout) process.stdout.write(stdout);
        if (stderr) process.stderr.write(stderr);
        reject(
          new Error(
            `Trusted Jest process failed with status ${status ?? 'none'}` +
              `${signal ? ` (${signal})` : ''}`
          )
        );
        return;
      }
      if (duplicateAuthorityResult) {
        reject(new Error('Trusted Jest controller emitted duplicate authority results'));
        return;
      }
      if (authorityResult === undefined) {
        reject(new Error('Trusted Jest controller exited without an authority result'));
        return;
      }
      resolve(authorityResult);
    });
  });
}

async function runTrustedTests(candidateRoot) {
  const resolvedCandidate = path.resolve(candidateRoot);
  const trustedRoot = path.resolve(__dirname, '..');
  const baseline = await runJest(trustedRoot, trustedRoot);
  validateJestResult(baseline);
  const candidate = await runJest(resolvedCandidate, trustedRoot);
  validateJestResult(candidate);
  compareTestIdentities(
    testIdentities(baseline, trustedRoot),
    testIdentities(candidate, resolvedCandidate)
  );
  console.log(
    `Protected candidate tests passed: ${candidate.numPassedTestSuites} suites, ` +
      `${candidate.numPassedTests} assertions`
  );
}

if (require.main === module) {
  if (process.argv.length !== 3) {
    console.error('Usage: run-trusted-tests.js <candidate-root>');
    process.exitCode = 1;
  } else {
    runTrustedTests(process.argv[2]).catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
  }
}

module.exports = {
  compareTestIdentities,
  runJest,
  runTrustedTests,
  testIdentities,
  validateJestResult,
};
