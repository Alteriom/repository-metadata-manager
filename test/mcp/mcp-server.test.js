'use strict';

const path = require('path');

describe('MCP server', () => {
  let client;

  afterEach(async () => {
    if (client) await client.close();
    client = null;
  });

  it('starts from the root package and exposes safe tools', async () => {
    const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
    const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
    const projectRoot = path.join(__dirname, '..', 'fixtures', 'healthy-project');
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [path.join(__dirname, '..', '..', 'mcp-server', 'index.js')],
      env: {
        ...process.env,
        REPO_MANAGER_ALLOWED_ROOTS: projectRoot,
        REPO_MANAGER_ENABLE_APPLY: 'false',
      },
      stderr: 'pipe',
    });
    client = new Client({ name: 'repository-manager-test', version: '1.0.0' });
    await client.connect(transport);

    const listed = await client.listTools();
    expect(listed.tools.map(tool => tool.name)).toEqual(['evaluate', 'findings', 'inventory', 'plan', 'apply']);
    expect(listed.tools.find(tool => tool.name === 'evaluate').annotations.readOnlyHint).toBe(true);
    expect(listed.tools.find(tool => tool.name === 'apply').annotations.destructiveHint).toBe(true);

    const inventory = await client.callTool({ name: 'inventory', arguments: { projectRoot } });
    expect(inventory.isError).not.toBe(true);
    expect(inventory.structuredContent.kind).toBe('RepositoryInventory');
  }, 15000);
});
