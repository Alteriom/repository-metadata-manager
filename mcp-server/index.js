#!/usr/bin/env node
/**
 * Repository Manager MCP Server v2.0
 *
 * Model Context Protocol server that provides tools for repository health
 * analysis using the v2.0 Engine API.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const parentDir = join(__dirname, '..');

const SERVER_NAME = 'repository-manager-mcp';
const SERVER_VERSION = '2.0.0';

/**
 * Create an Engine instance and optionally set a token.
 */
async function createEngine(args) {
  const engineModule = await import(join(parentDir, 'lib', 'engine', 'Engine.js'));
  const Engine = engineModule.default;
  return new Engine({
    projectRoot: args.projectRoot || process.cwd(),
    token: args.token || process.env.GITHUB_TOKEN || null,
  });
}

/**
 * Execute a tool using the Engine API.
 */
async function executeTool(toolName, args) {
  switch (toolName) {
    case 'check': {
      const engine = await createEngine(args);
      const report = await engine.run(args.only || undefined);
      return {
        content: [{ type: 'text', text: JSON.stringify(report, null, 2) }],
      };
    }

    case 'fix': {
      const engine = await createEngine(args);
      const result = await engine.fix({ dryRun: args.dryRun === true });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    case 'findings': {
      const engine = await createEngine(args);
      const report = await engine.run();

      // Collect all findings across checkers
      let findings = [];
      for (const [checkerName, result] of Object.entries(report.checkers)) {
        for (const f of result.findings || []) {
          findings.push({ ...f, checker: checkerName });
        }
      }

      // Filter by severity
      if (args.severity) {
        findings = findings.filter(f => f.severity === args.severity);
      }
      // Filter by checker
      if (args.checker) {
        findings = findings.filter(f => f.checker === args.checker);
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({ total: findings.length, findings }, null, 2) }],
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/**
 * Main server setup
 */
async function main() {
  const server = new Server(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'check',
          description: 'Run health checks on a repository. Returns a full report with scores, grades, findings, and recommendations.',
          inputSchema: {
            type: 'object',
            properties: {
              projectRoot: {
                type: 'string',
                description: 'Absolute path to the repository root',
              },
              only: {
                type: 'array',
                items: { type: 'string' },
                description: 'Run only these checkers (e.g. ["documentation", "security"])',
              },
              token: {
                type: 'string',
                description: 'GitHub token for API-based checks (optional)',
              },
            },
          },
        },
        {
          name: 'fix',
          description: 'Auto-fix detected issues in a repository. Returns the report and a list of applied/skipped fixes.',
          inputSchema: {
            type: 'object',
            properties: {
              projectRoot: {
                type: 'string',
                description: 'Absolute path to the repository root',
              },
              dryRun: {
                type: 'boolean',
                description: 'Preview fixes without applying (default: false)',
              },
              token: {
                type: 'string',
                description: 'GitHub token for API-based fixes (optional)',
              },
            },
          },
        },
        {
          name: 'findings',
          description: 'List findings from health checks, optionally filtered by severity or checker name.',
          inputSchema: {
            type: 'object',
            properties: {
              projectRoot: {
                type: 'string',
                description: 'Absolute path to the repository root',
              },
              severity: {
                type: 'string',
                enum: ['critical', 'high', 'medium', 'low', 'info'],
                description: 'Filter findings by severity level',
              },
              checker: {
                type: 'string',
                description: 'Filter findings by checker name',
              },
              token: {
                type: 'string',
                description: 'GitHub token for API-based checks (optional)',
              },
            },
          },
        },
      ],
    };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const { name, arguments: args } = request.params;
      return await executeTool(name, args || {});
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error.message}`,
        }],
        isError: true,
      };
    }
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`${SERVER_NAME} v${SERVER_VERSION} running on stdio`);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
