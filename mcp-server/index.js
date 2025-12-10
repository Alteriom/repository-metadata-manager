#!/usr/bin/env node
/**
 * Repository Manager MCP Server
 * 
 * Model Context Protocol server that provides tools for GitHub repository management,
 * including health scoring, documentation checks, security audits, CI/CD analysis,
 * branch protection, and automated compliance fixing.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import feature managers from parent lib directory
const parentLibPath = join(__dirname, '..', 'lib');

// Server configuration
const SERVER_NAME = 'repository-manager-mcp';
const SERVER_VERSION = '1.0.0';

/**
 * Execute a repository management tool
 */
async function executeTool(toolName, args) {
  // Import feature managers dynamically
  const { default: HealthScoreManager } = await import(join(parentLibPath, 'features', 'HealthScoreManager.js'));
  const { default: DocumentationManager } = await import(join(parentLibPath, 'features', 'DocumentationManager.js'));
  const { default: SecurityManager } = await import(join(parentLibPath, 'features', 'SecurityManager.js'));
  const { default: CICDManager } = await import(join(parentLibPath, 'features', 'CICDManager.js'));
  const { default: BranchProtectionManager } = await import(join(parentLibPath, 'features', 'BranchProtectionManager.js'));
  const { default: AutomationManager } = await import(join(parentLibPath, 'features', 'AutomationManager.js'));
  
  const config = {
    owner: process.env.GITHUB_REPOSITORY_OWNER || args.owner,
    repo: process.env.GITHUB_REPOSITORY_NAME || args.repo,
    token: process.env.GITHUB_TOKEN,
    silent: true // Suppress console output for MCP
  };

  switch (toolName) {
    case 'calculate_health_score': {
      const manager = new HealthScoreManager(config);
      const health = await manager.calculateHealthScore();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(health, null, 2)
        }]
      };
    }

    case 'audit_documentation': {
      const manager = new DocumentationManager(config);
      const results = await manager.auditDocumentation();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }]
      };
    }

    case 'check_missing_documentation': {
      const manager = new DocumentationManager(config);
      const results = await manager.checkDocumentation();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }]
      };
    }

    case 'audit_security': {
      const manager = new SecurityManager(config);
      const results = await manager.auditSecurity();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }]
      };
    }

    case 'audit_cicd': {
      const manager = new CICDManager(config);
      const results = await manager.auditWorkflows();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }]
      };
    }

    case 'audit_branch_protection': {
      const manager = new BranchProtectionManager(config);
      const results = await manager.auditBranchProtection();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }]
      };
    }

    case 'generate_health_report': {
      const manager = new HealthScoreManager(config);
      const { report } = await manager.generateHealthReport();
      return {
        content: [{
          type: 'text',
          text: report
        }]
      };
    }

    case 'run_org_health_audit': {
      const automation = new AutomationManager(config);
      const results = await automation.runOrganizationHealthAudit({
        report: args.report !== false,
        parallel: args.parallel !== false,
        concurrency: args.concurrency || 5,
        trending: args.trending === true
      });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }]
      };
    }

    case 'detect_missing_workflows': {
      const automation = new AutomationManager(config);
      const results = await automation.detectMissingWorkflows({
        report: args.report !== false
      });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }]
      };
    }

    case 'track_dependencies': {
      const automation = new AutomationManager(config);
      const results = await automation.trackDependencies({
        report: args.report !== false
      });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }]
      };
    }

    case 'auto_fix_compliance': {
      const automation = new AutomationManager(config);
      const results = await automation.autoFixComplianceIssues({
        dryRun: args.dryRun !== false,
        target: args.target || 'current'
      });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }]
      };
    }

    case 'generate_compliance_report': {
      const automation = new AutomationManager(config);
      const results = await automation.generateComplianceReport({
        save: args.save === true,
        trending: args.trending === true
      });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }]
      };
    }

    case 'generate_security_dashboard': {
      const automation = new AutomationManager(config);
      const results = await automation.generateSecurityDashboard({
        save: args.save === true
      });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }]
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
          name: 'calculate_health_score',
          description: 'Calculate overall repository health score across Documentation (25%), Security (30%), Branch Protection (20%), and CI/CD (25%) categories. Returns detailed scoring breakdown with grade (A-F) and actionable recommendations.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: {
                type: 'string',
                description: 'Repository owner (org or user)'
              },
              repo: {
                type: 'string',
                description: 'Repository name'
              },
              repositoryPath: {
                type: 'string',
                description: 'Local path to repository (optional, defaults to current directory)'
              }
            }
          }
        },
        {
          name: 'audit_documentation',
          description: 'Perform comprehensive documentation audit checking for README.md, CHANGELOG.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, LICENSE, SECURITY.md, issue templates, and PR templates. Returns quality scores and recommendations.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              repositoryPath: { type: 'string', description: 'Local path to repository' }
            }
          }
        },
        {
          name: 'check_missing_documentation',
          description: 'Quick check for missing required documentation files. Returns lists of missing and existing documentation.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              repositoryPath: { type: 'string', description: 'Local path to repository' }
            }
          }
        },
        {
          name: 'audit_security',
          description: 'Audit repository security including npm vulnerabilities, file permissions, SECURITY.md policy, and dependency health. Uses local npm audit when possible.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              repositoryPath: { type: 'string', description: 'Local path to repository' }
            }
          }
        },
        {
          name: 'audit_cicd',
          description: 'Analyze CI/CD workflows including GitHub Actions, build processes, test coverage, deployment automation, and security best practices.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              repositoryPath: { type: 'string', description: 'Local path to repository' }
            }
          }
        },
        {
          name: 'audit_branch_protection',
          description: 'Check branch protection rules for main/master branches including required reviews, status checks, and restrictions.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' }
            },
            required: ['owner', 'repo']
          }
        },
        {
          name: 'generate_health_report',
          description: 'Generate a comprehensive human-readable health report with scores, grades, and recommendations across all categories.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              repositoryPath: { type: 'string', description: 'Local path to repository' }
            }
          }
        },
        {
          name: 'run_org_health_audit',
          description: 'Run health audit across all repositories in an organization. Processes repositories in parallel with configurable concurrency.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Organization name' },
              report: { type: 'boolean', description: 'Generate detailed report (default: true)' },
              parallel: { type: 'boolean', description: 'Process in parallel (default: true)' },
              concurrency: { type: 'number', description: 'Number of concurrent operations (default: 5)' },
              trending: { type: 'boolean', description: 'Include trend analysis (default: false)' }
            },
            required: ['owner']
          }
        },
        {
          name: 'detect_missing_workflows',
          description: 'Detect repositories missing essential CI/CD workflows (tests, linting, security scans, deployment).',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Organization name' },
              report: { type: 'boolean', description: 'Generate detailed report (default: true)' }
            },
            required: ['owner']
          }
        },
        {
          name: 'track_dependencies',
          description: 'Track dependency versions across all organization repositories to identify outdated or vulnerable dependencies.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Organization name' },
              report: { type: 'boolean', description: 'Generate detailed report (default: true)' }
            },
            required: ['owner']
          }
        },
        {
          name: 'auto_fix_compliance',
          description: 'Automatically fix common compliance issues like missing documentation files. Supports dry-run mode and can target current repository or all organization repositories.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner or organization' },
              repo: { type: 'string', description: 'Repository name (for single repo)' },
              dryRun: { type: 'boolean', description: 'Preview changes without applying (default: true)' },
              target: { type: 'string', enum: ['current', 'all'], description: 'Target scope: current repo or all org repos (default: current)' }
            }
          }
        },
        {
          name: 'generate_compliance_report',
          description: 'Generate comprehensive organization-wide compliance report with scoring, issue tracking, and trend analysis.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Organization name' },
              save: { type: 'boolean', description: 'Save report to file (default: false)' },
              trending: { type: 'boolean', description: 'Include trend analysis (default: false)' }
            },
            required: ['owner']
          }
        },
        {
          name: 'generate_security_dashboard',
          description: 'Generate security vulnerability dashboard across all organization repositories with severity breakdown and remediation priorities.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Organization name' },
              save: { type: 'boolean', description: 'Save dashboard to file (default: false)' }
            },
            required: ['owner']
          }
        }
      ]
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
          text: `Error: ${error.message}\n\nStack trace:\n${error.stack}`
        }],
        isError: true
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
