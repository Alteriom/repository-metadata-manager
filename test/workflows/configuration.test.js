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
        expect(workflow).toContain('permission-administration: write');
        expect(workflow).toContain('permission-checks: write');
        expect(workflow).toContain('permission-contents: read');
        expect(workflow).toContain(
            'github-token: ${{ steps.app-token.outputs.token }}'
        );
        expect(workflow).toContain(
            "name: 'Compliance Check (restricted)'"
        );
        expect(appTokenBindings).toHaveLength(2);
        expect(workflow).not.toMatch(
            /GITHUB_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/
        );
        expect(workflow).toContain('checks: write');
    });

    it('evaluates pull requests with base-branch code and policy', () => {
        const workflow = fs.readFileSync(
            path.join(
                projectRoot,
                '.github',
                'workflows',
                'ai-agent-compliance.yml'
            ),
            'utf8'
        );

        expect(workflow).toMatch(/\n {4}pull_request_target:\r?\n/);
        expect(workflow).not.toMatch(/\n {4}pull_request:\r?\n/);
        expect(workflow).toContain(
            "ref: ${{ github.event_name == 'pull_request_target' && github.event.pull_request.base.sha || github.sha }}"
        );
        expect(workflow).toContain(
            "CANDIDATE_REF: ${{ github.event_name == 'pull_request_target' && github.event.pull_request.merge_commit_sha || github.sha }}"
        );
        expect(workflow).toContain('github.rest.repos.downloadTarballArchive');
        expect(workflow).toContain('Buffer.from(response.data)');
        expect(workflow).toContain('--no-same-owner');
        expect(workflow).toContain('--no-same-permissions');
        expect(workflow).toContain('find candidate -type l -delete');
        expect(workflow).toContain('git -C candidate init --quiet');
        expect(workflow).toContain(
            "CANDIDATE_SHA: ${{ github.event_name == 'pull_request_target' && github.event.pull_request.merge_commit_sha || github.sha }}"
        );
        expect(workflow).toContain(
            'printf \'%s\\n\' "$CANDIDATE_SHA" > candidate/.git/refs/heads/candidate'
        );
        expect(workflow).toContain(
            'git -C candidate symbolic-ref HEAD refs/heads/candidate'
        );
        expect(workflow).toContain(
            'test "$(git -C candidate rev-parse HEAD)" = "$CANDIDATE_SHA"'
        );
        expect(workflow).not.toContain('commit --allow-empty');
        expect(workflow).not.toContain('git -C candidate add');
        expect(workflow).not.toMatch(/Checkout candidate repository/);
        expect(workflow).toContain('working-directory: control');
        expect(workflow).toContain(
            'cp control/.repo-manager.json candidate/.git/repo-manager-policy.json'
        );
        expect(workflow).toContain(
            '.branchProtection.requiredStatusCheckAppIds["Compliance Check"] = $app_id'
        );
        expect(workflow).toContain('node control/bin/repo-manager.js check');
        expect(workflow).toContain('--project candidate');
        expect(workflow).toContain('--policy .git/repo-manager-policy.json');
        expect(workflow).not.toContain('node candidate/bin/repo-manager.js');
        expect(workflow).toContain('run: npm ci --ignore-scripts');
        expect(workflow).not.toContain('working-directory: candidate');
        expect(workflow).toContain('name: Compliance Control Plane');
        expect(workflow).toContain('github.rest.checks.create');
        expect(workflow).toContain("name: 'Compliance Check'");
        expect(workflow).toContain(
            "CANDIDATE_SHA: ${{ github.event_name == 'pull_request_target' && github.event.pull_request.head.sha || github.sha }}"
        );
    });

    it('uses a secret-free scoped evaluation for Dependabot', () => {
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
            "AUTHENTICATED_CONTEXT: ${{ github.actor != 'dependabot[bot]' && secrets.APP_ID != '' && secrets.APP_PRIVATE_KEY != '' }}"
        );
        expect(workflow).toContain(
            'LOCAL_ONLY_CHECKERS: cicd,dependencies,documentation,iot,license,security'
        );
        expect(
            workflow.match(/if: env\.AUTHENTICATED_CONTEXT == 'true'/g)
        ).toHaveLength(2);
        expect(workflow).toContain(
            "if: always() && env.AUTHENTICATED_CONTEXT == 'true'"
        );
        expect(workflow).toContain(
            "if: always() && env.AUTHENTICATED_CONTEXT != 'true'"
        );
        expect(
            workflow.match(/ARGS\+=\(--only "\$LOCAL_ONLY_CHECKERS"\)/g)
        ).toHaveLength(2);
        expect(workflow).toContain(
            "if: github.event_name == 'pull_request_target' && env.AUTHENTICATED_CONTEXT == 'true'"
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

        expect(policy.version).toBe('1.5.0');
        expect(policy.gates.checkerMinimums['branch-protection']).toBe(100);
        expect(policy.gates.requireVerifiedCheckers).toEqual([
            'branch-protection',
            'repository-metadata',
        ]);
        expect(policy.branchProtection).toMatchObject({
            requiredApprovals: 0,
            maximumRequiredApprovals: 0,
            requireStatusChecks: true,
            requiredStatusCheckContexts: [
                'Test & Lint (24.x, ubuntu-latest)',
                'Security Summary',
                'Compliance Check',
                'CodeQL',
            ],
            requiredStatusCheckAppIds: {},
            requireStrictStatusChecks: true,
            requireCodeOwnerReviews: false,
            prohibitCodeOwnerReviews: true,
            requireConversationResolution: true,
            enforceAdmins: false,
            prohibitAdminEnforcement: true,
        });
    });
});
