'use strict';

const fs = require('fs');
const Module = require('module');
const path = require('path');

if (process.env.JEST_WORKER_ID && typeof process.send === 'function') {
  const processChildPath = path.join(
    path.dirname(require.resolve('jest-worker')),
    'processChild.js'
  );
  const originalExtension = Module._extensions['.js'];
  const originalSend = process.send.bind(process);
  const blockedWorkerSend = () => {
    throw new Error('Candidate code cannot send Jest worker results');
  };

  Object.freeze(blockedWorkerSend);
  Object.defineProperty(process, 'send', {
    configurable: false,
    value: blockedWorkerSend,
    writable: false,
  });

  Module._extensions['.js'] = (loadedModule, filename) => {
    if (path.resolve(filename) !== path.resolve(processChildPath)) {
      return originalExtension(loadedModule, filename);
    }

    const source = fs.readFileSync(filename, 'utf8');
    const sendCalls = source.match(/\bprocess\.send\(/g) || [];
    if (sendCalls.length === 0) {
      throw new Error('Trusted Jest worker harness has no auditable send calls');
    }
    Object.defineProperty(loadedModule, '__repositoryManagerTrustedSend', {
      configurable: true,
      value: originalSend,
      writable: false,
    });
    const prelude = [
      "'use strict';",
      "const __repositoryManagerTrustedSend = module.__repositoryManagerTrustedSend;",
      'delete module.__repositoryManagerTrustedSend;',
    ].join('\n');
    const transformed = source.replace(
      /\bprocess\.send\(/g,
      '__repositoryManagerTrustedSend('
    );
    Module._extensions['.js'] = originalExtension;
    return loadedModule._compile(`${prelude}\n${transformed}`, filename);
  };
}
