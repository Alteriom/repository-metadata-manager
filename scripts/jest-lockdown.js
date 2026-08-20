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
const blockedMatcherMutation = () => {
  throw new Error('Candidate code cannot modify protected Jest matchers');
};

for (const name of protectedGlobals) {
  const value = globalThis[name];
  if (name === 'expect') {
    for (const method of ['extend', 'addEqualityTesters']) {
      if (typeof value[method] !== 'function') continue;
      Object.defineProperty(value, method, {
        configurable: false,
        enumerable: true,
        value: blockedMatcherMutation,
        writable: false,
      });
    }

    const matcherRegistry = globalThis[Symbol.for('$$jest-matchers-object')];
    if (!matcherRegistry || typeof matcherRegistry.matchers !== 'object' ||
        !Array.isArray(matcherRegistry.customEqualityTesters)) {
      throw new Error('Protected Jest matcher registry is unavailable');
    }
    for (const registryKey of ['matchers', 'customEqualityTesters']) {
      const registryValue = matcherRegistry[registryKey];
      Object.freeze(registryValue);
      Object.defineProperty(matcherRegistry, registryKey, {
        configurable: false,
        enumerable: true,
        value: registryValue,
        writable: false,
      });
    }
    Object.seal(matcherRegistry);
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
