'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Planner = require('./Planner');

function contentHash(content) {
  if (content === null || content === undefined) return null;
  return crypto.createHash('sha256').update(content).digest('hex');
}

function resolveInside(root, relativePath) {
  if (typeof relativePath !== 'string' || !relativePath || path.isAbsolute(relativePath)) {
    throw new Error(`Operation path must be a non-empty relative path: ${relativePath}`);
  }
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Operation path escapes the project root: ${relativePath}`);
  }
  return resolved;
}

function rejectSymlinkTraversal(root, target) {
  const relative = path.relative(root, target);
  let current = root;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
      throw new Error(`Operation path traverses a symbolic link: ${path.relative(root, current)}`);
    }
  }
}

class Executor {
  static validate(plan) {
    if (!plan || plan.schemaVersion !== '1.0.0' || plan.kind !== 'RepositoryRemediationPlan') {
      throw new Error('Invalid or unsupported remediation plan');
    }
    if (!plan.repository || typeof plan.repository.root !== 'string') throw new Error('Plan has no repository root');
    if (!plan.policy || typeof plan.policy.id !== 'string' || typeof plan.policy.version !== 'string') {
      throw new Error('Plan has no policy identity');
    }
    if (!Array.isArray(plan.operations)) throw new Error('Plan operations must be an array');
    if (plan.id !== Planner.idFor(plan)) throw new Error('Plan content does not match its deterministic id');
    const operationIds = new Set();
    const operationPaths = new Set();
    for (const operation of plan.operations) {
      if (!operation.id || operationIds.has(operation.id)) throw new Error(`Duplicate or missing operation id: ${operation.id}`);
      operationIds.add(operation.id);
      if (operation.type !== 'write-file') throw new Error(`Unsupported operation type: ${operation.type}`);
      if (!operation.path || operationPaths.has(operation.path)) throw new Error(`Duplicate or missing operation path: ${operation.path}`);
      operationPaths.add(operation.path);
      if (typeof operation.content !== 'string') throw new Error(`Operation ${operation.id} has no file content`);
    }
  }

  static apply(plan, { projectRoot, approved = false, dryRun = true, auditPath = null } = {}) {
    Executor.validate(plan);
    const resolvedRoot = path.resolve(projectRoot || process.cwd());
    const plannedRoot = path.resolve(plan.repository.root);
    if (plannedRoot !== resolvedRoot) {
      throw new Error(`Plan targets ${plannedRoot}, not ${resolvedRoot}`);
    }
    if (!dryRun && !approved) {
      throw new Error('Applying a plan requires explicit approval (--approve)');
    }

    const results = [];
    for (const operation of plan.operations) {
      const target = resolveInside(resolvedRoot, operation.path);
      rejectSymlinkTraversal(resolvedRoot, target);
      const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
      const actualHash = contentHash(current);
      if (actualHash !== (operation.beforeHash ?? null)) {
        throw new Error(`Operation ${operation.id} is stale: ${operation.path} changed after planning`);
      }

      if (!dryRun) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        const tempPath = `${target}.repo-manager-${process.pid}.tmp`;
        fs.writeFileSync(tempPath, operation.content, { encoding: 'utf8', flag: 'wx' });
        fs.renameSync(tempPath, target);
      }

      results.push({
        id: operation.id,
        checker: operation.checker,
        path: operation.path,
        status: dryRun ? 'previewed' : 'applied',
        beforeHash: actualHash,
        afterHash: contentHash(operation.content),
      });
    }

    const audit = {
      schemaVersion: '1.0.0',
      kind: 'RepositoryRemediationAudit',
      planId: plan.id,
      timestamp: new Date().toISOString(),
      repository: plan.repository,
      policy: plan.policy,
      dryRun,
      approved: approved === true,
      results,
    };

    if (auditPath) {
      const resolvedAudit = path.resolve(auditPath);
      fs.mkdirSync(path.dirname(resolvedAudit), { recursive: true });
      fs.appendFileSync(resolvedAudit, `${JSON.stringify(audit)}\n`, 'utf8');
    }

    return audit;
  }
}

module.exports = Executor;
