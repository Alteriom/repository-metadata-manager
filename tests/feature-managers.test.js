const HealthScoreManager = require('../lib/features/HealthScoreManager');
const DocumentationManager = require('../lib/features/DocumentationManager');
const SecurityManager = require('../lib/features/SecurityManager');
const BranchProtectionManager = require('../lib/features/BranchProtectionManager');
const CICDManager = require('../lib/features/CICDManager');

// Mock TokenManager so RepositoryManager doesn't try real token detection
jest.mock('../lib/utils/TokenManager', () => {
    return jest.fn().mockImplementation(() => ({
        detectToken: jest.fn().mockReturnValue({
            token: 'test-token',
            source: 'explicit',
            isAvailable: true,
        }),
        getRepositoryInfo: jest.fn().mockReturnValue({
            owner: 'owner',
            repo: 'repo',
        }),
    }));
});

// Mock Octokit
jest.mock('@octokit/rest', () => {
    return {
        Octokit: jest.fn().mockImplementation(() => ({
            repos: {
                get: jest.fn(),
                getContent: jest.fn(),
                getBranch: jest.fn(),
                getBranchProtection: jest.fn(),
                listBranches: jest.fn(),
                listCommits: jest.fn(),
                getCommit: jest.fn(),
            },
            actions: {
                listRepoWorkflows: jest.fn(),
            },
            issues: {
                listForRepo: jest.fn(),
            },
        })),
    };
});

const testConfig = {
    token: 'test-token',
    owner: 'owner',
    repo: 'repo',
};

describe('Feature Managers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('HealthScoreManager', () => {
        let healthScoreManager;

        beforeEach(() => {
            healthScoreManager = new HealthScoreManager(testConfig);
        });

        it('should initialize with config', () => {
            expect(healthScoreManager.config).toEqual(testConfig);
        });

        it('should calculate grade correctly', () => {
            expect(healthScoreManager.calculateGrade(95)).toBe('A');
            expect(healthScoreManager.calculateGrade(85)).toBe('B');
            expect(healthScoreManager.calculateGrade(75)).toBe('C');
            expect(healthScoreManager.calculateGrade(65)).toBe('D');
            expect(healthScoreManager.calculateGrade(45)).toBe('F');
        });

        it('should assign correct grade based on score thresholds', () => {
            const testCases = [
                { score: 95, expectedGrade: 'A' },
                { score: 85, expectedGrade: 'B' },
                { score: 75, expectedGrade: 'C' },
                { score: 65, expectedGrade: 'D' },
                { score: 45, expectedGrade: 'F' },
            ];

            for (const testCase of testCases) {
                const grade = healthScoreManager.calculateGrade(testCase.score);
                expect(grade).toBe(testCase.expectedGrade);
            }
        });

        it('should generate recommendations for low-scoring categories', () => {
            const results = {
                categories: {
                    security: { score: 50, weight: 30 },
                    documentation: { score: 50, weight: 25 },
                    cicd: { score: 50, weight: 25 },
                    branchProtection: { score: 50, weight: 20 },
                },
                criticalIssues: [],
                recommendations: [],
            };

            healthScoreManager.generateRecommendations(results);

            expect(results.recommendations.length).toBeGreaterThan(0);
        });
    });

    describe('DocumentationManager', () => {
        let documentationManager;

        beforeEach(() => {
            documentationManager = new DocumentationManager(testConfig);
        });

        it('should validate README content with good sections', async () => {
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

        it('should validate changelog content', async () => {
            const changelogContent =
                '# Changelog\n\n## [1.0.0]\n\n### Added\n- Initial release';
            const contentObject = {
                content: Buffer.from(changelogContent).toString('base64'),
            };
            const validation =
                await documentationManager.validateChangelog(contentObject);

            expect(validation.score).toBeGreaterThan(0);
        });

        it('should calculate doc score from file results', () => {
            const files = [
                { file: 'README.md', weight: 30, score: 25 },
                { file: 'LICENSE', weight: 15, score: 15 },
                { file: 'CONTRIBUTING.md', weight: 15, score: 0 },
            ];

            const score = documentationManager.calculateDocScore(files);
            // (25 + 15 + 0) / (30 + 15 + 15) * 100 = 66.67 => 67
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
        });

        it('should analyze a document config for missing file', async () => {
            // Mock getContents to throw (simulating API failure) and getLocalContents to return null
            documentationManager.getContents = jest
                .fn()
                .mockRejectedValue(new Error('Not found'));
            documentationManager.getLocalContents = jest
                .fn()
                .mockResolvedValue(null);
            documentationManager.silent = true;

            const docConfig = {
                file: 'MISSING.md',
                weight: 10,
                validator: null,
            };

            const analysis =
                await documentationManager.analyzeDocument(docConfig);

            expect(analysis.exists).toBe(false);
            expect(analysis.score).toBe(0);
            expect(analysis.issues.length).toBeGreaterThan(0);
        });
    });

    describe('SecurityManager', () => {
        let securityManager;

        beforeEach(() => {
            securityManager = new SecurityManager(testConfig);
        });

        it('should calculate security score from checks', () => {
            const checks = [
                { name: 'Check A', status: true, weight: 20 },
                { name: 'Check B', status: false, weight: 20 },
                { name: 'Check C', status: true, weight: 10 },
            ];

            const score = securityManager.calculateSecurityScore(checks);

            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
            // (20 + 10) / 50 * 100 = 60
            expect(score).toBe(60);
        });

        it('should return 0 for empty checks', () => {
            const score = securityManager.calculateSecurityScore([]);
            expect(score).toBe(0);
        });

        it('should check for vulnerable packages', () => {
            const deps = {
                lodash: '^4.17.15',
                express: '^4.18.0',
            };

            const vulnerable =
                securityManager.checkVulnerablePackages(deps);

            // lodash is in the known vulnerable list
            expect(vulnerable).toContain('lodash');
        });
    });

    describe('BranchProtectionManager', () => {
        let branchProtectionManager;

        beforeEach(() => {
            branchProtectionManager = new BranchProtectionManager(testConfig);
        });

        it('should analyze branch protection with full protection', () => {
            const protectionData = {
                required_status_checks: { strict: true, contexts: ['ci'] },
                enforce_admins: { enabled: true },
                required_pull_request_reviews: {
                    required_approving_review_count: 2,
                },
                restrictions: { users: [], teams: [] },
                required_linear_history: { enabled: true },
            };

            const result = branchProtectionManager.analyzeBranchProtection(
                'main',
                protectionData
            );

            expect(result).toHaveProperty('score');
            expect(result).toHaveProperty('checks');
            expect(result.score).toBeGreaterThan(0);
            expect(result.protected).toBe(true);
        });

        it('should handle unprotected branches', () => {
            const result =
                branchProtectionManager.analyzeBranchProtection('main', null);

            expect(result.score).toBe(0);
            expect(result.protected).toBe(false);
            expect(result.issues.length).toBeGreaterThan(0);
        });

        it('should calculate branch score from multiple branches', () => {
            const branches = [
                { branch: 'main', score: 80 },
                { branch: 'develop', score: 60 },
            ];

            const score =
                branchProtectionManager.calculateBranchScore(branches);

            expect(score).toBe(70);
        });
    });

    describe('CICDManager', () => {
        let cicdManager;

        beforeEach(() => {
            cicdManager = new CICDManager(testConfig);
        });

        it('should calculate CICD score of 0 when no workflows', () => {
            const results = {
                workflows: [],
                recommendations: [],
                essentialWorkflowsScore: 0,
            };

            const score = cicdManager.calculateCICDScore(results);
            expect(score).toBe(0);
        });

        it('should calculate workflow score from checks', () => {
            const checks = [
                { name: 'Secure checkout', status: true, weight: 10 },
                { name: 'Uses caching', status: true, weight: 10 },
                { name: 'Includes testing', status: false, weight: 15 },
            ];

            const score = cicdManager.calculateWorkflowScore(checks);
            // (10 + 10) / 35 * 100 = 57.14 => 57
            expect(score).toBeGreaterThan(0);
            expect(score).toBeLessThanOrEqual(100);
        });

        it('should check workflow security issues', () => {
            const analysis = {
                checks: [],
                securityIssues: [],
                recommendations: [],
            };

            const content = `
name: CI
on: pull_request_target
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test
`;

            cicdManager.checkWorkflowSecurity(content, analysis);

            expect(analysis.securityIssues.length).toBeGreaterThan(0);
            expect(
                analysis.securityIssues.some((issue) =>
                    issue.includes('pull_request_target')
                )
            ).toBe(true);
        });
    });
});
