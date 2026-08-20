'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { runTrustedTests, validateJestResult } = require('../../scripts/run-trusted-tests');

describe('trusted candidate test runner', () => {
  it('fails when candidate code exits a Jest worker before assertions complete', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-manager-worker-exit-'));
    try {
      fs.writeFileSync(
        path.join(root, 'candidate-exit.test.js'),
        "'use strict';\nprocess.exit(0);\n"
      );
      expect(() => runTrustedTests(root)).toThrow(
        'Trusted Jest process exited without a result document'
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }, 35000);

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
});
