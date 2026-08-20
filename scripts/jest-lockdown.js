'use strict';

const protectedGlobals = [
  'afterAll',
  'afterEach',
  'beforeAll',
  'beforeEach',
  'describe',
  'expect',
  'it',
  'jest',
  'test',
];

for (const name of protectedGlobals) {
  const value = globalThis[name];
  if (name === 'expect' && typeof value.extend === 'function') {
    Object.defineProperty(value, 'extend', {
      configurable: false,
      enumerable: true,
      value: () => {
        throw new Error('Candidate code cannot extend protected Jest matchers');
      },
      writable: false,
    });
  }
  Object.freeze(value);
  Object.defineProperty(globalThis, name, {
    configurable: false,
    enumerable: true,
    value,
    writable: false,
  });
}

if (typeof process.send === 'function') {
  const protectedWorkerSend = process.send.bind(process);
  Object.freeze(protectedWorkerSend);
  Object.defineProperty(process, 'send', {
    configurable: false,
    value: protectedWorkerSend,
    writable: false,
  });
}

const blockedExit = (code) => {
  throw new Error(`Candidate code attempted to terminate the protected test process (${code})`);
};

for (const name of ['exit', 'reallyExit']) {
  if (typeof process[name] !== 'function') continue;
  Object.defineProperty(process, name, {
    configurable: false,
    value: blockedExit,
    writable: false,
  });
}
