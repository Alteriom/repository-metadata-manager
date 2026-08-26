#!/usr/bin/env node
/**
 * Repository Manager MCP Server
 *
 * Read-only by default. Applying an approved remediation plan additionally
 * requires REPO_MANAGER_ENABLE_APPLY=true in the server environment.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const Engine = require('../lib/engine/Engine');
const Context = require('../lib/engine/Context');
const Inventory = require('../lib/control/Inventory');
const pkg = require('../package.json');

const SERVER_NAME = 'repository-manager-mcp';
const APPLY_ENABLED = process.env.REPO_MANAGER_ENABLE_APPLY === 'true';
const ALLOWED_ROOTS = (process.env.REPO_MANAGER_ALLOWED_ROOTS || process.cwd())
  .split(path.delimiter)
  .filter(Boolean)
  .map(root => path.resolve(root));

function allowedProjectRoot(candidate) {
  const resolved = path.resolve(candidate || process.cwd());
  const allowed = ALLOWED_ROOTS.some(root => resolved === root || resolved.startsWith(`${root}${path.sep}`));
  if (!allowed) throw new Error(`Project root is outside REPO_MANAGER_ALLOWED_ROOTS: ${resolved}`);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(`Project root is not a directory: ${resolved}`);
  }
  return resolved;
}

function createEngine(args) {
  return new Engine({
    projectRoot: allowedProjectRoot(args.projectRoot),
    config: args.policy || '.repo-manager.json',
  });
}

function result(value) {
  return {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
  };
}

async function executeTool(toolName, args) {
  switch (toolName) {
    case 'evaluate': {
      return result(await createEngine(args).run(args.only));
    }
    case 'findings': {
      const report = await createEngine(args).run(args.only);
      let findings = Object.values(report.checkers).flatMap(checker => checker.findings || []);
      if (args.severity) findings = findings.filter(finding => finding.severity === args.severity);
      if (args.checker) findings = findings.filter(finding => finding.checker === args.checker);
      return result({ schemaVersion: report.schemaVersion, repository: report.repository, policy: report.policy, total: findings.length, findings });
    }
    case 'inventory': {
      const projectRoot = allowedProjectRoot(args.projectRoot);
      const context = await Context.build({
        projectRoot,
        token: process.env.GITHUB_TOKEN || null,
        configPath: args.policy || '.repo-manager.json',
      });
      return result(Inventory.local(context));
    }
    case 'plan': {
      return result(await createEngine(args).plan({ only: args.only }));
    }
    case 'apply': {
      if (!APPLY_ENABLED) throw new Error('Apply capability is disabled; set REPO_MANAGER_ENABLE_APPLY=true when starting the server');
      if (args.approved !== true) throw new Error('Apply requires approved=true and an exact previously reviewed plan');
      const engine = createEngine({ projectRoot: args.plan?.repository?.root, policy: args.policy });
      return result(await engine.applyPlan(args.plan, { approved: true, dryRun: false }));
    }
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

const projectProperties = {
  projectRoot: { type: 'string', description: 'Repository path within REPO_MANAGER_ALLOWED_ROOTS' },
  policy: { type: 'string', description: 'Policy path relative to the repository root' },
  only: { type: 'array', items: { type: 'string' }, description: 'Optional checker names' },
};

const tools = [
  {
    name: 'evaluate',
    description: 'Evaluate a repository against its validated policy and return hard-gate status.',
    inputSchema: { type: 'object', properties: projectProperties },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  },
  {
    name: 'findings',
    description: 'Return normalized policy findings with optional filters.',
    inputSchema: {
      type: 'object',
      properties: {
        ...projectProperties,
        severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
        checker: { type: 'string' },
      },
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  },
  {
    name: 'inventory',
    description: 'Return normalized identity and metadata for a local repository.',
    inputSchema: { type: 'object', properties: { projectRoot: projectProperties.projectRoot, policy: projectProperties.policy } },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  },
  {
    name: 'plan',
    description: 'Create a deterministic remediation plan without changing repository state.',
    inputSchema: { type: 'object', properties: projectProperties },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  },
  {
    name: 'apply',
    description: 'Apply an exact approved plan. Disabled unless the server explicitly enables apply capability.',
    inputSchema: {
      type: 'object',
      required: ['plan', 'approved'],
      properties: {
        plan: { type: 'object', description: 'Exact RepositoryRemediationPlan returned by plan' },
        approved: { type: 'boolean', const: true },
        policy: projectProperties.policy,
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
  },
];

async function main() {
  const server = new Server(
    { name: SERVER_NAME, version: pkg.version },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  server.setRequestHandler(CallToolRequestSchema, async request => {
    try {
      return await executeTool(request.params.name, request.params.arguments || {});
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
  });

  await server.connect(new StdioServerTransport());
  console.error(`${SERVER_NAME} v${pkg.version} running on stdio (apply=${APPLY_ENABLED ? 'enabled' : 'disabled'})`);
}

main().catch(error => {
  console.error('Server error:', error);
  process.exit(1);
});
