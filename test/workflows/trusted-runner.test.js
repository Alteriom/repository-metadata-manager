'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  compareTestIdentities,
  runJest,
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

  it('rejects candidate attempts to replace the Jest worker channel', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-manager-worker-ipc-'));
    const trustedRoot = path.join(__dirname, '..', '..');
    const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      fs.writeFileSync(
        path.join(root, 'candidate-ipc.test.js'),
        "'use strict';\nprocess.send = () => {};\ntest('dummy', () => expect(true).toBe(true));\n"
      );
      await expect(runJest(root, trustedRoot)).rejects.toThrow(
        /Trusted Jest process/
      );
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
      fs.rmSync(root, { recursive: true, force: true });
    }
  }, 30000);

  it('keeps direct candidate process.send calls outside the result channel', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-manager-worker-send-'));
    const trustedRoot = path.join(__dirname, '..', '..');
    const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      fs.writeFileSync(
        path.join(root, 'candidate-send.test.js'),
        "'use strict';\nprocess.send([0, { numFailedTests: 0, numPassedTests: 1 }]);\ntest('dummy', () => expect(true).toBe(true));\n"
      );
      fs.writeFileSync(
        path.join(root, 'benign.test.js'),
        "test('benign worker peer', () => expect(true).toBe(true));\n"
      );
      const result = await runJest(root, trustedRoot);
      expect(result.numPassedTests).toBe(2);
      expect(result.numFailedTests).toBe(0);
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
      fs.rmSync(root, { recursive: true, force: true });
    }
  }, 30000);

  it('hides the raw Jest IPC descriptor from candidate code', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-manager-worker-fd-'));
    const trustedRoot = path.join(__dirname, '..', '..');
    try {
      fs.writeFileSync(
        path.join(root, 'candidate-channel.test.js'),
        "test('channel descriptor is private', () => { expect(process.channel.fd).toBeUndefined(); expect(process._channel).toBeUndefined(); });\n"
      );
      fs.writeFileSync(
        path.join(root, 'benign.test.js'),
        "test('benign worker peer', () => expect(true).toBe(true));\n"
      );
      const result = await runJest(root, trustedRoot);
      expect(result.numPassedTests).toBe(2);
      expect(result.numFailedTests).toBe(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }, 30000);

  it('rejects candidate attempts to replace protected Jest matchers', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-manager-matchers-'));
    const trustedRoot = path.join(__dirname, '..', '..');
    const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      fs.writeFileSync(
        path.join(root, 'candidate-matchers.test.js'),
        "'use strict';\nconst registry = globalThis[Symbol.for('$$jest-matchers-object')];\nregistry.matchers.toBe = () => ({ pass: true, message: () => 'forged' });\ntest('dummy', () => expect(1).toBe(2));\n"
      );
      await expect(runJest(root, trustedRoot)).rejects.toThrow(
        /Trusted Jest process/
      );
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
      fs.rmSync(root, { recursive: true, force: true });
    }
  }, 30000);

  it('keeps authority on parent IPC instead of a candidate-writable file', () => {
    const supervisor = fs.readFileSync(
      path.join(__dirname, '..', '..', 'scripts', 'run-trusted-tests.js'),
      'utf8'
    );

    expect(supervisor).toContain("stdio: ['ignore', 'pipe', 'pipe', 'ipc']");
    expect(supervisor).toContain('jest-authority-reporter.js');
    expect(supervisor).toContain("'--disable-sigusr1'");
    expect(supervisor).toContain('jest-controller-isolation.js');
    expect(supervisor).toContain('jest-worker-ipc.js');
    expect(supervisor).not.toContain('--outputFile');

    const lockdown = fs.readFileSync(
      path.join(__dirname, '..', '..', 'scripts', 'jest-lockdown.js'),
      'utf8'
    );
    expect(lockdown).toContain("Object.defineProperty(process, 'send'");
    expect(lockdown).toContain('Object.freeze(protectedWorkerSend)');
    expect(lockdown).toContain("Symbol.for('$$jest-matchers-object')");
    expect(lockdown).toContain("['matchers', 'customEqualityTesters']");
    expect(lockdown).toContain('Object.seal(matcherRegistry)');

    const workerIpc = fs.readFileSync(
      path.join(__dirname, '..', '..', 'scripts', 'jest-worker-ipc.js'),
      'utf8'
    );
    expect(workerIpc).toContain("process.env.JEST_WORKER_ID");
    expect(workerIpc).toContain("'__repositoryManagerTrustedSend'");
    expect(workerIpc).toContain("'Candidate code cannot send Jest worker results'");
    expect(workerIpc).toContain("crypto.randomBytes(SECRET_BYTES)");
    expect(workerIpc).toContain("crypto.createHmac('sha256', secret)");
    expect(workerIpc).toContain('Object.getPrototypeOf(workerChannel)');
    expect(workerIpc).toContain("Object.defineProperty(process, '_channel'");
    expect(workerIpc).toContain('if (!validEnvelope(secret, values[0]))');
  });
});
