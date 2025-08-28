const HealthScoreManager = require('../lib/features/HealthScoreManager');
const DocumentationManager = require('../lib/features/DocumentationManager');
const SecurityManager = require('../lib/features/SecurityManager');
const BranchProtectionManager = require('../lib/features/BranchProtectionManager');
const CICDManager = require('../lib/features/CICDManager');

// Mock the GitHub API
jest.mock('@octokit/rest', () => {
    return {
        Octokit: jest.fn().mockImplementation(() => ({
            rest: {
                repos: {
                    get: jest.fn(),
                    getContent: jest.fn(),
                    getBranch: jest.fn(),
                    getBranchProtection: jest.fn(),
                },
                actions: {
                    listRepoWorkflows: jest.fn(),
                },
                issues: {
                    listForRepo: jest.fn(),
                },
            },
        })),
    };
});

describe('Feature Managers', () => {
    let mockOctokit;

    beforeEach(() => {
        jest.clearAllMocks();
        const { Octokit } = require('@octokit/rest');
        mockOctokit = new Octokit();
    });

    describe('HealthScoreManager', () => {
        let healthScoreManager;

        beforeEach(() => {
            healthScoreManager = new HealthScoreManager(mockOctokit);
        });

        it('should initialize with correct weights', () => {
            expect(healthScoreManager.weights).toEqual({
                documentation: 25,
                security: 30,
                branchProtection: 20,
                cicd: 25,
            });
        });

        it('should calculate health score correctly', async () => {
            const categories = {
                documentation: 80,
                security: 90,
                branchProtection: 70,
                cicd: 85,
            };

            const result = await healthScoreManager.calculateHealthScore(
                'owner',
                'repo',
                categories
            );

            expect(result).toHaveProperty('overallScore');
            expect(result).toHaveProperty('grade');
            expect(result).toHaveProperty('categories');
            expect(result.overallScore).toBeGreaterThan(0);
            expect(result.overallScore).toBeLessThanOrEqual(100);
        });

        it('should assign correct grade based on score', async () => {
            const testCases = [
                { score: 95, expectedGrade: 'A' },
                { score: 85, expectedGrade: 'B' },
                { score: 75, expectedGrade: 'C' },
                { score: 65, expectedGrade: 'D' },
                { score: 45, expectedGrade: 'F' },
            ];

            for (const testCase of testCases) {
                const categories = {
                    documentation: testCase.score,
                    security: testCase.score,
                    branchProtection: testCase.score,
                    cicd: testCase.score,
                };

                const result = await healthScoreManager.calculateHealthScore(
                    'owner',
                    'repo',
                    categories
                );
                expect(result.grade).toBe(testCase.expectedGrade);
            }
        });

        it('should handle missing categories gracefully', async () => {
            const categories = {
                documentation: 80,
                // Missing other categories
            };

            const result = await healthScoreManager.calculateHealthScore(
                'owner',
                'repo',
                categories
            );
            expect(result.overallScore).toBeGreaterThanOrEqual(0);
        });
    });

    describe('DocumentationManager', () => {
        let documentationManager;

        beforeEach(() => {
            documentationManager = new DocumentationManager(mockOctokit);
        });

        it('should audit documentation and return score', async () => {
            mockOctokit.rest.repos.getContent
                .mockResolvedValueOnce({
                    data: {
                        content:
                            Buffer.from('# Test README').toString('base64'),
                    },
                })
                .mockRejectedValueOnce(new Error('Not found'));

            const result = await documentationManager.auditDocumentation(
                'owner',
                'repo'
            );

            expect(result).toHaveProperty('score');
            expect(result).toHaveProperty('files');
            expect(result.score).toBeGreaterThanOrEqual(0);
            expect(result.score).toBeLessThanOrEqual(100);
        });

        it('should analyze document content correctly', async () => {
            const mockContent = {
                data: {
                    content: Buffer.from(
                        '# Test Project\n\nThis is a description.'
                    ).toString('base64'),
                },
            };

            mockOctokit.rest.repos.getContent.mockResolvedValue(mockContent);

            const analysis = await documentationManager.analyzeDocument(
                'owner',
                'repo',
                'README.md'
            );

            expect(analysis).toHaveProperty('exists');
            expect(analysis).toHaveProperty('score');
            expect(analysis.exists).toBe(true);
        });

        it('should handle missing documents', async () => {
            mockOctokit.rest.repos.getContent.mockRejectedValue(
                new Error('Not found')
            );

            const analysis = await documentationManager.analyzeDocument(
                'owner',
                'repo',
                'MISSING.md'
            );

            expect(analysis.exists).toBe(false);
            expect(analysis.score).toBe(0);
        });

        it('should validate README content', async () => {
            const goodContent =
                '# Project\n\nDescription here\n\n## Installation\n\n## Usage\n\n## Contributing\n\n## License';
            const contentObject = {
                content: Buffer.from(goodContent).toString('base64'),
            };
            const validation =
                await documentationManager.validateReadme(contentObject);

            expect(validation.score).toBeGreaterThan(0);
            expect(validation.issues).toHaveLength(0);
        });

        it('should detect missing README sections', async () => {
            const poorContent = '# Project';
            const contentObject = {
                content: Buffer.from(poorContent).toString('base64'),
            };
            const validation =
                await documentationManager.validateReadme(contentObject);

            expect(validation.score).toBeLessThan(30);
            expect(validation.issues.length).toBeGreaterThan(0);
        });
    });

    describe('SecurityManager', () => {
        let securityManager;

        beforeEach(() => {
            securityManager = new SecurityManager(mockOctokit);
        });

        it('should audit security and return score', async () => {
            mockOctokit.rest.repos.get.mockResolvedValue({
                data: {
                    security_and_analysis: {
                        secret_scanning: { status: 'enabled' },
                        dependabot_security_updates: { status: 'enabled' },
                    },
                },
            });

            const result = await securityManager.auditSecurity('owner', 'repo');

            expect(result).toHaveProperty('score');
            expect(result).toHaveProperty('checks');
            expect(result.score).toBeGreaterThanOrEqual(0);
            expect(result.score).toBeLessThanOrEqual(100);
        });

        it('should check for security policy', async () => {
            mockOctokit.rest.repos.getContent.mockResolvedValue({
                data: {
                    content: Buffer.from(
                        '# Security Policy\n\nReport vulnerabilities...'
                    ).toString('base64'),
                },
            });

            const result = await securityManager.checkSecurityPolicy(
                'owner',
                'repo'
            );

            expect(result).toHaveProperty('exists');
            expect(result).toHaveProperty('score');
            expect(result.exists).toBe(true);
        });

        it('should handle missing security policy', async () => {
            mockOctokit.rest.repos.getContent.mockRejectedValue(
                new Error('Not found')
            );

            const result = await securityManager.checkSecurityPolicy(
                'owner',
                'repo'
            );

            expect(result.exists).toBe(false);
            expect(result.score).toBe(0);
        });
    });

    describe('BranchProtectionManager', () => {
        let branchProtectionManager;

        beforeEach(() => {
            branchProtectionManager = new BranchProtectionManager(mockOctokit);
        });

        it('should audit branch protection', async () => {
            mockOctokit.rest.repos.getBranchProtection.mockResolvedValue({
                data: {
                    required_status_checks: { strict: true },
                    enforce_admins: { enabled: true },
                    required_pull_request_reviews: {
                        required_approving_review_count: 1,
                    },
                },
            });

            const result = await branchProtectionManager.auditBranchProtection(
                'owner',
                'repo'
            );

            expect(result).toHaveProperty('score');
            expect(result).toHaveProperty('checks');
            expect(result.score).toBeGreaterThanOrEqual(0);
        });

        it('should handle unprotected branches', async () => {
            mockOctokit.rest.repos.getBranchProtection.mockRejectedValue(
                new Error('Branch not protected')
            );

            const result = await branchProtectionManager.auditBranchProtection(
                'owner',
                'repo'
            );

            expect(result.score).toBe(0);
        });

        it('should check specific protection rules', async () => {
            const protectionData = {
                required_status_checks: { strict: true },
                enforce_admins: { enabled: true },
                required_pull_request_reviews: {
                    required_approving_review_count: 2,
                },
            };

            const result =
                branchProtectionManager.checkProtectionRules(protectionData);

            expect(result).toHaveProperty('score');
            expect(result.score).toBeGreaterThan(0);
        });
    });

    describe('CICDManager', () => {
        let cicdManager;

        beforeEach(() => {
            cicdManager = new CICDManager(mockOctokit);
        });

        it('should audit CI/CD workflows', async () => {
            mockOctokit.rest.actions.listRepoWorkflows.mockResolvedValue({
                data: {
                    workflows: [
                        {
                            name: 'CI',
                            state: 'active',
                            path: '.github/workflows/ci.yml',
                        },
                        {
                            name: 'Deploy',
                            state: 'active',
                            path: '.github/workflows/deploy.yml',
                        },
                    ],
                },
            });

            const result = await cicdManager.auditCICD('owner', 'repo');

            expect(result).toHaveProperty('score');
            expect(result).toHaveProperty('workflows');
            expect(result.score).toBeGreaterThanOrEqual(0);
        });

        it('should handle repositories without workflows', async () => {
            mockOctokit.rest.actions.listRepoWorkflows.mockResolvedValue({
                data: { workflows: [] },
            });

            const result = await cicdManager.auditCICD('owner', 'repo');

            expect(result.score).toBe(0);
            expect(result.workflows).toHaveLength(0);
        });

        it('should analyze workflow quality', async () => {
            const workflows = [
                {
                    name: 'CI',
                    state: 'active',
                    path: '.github/workflows/ci.yml',
                },
                {
                    name: 'Security',
                    state: 'active',
                    path: '.github/workflows/security.yml',
                },
                {
                    name: 'Release',
                    state: 'active',
                    path: '.github/workflows/release.yml',
                },
            ];

            const result = cicdManager.analyzeWorkflows(workflows);

            expect(result).toHaveProperty('score');
            expect(result).toHaveProperty('hasCI');
            expect(result).toHaveProperty('hasSecurity');
            expect(result.score).toBeGreaterThan(0);
        });
    });
});
