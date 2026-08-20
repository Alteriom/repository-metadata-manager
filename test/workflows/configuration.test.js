'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..', '..');

describe('workflow control configuration', () => {
    it('preserves the repository policy gate unless fail-below is explicitly supplied', () => {
        const action = fs.readFileSync(
            path.join(projectRoot, 'action.yml'),
            'utf8'
        );

        expect(action).toMatch(/fail-below:[\s\S]*?default: ''/);
        expect(action).toContain('if [ -n "$INPUT_FAIL_BELOW" ]; then');
        expect(action).toContain('ARGS+=(--fail-below "$INPUT_FAIL_BELOW")');
    });

    it('uses the moderate threshold for both npm audit invocations', () => {
        const workflow = fs.readFileSync(
            path.join(projectRoot, '.github', 'workflows', 'security.yml'),
            'utf8'
        );

        expect(workflow).toContain('npm audit --json --audit-level moderate');
        expect(workflow).toContain('npm audit --audit-level moderate');
    });

    it('keeps the MCP SDK license exception package- and version-scoped', () => {
        const workflow = fs.readFileSync(
            path.join(projectRoot, '.github', 'workflows', 'security.yml'),
            'utf8'
        );

        expect(workflow).toContain(
            'allow-dependencies-licenses: pkg:npm/json-schema-typed@8.0.2'
        );
        expect(workflow).not.toMatch(/allow-licenses:.*\bJSON\b/);
    });

    it('authenticates compliance checks with a least-privilege GitHub App token', () => {
        const workflow = fs.readFileSync(
            path.join(
                projectRoot,
                '.github',
                'workflows',
                'ai-agent-compliance.yml'
            ),
            'utf8'
        );
        const appTokenBindings =
            workflow.match(
                /GITHUB_TOKEN: \$\{\{ steps\.app-token\.outputs\.token \}\}/g
            ) || [];

        expect(workflow).toContain(
            'actions/create-github-app-token@fee1f7d63c2ff003460e3d139729b119787bc349 # v2.2.2'
        );
        expect(workflow).toContain('app-id: ${{ secrets.APP_ID }}');
        expect(workflow).toContain(
            'private-key: ${{ secrets.APP_PRIVATE_KEY }}'
        );
        expect(workflow).toContain('permission-administration: read');
        expect(workflow).toContain('permission-contents: read');
        expect(appTokenBindings).toHaveLength(2);
        expect(workflow).not.toMatch(
            /GITHUB_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/
        );
    });

    it('uses verified controls without requiring a solo maintainer to self-approve', () => {
        const policy = JSON.parse(
            fs.readFileSync(
                path.join(projectRoot, '.repo-manager.json'),
                'utf8'
            )
        );

        expect(policy.version).toBe('1.1.0');
        expect(policy.gates.requireVerifiedCheckers).toEqual([
            'branch-protection',
            'repository-metadata',
        ]);
        expect(policy.branchProtection).toMatchObject({
            requiredApprovals: 0,
            requireStatusChecks: true,
            requireStrictStatusChecks: true,
            requireCodeOwnerReviews: false,
            requireConversationResolution: true,
            enforceAdmins: false,
        });
    });
});
