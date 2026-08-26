'use strict';

const sendAuthorityResult = process.send && process.send.bind(process);

class JestAuthorityReporter {
  constructor() {
    this.error = sendAuthorityResult
      ? null
      : new Error('Protected Jest reporter requires a parent IPC channel');
  }

  onRunComplete(_contexts, result) {
    if (this.error) return;
    const authorityResult = {
      // Jest assigns AggregatedResult.success only after reporters complete.
      success:
        result.numFailedTests === 0 &&
        result.numRuntimeErrorTestSuites === 0 &&
        result.snapshot?.failure !== true &&
        !result.runExecError,
      wasInterrupted: result.wasInterrupted,
      numFailedTestSuites: result.numFailedTestSuites,
      numFailedTests: result.numFailedTests,
      numPassedTestSuites: result.numPassedTestSuites,
      numPassedTests: result.numPassedTests,
      numPendingTests: result.numPendingTests,
      numRuntimeErrorTestSuites: result.numRuntimeErrorTestSuites,
      numTodoTests: result.numTodoTests,
      numTotalTestSuites: result.numTotalTestSuites,
      numTotalTests: result.numTotalTests,
      testResults: result.testResults.map((suite) => ({
        name: suite.testFilePath,
        assertionResults: suite.testResults.map((assertion) => ({
          fullName: assertion.fullName,
          status: assertion.status,
        })),
      })),
    };

    sendAuthorityResult({
      type: 'repository-manager:trusted-jest-result',
      result: authorityResult,
    });
  }

  getLastError() {
    return this.error;
  }
}

module.exports = JestAuthorityReporter;
