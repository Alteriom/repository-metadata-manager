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
const defineProperty = Object.defineProperty.bind(Object);
const freeze = Object.freeze.bind(Object);
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor.bind(Object);
const getPrototypeOf = Object.getPrototypeOf.bind(Object);
const ownKeys = Reflect.ownKeys.bind(Reflect);
const seal = Object.seal.bind(Object);

function deepFreeze(root, seen) {
  if ((typeof root !== 'object' && typeof root !== 'function') ||
      root === null || seen.has(root)) return;
  seen.add(root);
  for (const key of ownKeys(root)) {
    const descriptor = getOwnPropertyDescriptor(root, key);
    if (descriptor && 'value' in descriptor) {
      deepFreeze(descriptor.value, seen);
      const jestStackHook = root === Error &&
        (key === 'prepareStackTrace' || key === 'stackTraceLimit');
      if (!jestStackHook && descriptor.configurable && descriptor.writable) {
        const intrinsicValue = descriptor.value;
        defineProperty(root, key, {
          configurable: false,
          enumerable: descriptor.enumerable,
          get() {
            return intrinsicValue;
          },
          set(value) {
            if (this === root) {
              throw new TypeError(
                `Protected intrinsic property ${String(key)} cannot be replaced`
              );
            }
            defineProperty(this, key, {
              configurable: true,
              enumerable: descriptor.enumerable,
              value,
              writable: true,
            });
          },
        });
      }
    }
  }
  deepFreeze(getPrototypeOf(root), seen);
  if (root === Error) seal(root);
  else freeze(root);
}

function lockIntrinsicGlobals() {
  const intrinsicNames = [
    'Object', 'Function', 'Array', 'Number', 'String', 'Boolean', 'BigInt',
    'Symbol', 'Date', 'RegExp', 'Error', 'AggregateError', 'EvalError',
    'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError',
    'Math', 'JSON', 'Reflect', 'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet',
    'WeakRef', 'FinalizationRegistry', 'ArrayBuffer', 'SharedArrayBuffer',
    'DataView', 'Atomics', 'Int8Array', 'Uint8Array', 'Uint8ClampedArray',
    'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array', 'Float16Array',
    'Float32Array', 'Float64Array', 'BigInt64Array', 'BigUint64Array',
    'Buffer', 'Intl', 'TextEncoder', 'TextDecoder', 'URL', 'URLSearchParams',
    'WebAssembly',
  ];
  const seen = new Set();
  for (const name of intrinsicNames) {
    const value = globalThis[name];
    if (value === undefined) continue;
    deepFreeze(value, seen);
    const descriptor = getOwnPropertyDescriptor(globalThis, name);
    defineProperty(globalThis, name, {
      configurable: false,
      enumerable: descriptor?.enumerable === true,
      value,
      writable: false,
    });
  }
}

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

lockIntrinsicGlobals();

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
