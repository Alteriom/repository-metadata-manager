'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const Policy = require('../../lib/policy/Policy');

describe('Policy', () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-manager-policy-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('returns a versioned default policy when no file exists', () => {
    const loaded = Policy.load(root);
    expect(loaded.source).toBe('default');
    expect(loaded.policy.schemaVersion).toBe(1);
    expect(loaded.policy.gates.failBelow).toBe(70);
  });

  it('merges validated overrides with defaults', () => {
    fs.writeFileSync(path.join(root, '.repo-manager.json'), JSON.stringify({
      schemaVersion: 1,
      id: 'test/policy',
      version: '2.0.0',
      gates: { failBelow: 85 },
      checkers: { security: { weight: 50 } },
    }));

    const loaded = Policy.load(root);
    expect(loaded.policy.gates.failBelow).toBe(85);
    expect(loaded.policy.checkers.security.weight).toBe(50);
    expect(loaded.policy.checkers.documentation.enabled).toBe(true);
  });

  it('fails closed for malformed or unknown policy data', () => {
    fs.writeFileSync(path.join(root, '.repo-manager.json'), '{broken');
    expect(() => Policy.load(root)).toThrow('Invalid policy JSON');

    fs.writeFileSync(path.join(root, '.repo-manager.json'), JSON.stringify({ unexpected: true }));
    expect(() => Policy.load(root)).toThrow('Unknown policy property');
  });

  it('validates approval ranges', () => {
    expect(() => Policy.validate({
      branchProtection: { requiredApprovals: 0, maximumRequiredApprovals: 0 },
    })).not.toThrow();

    expect(() => Policy.validate({
      branchProtection: { requiredApprovals: 1, maximumRequiredApprovals: 0 },
    })).toThrow('must be greater than or equal to requiredApprovals');

    expect(() => Policy.validate({
      branchProtection: { maximumRequiredApprovals: 0 },
    })).toThrow('must be greater than or equal to requiredApprovals');

    expect(() => Policy.validate({
      branchProtection: { maximumRequiredApprovals: 0.5 },
    })).toThrow('must be a non-negative integer');

    expect(() => Policy.validate({
      branchProtection: { requireCodeOwnerReviews: true, prohibitCodeOwnerReviews: true },
    })).toThrow('cannot require and prohibit code-owner reviews');

    expect(() => Policy.validate({
      branchProtection: { prohibitCodeOwnerReviews: true },
    })).toThrow('cannot require and prohibit code-owner reviews');

    expect(() => Policy.validate({
      branchProtection: { enforceAdmins: true, prohibitAdminEnforcement: true },
    })).toThrow('cannot require and prohibit administrator enforcement');

    expect(() => Policy.validate({
      branchProtection: { prohibitAdminEnforcement: true },
    })).toThrow('cannot require and prohibit administrator enforcement');

    expect(() => Policy.validate({
      branchProtection: { prohibitLastPushApproval: true },
    })).not.toThrow();

    expect(() => Policy.validate({
      branchProtection: { prohibitLastPushApproval: 'yes' },
    })).toThrow('branchProtection.prohibitLastPushApproval must be boolean');
  });

  it('validates required status-check contexts', () => {
    expect(() => Policy.validate({
      branchProtection: { requiredStatusCheckContexts: ['ci', 'security'] },
    })).not.toThrow();

    expect(() => Policy.validate({
      branchProtection: { requiredStatusCheckContexts: ['ci', ''] },
    })).toThrow('must be an array of non-empty strings');

    expect(() => Policy.validate({
      branchProtection: { requiredStatusCheckContexts: ['ci', 'ci'] },
    })).toThrow('must not contain duplicates');

    expect(() => Policy.validate({
      branchProtection: { requireStatusChecks: false, requiredStatusCheckContexts: ['ci'] },
    })).toThrow('requires requireStatusChecks');

    expect(() => Policy.validate({
      branchProtection: {
        requiredStatusCheckContexts: ['Compliance Check'],
        requiredStatusCheckAppIds: { 'Compliance Check': 12345 },
      },
    })).not.toThrow();

    expect(() => Policy.validate({
      branchProtection: {
        requiredStatusCheckContexts: ['Compliance Check'],
        requiredStatusCheckAppIds: { 'Compliance Check': 0 },
      },
    })).toThrow('positive integer App IDs');

    expect(() => Policy.validate({
      branchProtection: {
        requiredStatusCheckContexts: ['ci'],
        requiredStatusCheckAppIds: { 'Compliance Check': 12345 },
      },
    })).toThrow('must also be listed in requiredStatusCheckContexts');
  });

  it('rejects policy paths outside the repository', () => {
    expect(() => Policy.load(root, path.join('..', 'policy.json'))).toThrow('must stay within');
  });
});
