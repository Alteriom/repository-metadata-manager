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
        expect(workflow).toContain("name: 'Compliance Check (restricted)'");
        expect(appTokenBindings).toHaveLength(2);
        expect(workflow).not.toMatch(
            /GITHUB_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/
        );
        expect(workflow).toContain('checks: write');
    });

    it('evaluates candidates with an immutable administrator-selected control plane', () => {
        const workflow = fs.readFileSync(
            path.join(
                projectRoot,
                '.github',
                'workflows',
                'ai-agent-compliance.yml'
            ),
            'utf8'
        );
        const privilegedJob = workflow.slice(
            workflow.indexOf('    compliance-check:')
        );

        expect(workflow).toMatch(/\n {4}pull_request_target:\r?\n/);
        expect(workflow).not.toMatch(/\n {4}pull_request:\r?\n/);
        expect(workflow).toMatch(
            /\n {4}repository_dispatch:\r?\n {8}types: \[repository-compliance\]/
        );
        expect(workflow).not.toMatch(/\n {4}workflow_dispatch:\r?\n/);
        expect(workflow).not.toMatch(/\n {4}push:\r?\n/);
        expect(workflow).not.toMatch(/\n {4}schedule:\r?\n/);
        expect(workflow).toContain(
            'TRUSTED_CONTROL_SHA: ${{ vars.REPOSITORY_MANAGER_CONTROL_SHA }}'
        );
        expect(workflow).toContain("if (!/^[0-9a-f]{40}$/.test(controlSha || ''))");
        expect(workflow.match(
            /ref: \$\{\{ needs\.resolve-candidate\.outputs\.control-sha \}\}/g
        )).toHaveLength(2);
        expect(workflow).toContain(
            'CANDIDATE_REF: ${{ needs.resolve-candidate.outputs.archive-sha }}'
        );
        expect(workflow).toContain(
            'DISPATCH_PR_NUMBER: ${{ github.event.client_payload.pull_request_number }}'
        );
        expect(workflow.match(/github\.rest\.pulls\.get/g)).toHaveLength(1);
        expect(workflow).toContain("core.setOutput('archive-sha', archiveSha)");
        expect(workflow).toContain("core.setOutput('control-sha', controlSha)");
        expect(workflow).toContain("core.setOutput('report-sha', reportSha)");
        expect(workflow).toContain("core.setOutput('check-sha', checkSha)");
        expect(workflow).toContain('github.rest.pulls.listFiles');
        expect(workflow).toContain("file.filename.startsWith('.github/workflows/')");
        expect(workflow).toContain('github.rest.issues.listComments');
        expect(workflow).toContain('github.rest.repos.getCollaboratorPermissionLevel');
        expect(workflow).toContain("permission.permission === 'admin'");
        expect(workflow).toContain('`/approve-command-center ${checkSha}`');
        expect(workflow).toContain('github.rest.repos.downloadTarballArchive');
        expect(workflow).toContain('Buffer.from(response.data)');
        expect(workflow).toContain('--no-same-owner');
        expect(workflow).toContain('--no-same-permissions');
        expect(workflow).toContain('find candidate -type l -delete');
        expect(workflow).toContain('git -C candidate init --quiet');
        expect(workflow).toContain(
            'CANDIDATE_SHA: ${{ needs.resolve-candidate.outputs.report-sha }}'
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
        expect(workflow).toContain(
            '.branchProtection.requiredStatusCheckAppIds["Trusted Test & Lint"] = $app_id'
        );
        expect(workflow).toContain('node control/bin/repo-manager.js check');
        expect(workflow).toContain('--project candidate');
        expect(workflow).toContain('--policy .git/repo-manager-policy.json');
        expect(workflow).not.toContain('node candidate/bin/repo-manager.js');
        expect(workflow).toContain('run: npm ci --ignore-scripts');
        expect(privilegedJob).not.toContain('working-directory: candidate');
        expect(workflow).toContain('name: Compliance Control Plane');
        expect(workflow).toContain('github.rest.checks.create');
        expect(workflow).toContain("name: 'Compliance Check'");
        expect(workflow).toContain("name: 'Trusted Test & Lint'");
        expect(workflow).toContain(
            'CANDIDATE_SHA: ${{ needs.resolve-candidate.outputs.check-sha }}'
        );
        expect(workflow).toContain(
            'needs: [resolve-candidate, trusted-candidate-tests]'
        );
    });

    it('runs merge-authority tests from protected code without App secrets', () => {
        const workflow = fs.readFileSync(
            path.join(
                projectRoot,
                '.github',
                'workflows',
                'ai-agent-compliance.yml'
            ),
            'utf8'
        );
        const sandbox = workflow.slice(
            workflow.indexOf('    trusted-candidate-tests:'),
            workflow.indexOf('    compliance-check:')
        );

        expect(sandbox).toContain('name: Trusted Candidate Test Sandbox');
        expect(sandbox).toContain('persist-credentials: false');
        expect(sandbox).toContain("node-version: '24.x'");
        expect(sandbox).toContain('npm ci --ignore-scripts');
        expect(sandbox).toContain('rm -rf candidate/test');
        expect(sandbox).toContain('cp -R control/test candidate/test');
        expect(sandbox).toContain('control/eslint.config.js');
        expect(sandbox).toContain('control/scripts/run-trusted-tests.js');
        expect(sandbox).toContain('sudo env -i');
        expect(sandbox).toContain(
            'REPO_MANAGER_TRUSTED_TEST_ISOLATION=required'
        );
        expect(sandbox).not.toContain('--runInBand');
        expect(sandbox).toContain('env -i');
        expect(sandbox).not.toContain('APP_PRIVATE_KEY');
        expect(sandbox).not.toContain('APP_ID');
        expect(sandbox).not.toMatch(/npm (?:run )?test/);
        expect(sandbox).not.toMatch(/npm (?:run )?lint/);
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
            "if: always() && env.AUTHENTICATED_CONTEXT == 'true' && steps.app-token.outcome == 'success'"
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

        expect(policy.version).toBe('1.7.0');
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
                'Trusted Test & Lint',
                'Compliance Check',
                'CodeQL',
            ],
            requiredStatusCheckAppIds: { CodeQL: 57789 },
            requireStrictStatusChecks: true,
            requireCodeOwnerReviews: false,
            prohibitCodeOwnerReviews: true,
            prohibitLastPushApproval: true,
            requireConversationResolution: true,
            enforceAdmins: false,
            prohibitAdminEnforcement: true,
        });
    });
});
