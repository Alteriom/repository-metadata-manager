'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_POLICY = Object.freeze({
  schemaVersion: 1,
  id: 'alteriom/repository-baseline',
  version: '1.0.0',
  checkers: {
    documentation: { enabled: true, weight: 25 },
    security: { enabled: true, weight: 30 },
    cicd: { enabled: true, weight: 20 },
    dependencies: { enabled: true, weight: 10 },
    'branch-protection': { enabled: true, weight: 15 },
    license: { enabled: true, weight: 5 },
    'repository-metadata': { enabled: true, weight: 10 },
    iot: { enabled: true, weight: 10 },
  },
  gates: {
    failBelow: 70,
    maxCritical: 0,
    maxHigh: 0,
    checkerMinimums: {
      security: 70,
      cicd: 70,
    },
    requireVerifiedCheckers: [],
  },
  branchProtection: {
    requiredApprovals: 1,
    requireStatusChecks: true,
    requiredStatusCheckContexts: [],
    requiredStatusCheckAppIds: {},
    requireStrictStatusChecks: true,
    requireCodeOwnerReviews: true,
    prohibitLastPushApproval: false,
    requireConversationResolution: true,
    enforceAdmins: true,
    requireSignedCommits: false,
    requireLinearHistory: false,
  },
  repositoryMetadata: {
    requireDescription: true,
    minimumTopics: 3,
    requiredTopics: [],
    deleteBranchOnMerge: true,
    requireSecretScanning: true,
    requireDependabotSecurityUpdates: true,
  },
  security: {
    maxFileSizeBytes: 1048576,
    ignoredDirectories: ['.git', 'node_modules', 'coverage', 'dist', 'build', '.cache'],
    ignoredPaths: ['test/fixtures'],
  },
});

const ALLOWED_TOP_LEVEL = new Set([
  'schemaVersion',
  'id',
  'version',
  'checkers',
  'gates',
  'thresholds',
  'branchProtection',
  'repositoryMetadata',
  'security',
]);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function merge(base, override) {
  const result = clone(base);
  for (const [key, value] of Object.entries(override || {})) {
    if (isObject(value) && isObject(result[key])) {
      result[key] = merge(result[key], value);
    } else {
      result[key] = clone(value);
    }
  }
  return result;
}

function assertScore(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${label} must be a number between 0 and 100`);
  }
}

function assertKnownProperties(value, allowed, label) {
  for (const key of Object.keys(value || {})) {
    if (!allowed.has(key)) throw new Error(`Unknown ${label} property: ${key}`);
  }
}

class Policy {
  static defaults() {
    return clone(DEFAULT_POLICY);
  }

  static load(projectRoot, configPath = '.repo-manager.json') {
    const resolvedRoot = path.resolve(projectRoot);
    const resolvedConfig = path.isAbsolute(configPath)
      ? path.resolve(configPath)
      : path.resolve(resolvedRoot, configPath);

    if (!resolvedConfig.startsWith(`${resolvedRoot}${path.sep}`) && resolvedConfig !== resolvedRoot) {
      throw new Error(`Policy path must stay within the project root: ${configPath}`);
    }

    if (!fs.existsSync(resolvedConfig)) {
      return { policy: Policy.defaults(), configPath: resolvedConfig, source: 'default' };
    }

    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(resolvedConfig, 'utf8'));
    } catch (error) {
      throw new Error(`Invalid policy JSON in ${configPath}: ${error.message}`, { cause: error });
    }

    Policy.validate(parsed);

    // Preserve compatibility with the v2 thresholds.fail spelling.
    if (parsed.thresholds && parsed.thresholds.fail !== undefined) {
      parsed.gates = { ...(parsed.gates || {}), failBelow: parsed.thresholds.fail };
    }
    delete parsed.thresholds;

    return {
      policy: merge(DEFAULT_POLICY, parsed),
      configPath: resolvedConfig,
      source: configPath,
    };
  }

  static validate(policy) {
    if (!isObject(policy)) throw new Error('Policy must be a JSON object');

    for (const key of Object.keys(policy)) {
      if (!ALLOWED_TOP_LEVEL.has(key)) throw new Error(`Unknown policy property: ${key}`);
    }

    if (policy.schemaVersion !== undefined && policy.schemaVersion !== 1) {
      throw new Error('Unsupported policy schemaVersion; expected 1');
    }
    if (policy.id !== undefined && (typeof policy.id !== 'string' || !policy.id.trim())) {
      throw new Error('Policy id must be a non-empty string');
    }
    if (policy.version !== undefined && (typeof policy.version !== 'string' || !/^\d+\.\d+\.\d+/.test(policy.version))) {
      throw new Error('Policy version must be a semantic version string');
    }

    if (policy.checkers !== undefined) {
      if (!isObject(policy.checkers)) throw new Error('Policy checkers must be an object');
      for (const [name, config] of Object.entries(policy.checkers)) {
        if (!isObject(config)) throw new Error(`Checker policy ${name} must be an object`);
        if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
          throw new Error(`Checker ${name}.enabled must be boolean`);
        }
        if (config.weight !== undefined && (!Number.isFinite(config.weight) || config.weight < 0)) {
          throw new Error(`Checker ${name}.weight must be a non-negative number`);
        }
      }
    }

    const gates = policy.gates || {};
    if (!isObject(gates)) throw new Error('Policy gates must be an object');
    assertKnownProperties(gates, new Set(['failBelow', 'maxCritical', 'maxHigh', 'checkerMinimums', 'requireVerifiedCheckers']), 'gates');
    if (gates.failBelow !== undefined) assertScore(gates.failBelow, 'gates.failBelow');
    for (const key of ['maxCritical', 'maxHigh']) {
      if (gates[key] !== undefined && (!Number.isInteger(gates[key]) || gates[key] < 0)) {
        throw new Error(`gates.${key} must be a non-negative integer`);
      }
    }
    if (gates.checkerMinimums !== undefined) {
      if (!isObject(gates.checkerMinimums)) throw new Error('gates.checkerMinimums must be an object');
      for (const [name, score] of Object.entries(gates.checkerMinimums)) {
        assertScore(score, `gates.checkerMinimums.${name}`);
      }
    }
    if (gates.requireVerifiedCheckers !== undefined &&
        (!Array.isArray(gates.requireVerifiedCheckers) || gates.requireVerifiedCheckers.some(value => typeof value !== 'string'))) {
      throw new Error('gates.requireVerifiedCheckers must be an array of checker names');
    }

    const branch = policy.branchProtection || {};
    if (!isObject(branch)) throw new Error('branchProtection must be an object');
    assertKnownProperties(branch, new Set([
      'requiredApprovals', 'maximumRequiredApprovals', 'requireStatusChecks', 'requiredStatusCheckContexts',
      'requiredStatusCheckAppIds',
      'requireStrictStatusChecks',
      'requireCodeOwnerReviews', 'prohibitCodeOwnerReviews',
      'prohibitLastPushApproval', 'requireConversationResolution',
      'enforceAdmins', 'prohibitAdminEnforcement',
      'requireSignedCommits', 'requireLinearHistory',
    ]), 'branchProtection');
    for (const key of ['requiredApprovals', 'maximumRequiredApprovals']) {
      if (branch[key] !== undefined && (!Number.isInteger(branch[key]) || branch[key] < 0)) {
        throw new Error(`branchProtection.${key} must be a non-negative integer`);
      }
    }
    const effectiveRequiredApprovals =
      branch.requiredApprovals ?? DEFAULT_POLICY.branchProtection.requiredApprovals;
    if (branch.maximumRequiredApprovals !== undefined &&
        branch.maximumRequiredApprovals < effectiveRequiredApprovals) {
      throw new Error('branchProtection.maximumRequiredApprovals must be greater than or equal to requiredApprovals');
    }
    if (branch.requiredStatusCheckContexts !== undefined) {
      if (!Array.isArray(branch.requiredStatusCheckContexts) ||
          branch.requiredStatusCheckContexts.some(value => typeof value !== 'string' || !value.trim())) {
        throw new Error('branchProtection.requiredStatusCheckContexts must be an array of non-empty strings');
      }
      if (new Set(branch.requiredStatusCheckContexts).size !== branch.requiredStatusCheckContexts.length) {
        throw new Error('branchProtection.requiredStatusCheckContexts must not contain duplicates');
      }
      const effectiveRequireStatusChecks =
        branch.requireStatusChecks ?? DEFAULT_POLICY.branchProtection.requireStatusChecks;
      if (!effectiveRequireStatusChecks && branch.requiredStatusCheckContexts.length > 0) {
        throw new Error('branchProtection.requiredStatusCheckContexts requires requireStatusChecks');
      }
    }
    if (branch.requiredStatusCheckAppIds !== undefined) {
      if (!isObject(branch.requiredStatusCheckAppIds)) {
        throw new Error('branchProtection.requiredStatusCheckAppIds must be an object');
      }
      const requiredContexts = branch.requiredStatusCheckContexts || [];
      for (const [contextName, appId] of Object.entries(branch.requiredStatusCheckAppIds)) {
        if (!contextName.trim() || !Number.isInteger(appId) || appId <= 0) {
          throw new Error('branchProtection.requiredStatusCheckAppIds must map non-empty contexts to positive integer App IDs');
        }
        if (!requiredContexts.includes(contextName)) {
          throw new Error(`branchProtection.requiredStatusCheckAppIds.${contextName} must also be listed in requiredStatusCheckContexts`);
        }
      }
    }
    const effectiveCodeOwnerReviews =
      branch.requireCodeOwnerReviews ?? DEFAULT_POLICY.branchProtection.requireCodeOwnerReviews;
    if (effectiveCodeOwnerReviews === true && branch.prohibitCodeOwnerReviews === true) {
      throw new Error('branchProtection cannot require and prohibit code-owner reviews');
    }
    const effectiveAdminEnforcement =
      branch.enforceAdmins ?? DEFAULT_POLICY.branchProtection.enforceAdmins;
    if (effectiveAdminEnforcement === true && branch.prohibitAdminEnforcement === true) {
      throw new Error('branchProtection cannot require and prohibit administrator enforcement');
    }
    for (const [key, value] of Object.entries(branch)) {
      if (!['requiredApprovals', 'maximumRequiredApprovals', 'requiredStatusCheckContexts', 'requiredStatusCheckAppIds'].includes(key) &&
          typeof value !== 'boolean') {
        throw new Error(`branchProtection.${key} must be boolean`);
      }
    }

    const security = policy.security || {};
    if (!isObject(security)) throw new Error('security must be an object');
    assertKnownProperties(security, new Set(['maxFileSizeBytes', 'ignoredDirectories', 'ignoredPaths']), 'security');
    if (security.maxFileSizeBytes !== undefined && (!Number.isInteger(security.maxFileSizeBytes) || security.maxFileSizeBytes <= 0)) {
      throw new Error('security.maxFileSizeBytes must be a positive integer');
    }
    if (security.ignoredDirectories !== undefined &&
        (!Array.isArray(security.ignoredDirectories) || security.ignoredDirectories.some(v => typeof v !== 'string'))) {
      throw new Error('security.ignoredDirectories must be an array of strings');
    }
    if (security.ignoredPaths !== undefined &&
        (!Array.isArray(security.ignoredPaths) || security.ignoredPaths.some(v => typeof v !== 'string'))) {
      throw new Error('security.ignoredPaths must be an array of strings');
    }

    const metadata = policy.repositoryMetadata || {};
    if (!isObject(metadata)) throw new Error('repositoryMetadata must be an object');
    assertKnownProperties(metadata, new Set([
      'requireDescription', 'minimumTopics', 'requiredTopics', 'deleteBranchOnMerge',
      'requireSecretScanning', 'requireDependabotSecurityUpdates',
    ]), 'repositoryMetadata');
    if (metadata.minimumTopics !== undefined && (!Number.isInteger(metadata.minimumTopics) || metadata.minimumTopics < 0)) {
      throw new Error('repositoryMetadata.minimumTopics must be a non-negative integer');
    }
    if (metadata.requiredTopics !== undefined &&
        (!Array.isArray(metadata.requiredTopics) || metadata.requiredTopics.some(value => typeof value !== 'string'))) {
      throw new Error('repositoryMetadata.requiredTopics must be an array of strings');
    }
    for (const key of ['requireDescription', 'deleteBranchOnMerge', 'requireSecretScanning', 'requireDependabotSecurityUpdates']) {
      if (metadata[key] !== undefined && typeof metadata[key] !== 'boolean') {
        throw new Error(`repositoryMetadata.${key} must be boolean`);
      }
    }

    if (policy.thresholds !== undefined) {
      if (!isObject(policy.thresholds)) throw new Error('thresholds must be an object');
      assertKnownProperties(policy.thresholds, new Set(['fail']), 'thresholds');
      if (policy.thresholds.fail !== undefined) assertScore(policy.thresholds.fail, 'thresholds.fail');
    }

    return true;
  }
}

module.exports = Policy;
module.exports.DEFAULT_POLICY = DEFAULT_POLICY;
