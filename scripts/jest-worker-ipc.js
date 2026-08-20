'use strict';

const childProcess = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const Module = require('module');
const path = require('path');
const v8 = require('v8');

const AUTH_FD_ENV = 'REPOSITORY_MANAGER_JEST_AUTH_FD';
const AUTH_REQUEST_TYPE = 'repository-manager:authenticated-jest-request';
const AUTH_RESPONSE_TYPE = 'repository-manager:authenticated-jest-response';
const SECRET_BYTES = 32;
const bufferFrom = Buffer.from.bind(Buffer);
const createHmac = crypto.createHmac.bind(crypto);
const randomBytes = crypto.randomBytes.bind(crypto);
const timingSafeEqual = crypto.timingSafeEqual.bind(crypto);
const serialize = v8.serialize.bind(v8);
const deserialize = v8.deserialize.bind(v8);
const bufferToString = Function.call.bind(Buffer.prototype.toString);
const hmacProbe = createHmac('sha256', Buffer.alloc(0));
const hmacUpdate = Function.call.bind(hmacProbe.update);
const hmacDigest = Function.call.bind(hmacProbe.digest);
const processChildPath = path.join(
  path.dirname(require.resolve('jest-worker')),
  'processChild.js'
);
const jestWorkerIndexPath = require.resolve('jest-worker');
const testWorkerPath = path.join(
  path.dirname(require.resolve('jest-runner')),
  'testWorker.js'
);

function sign(secret, type, requestId, body) {
  const hmac = createHmac('sha256', secret);
  hmacUpdate(hmac, `${type}\0${requestId}\0${body}`, 'utf8');
  return hmacDigest(hmac, 'hex');
}

function validEnvelope(secret, type, envelope) {
  if (!envelope || envelope.type !== type ||
      !/^[0-9a-f]{32}$/.test(envelope.requestId || '') ||
      typeof envelope.body !== 'string' ||
      typeof envelope.mac !== 'string') return false;
  const expected = bufferFrom(
    sign(secret, type, envelope.requestId, envelope.body),
    'hex'
  );
  const actual = bufferFrom(envelope.mac, 'hex');
  return expected.length === actual.length &&
    timingSafeEqual(expected, actual);
}

if (!process.env.JEST_WORKER_ID) {
  const originalFork = childProcess.fork.bind(childProcess);
  childProcess.fork = (modulePath, args, options) => {
    let forkArgs = args;
    let forkOptions = options;
    if (!Array.isArray(forkArgs)) {
      forkOptions = forkArgs || {};
      forkArgs = [];
    }
    if (path.resolve(modulePath) !== path.resolve(processChildPath)) {
      return originalFork(modulePath, forkArgs, forkOptions);
    }

    const silent = forkOptions.silent !== false;
    const stdio = Array.isArray(forkOptions.stdio)
      ? [...forkOptions.stdio]
      : silent
        ? ['pipe', 'pipe', 'pipe', 'ipc']
        : ['inherit', 'inherit', 'inherit', 'ipc'];
    const authFd = stdio.length;
    stdio.push('pipe');
    const secret = randomBytes(SECRET_BYTES);
    const child = originalFork(modulePath, forkArgs, {
      ...forkOptions,
      env: {
        ...forkOptions.env,
        [AUTH_FD_ENV]: String(authFd),
      },
      stdio,
    });
    const secretPipe = child.stdio[authFd];
    secretPipe.on('error', () => child.kill());
    secretPipe.end(secret);

    const issuedRequests = new Set();
    const originalChildSend = child.send.bind(child);
    child.send = (payload, ...args) => {
      const requestId = bufferToString(randomBytes(16), 'hex');
      const body = bufferToString(serialize(payload), 'base64');
      issuedRequests.add(requestId);
      return originalChildSend({
        type: AUTH_REQUEST_TYPE,
        requestId,
        body,
        mac: sign(secret, AUTH_REQUEST_TYPE, requestId, body),
      }, ...args);
    };
    const originalEmit = child.emit;
    child.emit = function emitAuthenticated(event, ...values) {
      if (event === 'message') {
        const envelope = values[0];
        if (!validEnvelope(secret, AUTH_RESPONSE_TYPE, envelope) ||
            !issuedRequests.has(envelope.requestId)) {
          child.kill();
          throw new Error('Jest worker emitted an unauthenticated IPC message');
        }
        const payload = deserialize(bufferFrom(envelope.body, 'base64'));
        if (!Array.isArray(payload) || ![0, 1, 2, 3, 4].includes(payload[0])) {
          child.kill();
          throw new Error('Jest worker emitted an invalid IPC response');
        }
        if (payload[0] !== 3) issuedRequests.delete(envelope.requestId);
        values[0] = payload;
      }
      return originalEmit.call(this, event, ...values);
    };
    return child;
  };
} else if (typeof process.send === 'function') {
  const authFd = Number(process.env[AUTH_FD_ENV]);
  delete process.env[AUTH_FD_ENV];
  if (!Number.isSafeInteger(authFd) || authFd < 0) {
    throw new Error('Trusted Jest worker authentication descriptor is unavailable');
  }
  const secret = Buffer.alloc(SECRET_BYTES);
  let secretOffset = 0;
  while (secretOffset < secret.length) {
    const bytesRead = fs.readSync(
      authFd,
      secret,
      secretOffset,
      secret.length - secretOffset
    );
    if (bytesRead === 0) break;
    secretOffset += bytesRead;
  }
  fs.closeSync(authFd);
  if (secretOffset !== SECRET_BYTES) {
    throw new Error('Trusted Jest worker authentication secret is invalid');
  }

  const originalExtension = Module._extensions['.js'];
  const originalSend = process.send.bind(process);
  let activeRequestId;
  const receivedRequests = new Set();
  const authenticatedReceive = (listener) => (envelope, ...args) => {
    if (!validEnvelope(secret, AUTH_REQUEST_TYPE, envelope) ||
        receivedRequests.has(envelope.requestId)) {
      throw new Error('Jest worker received an unauthenticated IPC request');
    }
    receivedRequests.add(envelope.requestId);
    activeRequestId = envelope.requestId;
    const payload = deserialize(bufferFrom(envelope.body, 'base64'));
    return listener(payload, ...args);
  };
  const authenticatedSend = (payload) => {
    if (!activeRequestId) {
      throw new Error('Jest worker response has no authenticated request');
    }
    const body = bufferToString(serialize(payload), 'base64');
    return originalSend({
      type: AUTH_RESPONSE_TYPE,
      requestId: activeRequestId,
      body,
      mac: sign(secret, AUTH_RESPONSE_TYPE, activeRequestId, body),
    });
  };
  const blockedWorkerSend = () => {
    throw new Error('Candidate code cannot send Jest worker results');
  };

  Object.freeze(blockedWorkerSend);
  Object.defineProperty(process, 'send', {
    configurable: false,
    value: blockedWorkerSend,
    // Jest copies the real process object before exposing its own sandboxed
    // process facade. Keep that copy operation compatible; the only value it
    // can copy or replace is this deliberately blocked function.
    writable: true,
  });
  if (!process.channel) {
    throw new Error('Trusted Jest worker IPC channel is unavailable');
  }
  const workerChannel = process.channel;
  for (const channelObject of [workerChannel, Object.getPrototypeOf(workerChannel)]) {
    Object.defineProperty(channelObject, 'fd', {
      configurable: false,
      value: undefined,
      writable: false,
    });
  }
  Object.defineProperty(process, '_channel', {
    configurable: false,
    value: undefined,
    writable: false,
  });

  const transformedModules = new Set();
  Module._extensions['.js'] = (loadedModule, filename) => {
    const resolvedFilename = path.resolve(filename);
    const isProcessChild = resolvedFilename === path.resolve(processChildPath);
    const isJestWorkerIndex = resolvedFilename === path.resolve(jestWorkerIndexPath);
    const isTestWorker = resolvedFilename === path.resolve(testWorkerPath);
    if (!isProcessChild && !isJestWorkerIndex && !isTestWorker) {
      return originalExtension(loadedModule, filename);
    }

    if (isTestWorker) {
      const result = originalExtension(loadedModule, filename);
      Object.freeze(loadedModule.exports);
      transformedModules.add(resolvedFilename);
      if (transformedModules.size === 3) {
        Module._extensions['.js'] = originalExtension;
      }
      return result;
    }

    const source = fs.readFileSync(filename, 'utf8');
    const sendPattern = isProcessChild
      ? /\bprocess\.send\(/g
      : /\bparentProcess\.send\(/g;
    const sendCalls = source.match(sendPattern) || [];
    if (sendCalls.length === 0) {
      throw new Error('Trusted Jest worker harness has no auditable send calls');
    }
    Object.defineProperty(loadedModule, '__repositoryManagerTrustedSend', {
      configurable: true,
      value: authenticatedSend,
      writable: false,
    });
    if (isProcessChild) {
      Object.defineProperty(loadedModule, '__repositoryManagerTrustedReceive', {
        configurable: true,
        value: authenticatedReceive,
        writable: false,
      });
    }
    const prelude = [
      "'use strict';",
      "const __repositoryManagerTrustedSend = module.__repositoryManagerTrustedSend;",
      ...(isProcessChild ? [
        "const __repositoryManagerTrustedReceive = module.__repositoryManagerTrustedReceive;",
        'delete module.__repositoryManagerTrustedReceive;',
      ] : []),
      'delete module.__repositoryManagerTrustedSend;',
    ].join('\n');
    let transformed = source.replace(
      sendPattern,
      '__repositoryManagerTrustedSend('
    );
    if (isProcessChild) {
      const receivePattern = /process\.on\('message', messageListener\);/g;
      const receiveRegistrations = source.match(receivePattern) || [];
      if (receiveRegistrations.length !== 1) {
        throw new Error('Trusted Jest worker harness has no auditable receive listener');
      }
      transformed = transformed.replace(
        receivePattern,
        "process.on('message', __repositoryManagerTrustedReceive(messageListener));"
      );
    }
    transformedModules.add(resolvedFilename);
    if (transformedModules.size === 3) {
      Module._extensions['.js'] = originalExtension;
    }
    return loadedModule._compile(`${prelude}\n${transformed}`, filename);
  };
}
