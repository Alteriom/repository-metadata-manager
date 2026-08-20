'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const Executor = require('../../lib/control/Executor');

function plan(root, operation) {
  const Planner = require('../../lib/control/Planner');
  const value = {
    schemaVersion: '1.0.0',
    kind: 'RepositoryRemediationPlan',
    id: null,
    repository: { root },
    policy: { id: 'test', version: '1.0.0' },
    operations: [operation],
  };
  value.id = Planner.idFor(value);
  return value;
}

describe('Executor', () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-manager-executor-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('previews by default without writing', () => {
    const targetPlan = plan(root, {
      id: 'write', checker: 'test', type: 'write-file', path: 'safe.txt', beforeHash: null, content: 'safe\n',
    });
    const audit = Executor.apply(targetPlan, { projectRoot: root });
    expect(audit.results[0].status).toBe('previewed');
    expect(fs.existsSync(path.join(root, 'safe.txt'))).toBe(false);
  });

  it('requires approval and applies the exact plan atomically', () => {
    const targetPlan = plan(root, {
      id: 'write', checker: 'test', type: 'write-file', path: 'safe.txt', beforeHash: null, content: 'safe\n',
    });
    expect(() => Executor.apply(targetPlan, { projectRoot: root, dryRun: false })).toThrow('explicit approval');

    const audit = Executor.apply(targetPlan, { projectRoot: root, dryRun: false, approved: true });
    expect(audit.results[0].status).toBe('applied');
    expect(fs.readFileSync(path.join(root, 'safe.txt'), 'utf8')).toBe('safe\n');
  });

  it('rejects traversal and stale plans', () => {
    const traversal = plan(root, {
      id: 'escape', checker: 'test', type: 'write-file', path: '../escape.txt', beforeHash: null, content: 'no',
    });
    expect(() => Executor.apply(traversal, { projectRoot: root })).toThrow('escapes');

    fs.writeFileSync(path.join(root, 'changed.txt'), 'changed');
    const stale = plan(root, {
      id: 'stale', checker: 'test', type: 'write-file', path: 'changed.txt', beforeHash: null, content: 'new',
    });
    expect(() => Executor.apply(stale, { projectRoot: root })).toThrow('stale');
  });

  it('rejects a plan modified after approval', () => {
    const targetPlan = plan(root, {
      id: 'write', checker: 'test', type: 'write-file', path: 'safe.txt', beforeHash: null, content: 'reviewed\n',
    });
    targetPlan.operations[0].content = 'tampered\n';
    expect(() => Executor.apply(targetPlan, { projectRoot: root })).toThrow('deterministic id');
  });
});
