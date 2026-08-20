'use strict';

const childProcess = require('child_process');

const workerUid = Number(process.env.REPO_MANAGER_TRUSTED_WORKER_UID || 65534);
const workerGid = Number(process.env.REPO_MANAGER_TRUSTED_WORKER_GID || 65534);

if (!Number.isSafeInteger(workerUid) || workerUid <= 0) {
  throw new Error('Trusted worker UID must be a positive integer');
}
if (!Number.isSafeInteger(workerGid) || workerGid <= 0) {
  throw new Error('Trusted worker GID must be a positive integer');
}

// The controller starts as root. Every Jest fork is irreversibly dropped to
// the unprivileged worker identity before candidate modules can load.
if (typeof process.getuid === 'function' && process.getuid() === 0) {
  const originalFork = childProcess.fork.bind(childProcess);
  childProcess.fork = (modulePath, args, options) => {
    let forkArgs = args;
    let forkOptions = options;
    if (!Array.isArray(forkArgs)) {
      forkOptions = forkArgs || {};
      forkArgs = [];
    }
    return originalFork(modulePath, forkArgs, {
      ...forkOptions,
      gid: workerGid,
      uid: workerUid,
    });
  };
}
