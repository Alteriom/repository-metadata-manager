/**
 * Tests for AI Agent automation features
 */

const TokenManager = require('../lib/utils/TokenManager');
const EnvironmentDetector = require('../lib/utils/EnvironmentDetector');
const AutoFixManager = require('../lib/features/AutoFixManager');

describe('AI Agent Automation', () => {
    describe('TokenManager', () => {
        it('should detect token from environment', () => {
            const originalToken = process.env.GITHUB_TOKEN;
            const originalGitHubActions = process.env.GITHUB_ACTIONS;
            const originalCI = process.env.CI;
            
            // Temporarily disable GitHub Actions detection to test env token
            delete process.env.GITHUB_ACTIONS;
            delete process.env.CI;
            process.env.GITHUB_TOKEN = 'ghp_test_token_12345';

            const manager = new TokenManager();
            const tokenInfo = manager.detectToken();

            expect(tokenInfo.isAvailable).toBe(true);
            expect(tokenInfo.source).toBe('env-github-token');

            // Restore original
            if (originalToken) {
                process.env.GITHUB_TOKEN = originalToken;
            } else {
                delete process.env.GITHUB_TOKEN;
            }
            if (originalGitHubActions) {
                process.env.GITHUB_ACTIONS = originalGitHubActions;
            }
            if (originalCI) {
                process.env.CI = originalCI;
            }
        });

        it('should handle missing token gracefully', () => {
            const originalToken = process.env.GITHUB_TOKEN;
            const originalAgentToken = process.env.AGENT_ORG_TOKEN;
            
            delete process.env.GITHUB_TOKEN;
            delete process.env.AGENT_ORG_TOKEN;

            const manager = new TokenManager();
            const tokenInfo = manager.detectToken();

            expect(tokenInfo.isAvailable).toBe(false);
            expect(tokenInfo.localOnlyMode).toBe(true);

            // Restore original
            if (originalToken) {
                process.env.GITHUB_TOKEN = originalToken;
            }
            if (originalAgentToken) {
                process.env.AGENT_ORG_TOKEN = originalAgentToken;
            }
        });

        it('should validate token format', () => {
            const manager = new TokenManager();

            expect(manager.validateToken('ghp_validtoken123')).toBe(true);
            expect(manager.validateToken('gho_validtoken123')).toBe(true);
            expect(manager.validateToken('github_pat_validtoken')).toBe(true);
            expect(manager.validateToken('invalid')).toBe(false);
            expect(manager.validateToken('')).toBe(false);
            expect(manager.validateToken(null)).toBe(false);
        });

        it('should get repository info from environment', () => {
            const originalRepo = process.env.GITHUB_REPOSITORY;
            process.env.GITHUB_REPOSITORY = 'test-org/test-repo';

            const manager = new TokenManager();
            manager.isGitHubActions = true;
            const repoInfo = manager.getRepositoryInfo();

            expect(repoInfo.owner).toBe('test-org');
            expect(repoInfo.repo).toBe('test-repo');

            // Restore original
            if (originalRepo) {
                process.env.GITHUB_REPOSITORY = originalRepo;
            } else {
                delete process.env.GITHUB_REPOSITORY;
            }
        });
    });

    describe('EnvironmentDetector', () => {
        it('should detect local environment', () => {
            const originalCI = process.env.CI;
            const originalGitHubActions = process.env.GITHUB_ACTIONS;

            delete process.env.CI;
            delete process.env.GITHUB_ACTIONS;

            const detector = new EnvironmentDetector();
            const summary = detector.getEnvironmentSummary();

            expect(summary.type).toBe('local');
            expect(summary.isCI).toBe(false);

            // Restore original
            if (originalCI) {
                process.env.CI = originalCI;
            }
            if (originalGitHubActions) {
                process.env.GITHUB_ACTIONS = originalGitHubActions;
            }
        });

        it('should recommend local-only mode without token', () => {
            const originalToken = process.env.GITHUB_TOKEN;
            delete process.env.GITHUB_TOKEN;

            const detector = new EnvironmentDetector();
            const mode = detector.getRecommendedMode();

            expect(mode.localOnly).toBe(true);

            // Restore original
            if (originalToken) {
                process.env.GITHUB_TOKEN = originalToken;
            }
        });

        it('should detect supported features', () => {
            const detector = new EnvironmentDetector();

            expect(detector.supportsFeature('auto-fix')).toBe(true);
            expect(detector.supportsFeature('local-audit')).toBe(true);
            expect(detector.supportsFeature('file-modification')).toBe(true);
        });
    });

    describe('AutoFixManager', () => {
        it('should initialize with options', () => {
            const manager = new AutoFixManager({
                dryRun: true,
                repoPath: '/tmp/test',
            });

            expect(manager.dryRun).toBe(true);
            expect(manager.repoPath).toBe('/tmp/test');
        });

        it('should track fixes and errors', () => {
            const manager = new AutoFixManager({ dryRun: true });

            manager.fixes.push({
                file: 'test.md',
                action: 'created',
                description: 'Test fix',
            });

            const summary = manager.getSummary();

            expect(summary.totalFixes).toBe(1);
            expect(summary.dryRun).toBe(true);
            expect(summary.fixes[0].file).toBe('test.md');
        });

        it('should use configurable security email', () => {
            const manager = new AutoFixManager({
                dryRun: true,
                securityEmail: 'security@test.com',
            });

            expect(manager.options.securityEmail).toBe('security@test.com');
        });
    });

    describe('Integration', () => {
        it('should work together for full automation flow', () => {
            // Step 1: Detect environment
            const envDetector = new EnvironmentDetector();
            const envSummary = envDetector.getEnvironmentSummary();

            expect(envSummary).toHaveProperty('environment');
            expect(envSummary).toHaveProperty('hasToken');

            // Step 2: Detect token
            const tokenManager = new TokenManager();
            const tokenInfo = tokenManager.detectToken();

            expect(tokenInfo).toHaveProperty('isAvailable');
            expect(tokenInfo).toHaveProperty('source');

            // Step 3: Determine mode
            const recommendedMode = envDetector.getRecommendedMode();

            expect(recommendedMode).toHaveProperty('localOnly');
            expect(recommendedMode).toHaveProperty('autoFix');

            // Step 4: Initialize AutoFixManager
            const autoFixManager = new AutoFixManager({
                dryRun: true,
                repoPath: process.cwd(),
            });

            expect(autoFixManager).toBeDefined();
            expect(autoFixManager.dryRun).toBe(true);
        });
    });
});
