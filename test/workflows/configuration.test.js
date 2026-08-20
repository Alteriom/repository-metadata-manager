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
            'actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1 # v3.2.0'
        );
        expect(workflow).toContain('app-id: ${{ secrets.APP_ID }}');
        expect(workflow).toContain(
            'APP_PRIVATE_KEY: ${{ secrets.APP_PRIVATE_KEY }}'
        );
        expect(workflow).toContain(
            'private-key: ${{ steps.private-key.outputs.private-key }}'
        );
        expect(workflow).toContain(
            'repositories: ${{ github.event.repository.name }}'
        );
        expect(workflow).toContain('base64 --decode');
        expect(workflow).toContain('permission-administration: read');
        expect(workflow).toContain('permission-contents: read');
        expect(appTokenBindings).toHaveLength(2);
        expect(workflow).not.toMatch(
            /GITHUB_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/
        );
    });

    it('uses a secret-free local compliance scope for fork pull requests', () => {
        const workflow = fs.readFileSync(
            path.join(
                projectRoot,
                '.github',
                'workflows',
                'ai-agent-compliance.yml'
            ),
            'utf8'
        );

        expect(workflow).toContain(
            "AUTHENTICATED_CONTEXT: ${{ github.event_name != 'pull_request' || (github.event.pull_request.head.repo.full_name == github.repository && github.event.pull_request.user.login != 'dependabot[bot]') }}"
        );
        expect(workflow).toContain(
            'LOCAL_ONLY_CHECKERS: cicd,dependencies,documentation,iot,license,security'
        );
        expect(workflow).toContain(
            'if: env.AUTHENTICATED_CONTEXT == \'true\''
        );
        expect(workflow).toContain('ARGS+=(--only "$LOCAL_ONLY_CHECKERS")');
        expect(workflow).toContain(
            "if: github.event_name == 'pull_request' && env.AUTHENTICATED_CONTEXT == 'true'"
        );
    });

    it('keeps unauthenticated CI checks inside a checker-specific scope', () => {
        const workflow = fs.readFileSync(
            path.join(projectRoot, '.github', 'workflows', 'ci.yml'),
            'utf8'
        );

        expect(workflow).toContain(
            'repo-manager.js check --only license --format json'
        );
        expect(workflow).not.toMatch(
            /repo-manager\.js check --format (?:github|json)/
        );
    });

    it('uses verified controls without requiring a solo maintainer to self-approve', () => {
        const policy = JSON.parse(
            fs.readFileSync(
                path.join(projectRoot, '.repo-manager.json'),
                'utf8'
            )
        );

        expect(policy.version).toBe('1.2.0');
        expect(policy.gates.requireVerifiedCheckers).toEqual([
            'branch-protection',
            'repository-metadata',
        ]);
        expect(policy.branchProtection).toMatchObject({
            requiredApprovals: 0,
            maximumRequiredApprovals: 0,
            requireStatusChecks: true,
            requireStrictStatusChecks: true,
            requireCodeOwnerReviews: false,
            requireConversationResolution: true,
            enforceAdmins: false,
        });
    });
});
