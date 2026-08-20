'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  compareTestIdentities,
  runTrustedTests,
  validateJestResult,
} = require('../../scripts/run-trusted-tests');

describe('trusted candidate test runner', () => {
  it('fails when candidate code exits a Jest worker before assertions complete', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-manager-worker-exit-'));
    const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      fs.writeFileSync(
        path.join(root, 'candidate-exit.test.js'),
        "'use strict';\nprocess.exit(0);\n"
      );
      await expect(runTrustedTests(root)).rejects.toThrow(/Trusted Jest (process|run)/);
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
      fs.rmSync(root, { recursive: true, force: true });
    }
  }, 60000);

  it('rejects incomplete or skipped Jest results', () => {
    expect(() => validateJestResult({ success: true })).toThrow(
      'did not complete every test suite'
    );
    expect(() =>
      validateJestResult({
        success: true,
        wasInterrupted: false,
        numTotalTestSuites: 1,
        numPassedTestSuites: 1,
        numFailedTestSuites: 0,
        numRuntimeErrorTestSuites: 0,
        numTotalTests: 2,
        numPassedTests: 1,
        numFailedTests: 0,
        numPendingTests: 1,
        numTodoTests: 0,
      })
    ).toThrow('did not complete every assertion');
  });

  it('requires the exact protected test identity multiset', () => {
    expect(() =>
      compareTestIdentities(
        ['test/a.test.js::suite protected assertion'],
        ['test/a.test.js::suite candidate dummy']
      )
    ).toThrow(/missing: test\/a\.test\.js::suite protected assertion/);
  });

  it('keeps authority on parent IPC instead of a candidate-writable file', () => {
    const supervisor = fs.readFileSync(
      path.join(__dirname, '..', '..', 'scripts', 'run-trusted-tests.js'),
      'utf8'
    );

    expect(supervisor).toContain("stdio: ['ignore', 'pipe', 'pipe', 'ipc']");
    expect(supervisor).toContain('jest-authority-reporter.js');
    expect(supervisor).toContain("'--disable-sigusr1'");
    expect(supervisor).toContain('jest-controller-isolation.js');
    expect(supervisor).not.toContain('--outputFile');
  });
});
