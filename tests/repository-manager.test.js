const fs = require('fs');

// Mock TokenManager before requiring RepositoryManager
jest.mock('../lib/utils/TokenManager', () => {
    return jest.fn().mockImplementation(() => ({
        detectToken: jest.fn().mockReturnValue({
            token: 'test-token',
            source: 'explicit',
            isAvailable: true,
        }),
        getRepositoryInfo: jest.fn().mockReturnValue({
            owner: 'test-owner',
            repo: 'test-repo',
        }),
    }));
});

// Mock Octokit to avoid ESM import issues
const mockOctokitInstance = {
    repos: {
        get: jest.fn(),
        getContent: jest.fn(),
        getBranchProtection: jest.fn(),
        listBranches: jest.fn(),
        createOrUpdateFileContents: jest.fn(),
        update: jest.fn(),
        listCommits: jest.fn(),
        getCommit: jest.fn(),
    },
};

jest.mock('@octokit/rest', () => ({
    Octokit: jest.fn().mockImplementation(() => mockOctokitInstance),
}));

jest.mock('fs');

const RepositoryManager = require('../lib/core/RepositoryManager');

describe('RepositoryManager', () => {
    let repositoryManager;

    beforeEach(() => {
        jest.clearAllMocks();

        // Re-mock the Octokit instance methods after clearAllMocks
        mockOctokitInstance.repos.get = jest.fn();
        mockOctokitInstance.repos.getContent = jest.fn();

        repositoryManager = new RepositoryManager({
            token: 'test-token',
            owner: 'test-owner',
            repo: 'test-repo',
        });
    });

    describe('constructor', () => {
        it('should initialize with provided config', () => {
            const config = {
                token: 'test-token',
                owner: 'test-owner',
                repo: 'test-repo',
            };
            const manager = new RepositoryManager(config);
            expect(manager.config).toEqual(config);
            expect(manager.owner).toBe('test-owner');
            expect(manager.repo).toBe('test-repo');
        });

        it('should have an octokit instance when token is available', () => {
            const config = {
                token: 'test-token',
                owner: 'test-owner',
                repo: 'test-repo',
            };
            const manager = new RepositoryManager(config);
            expect(manager.octokit).toBeTruthy();
        });
    });

    describe('getContents', () => {
        it('should fetch file contents from GitHub API', async () => {
            const mockContent = {
                data: {
                    content: Buffer.from('Test content').toString('base64'),
                    encoding: 'base64',
                },
            };

            repositoryManager.octokit.repos.getContent.mockResolvedValue(
                mockContent
            );

            const result = await repositoryManager.getContents('README.md');

            expect(result).toEqual(mockContent.data);
            expect(
                repositoryManager.octokit.repos.getContent
            ).toHaveBeenCalledWith({
                owner: 'test-owner',
                repo: 'test-repo',
                path: 'README.md',
            });
        });

        it('should return null for 404 errors', async () => {
            const error = new Error('Not found');
            error.status = 404;
            repositoryManager.octokit.repos.getContent.mockRejectedValue(error);

            const result = await repositoryManager.getContents('nonexistent.md');

            expect(result).toBeNull();
        });

        it('should throw non-404 errors', async () => {
            const error = new Error('Server error');
            error.status = 500;
            repositoryManager.octokit.repos.getContent.mockRejectedValue(error);

            await expect(
                repositoryManager.getContents('file.txt')
            ).rejects.toThrow('Server error');
        });
    });

    describe('getRepository', () => {
        it('should fetch repository information', async () => {
            const mockRepo = {
                data: {
                    name: 'test-repo',
                    description: 'Test repository',
                    default_branch: 'main',
                    private: false,
                },
            };

            repositoryManager.octokit.repos.get.mockResolvedValue(mockRepo);

            const result = await repositoryManager.getRepository();

            expect(result).toEqual(mockRepo.data);
            expect(repositoryManager.octokit.repos.get).toHaveBeenCalledWith({
                owner: 'test-owner',
                repo: 'test-repo',
            });
        });
    });

    describe('getBranchProtection', () => {
        it('should fetch branch protection rules', async () => {
            const mockProtection = {
                data: {
                    required_status_checks: { strict: true },
                    enforce_admins: { enabled: true },
                },
            };

            repositoryManager.octokit.repos.getBranchProtection.mockResolvedValue(
                mockProtection
            );

            const result =
                await repositoryManager.getBranchProtection('main');

            expect(result).toEqual(mockProtection.data);
        });

        it('should return null for unprotected branches', async () => {
            const error = new Error('Not found');
            error.status = 404;
            repositoryManager.octokit.repos.getBranchProtection.mockRejectedValue(
                error
            );

            const result =
                await repositoryManager.getBranchProtection('main');

            expect(result).toBeNull();
        });
    });

    describe('_ensureAPIAvailable', () => {
        it('should throw when in local-only mode', () => {
            repositoryManager.localOnlyMode = true;
            repositoryManager.octokit = null;

            expect(() =>
                repositoryManager._ensureAPIAvailable()
            ).toThrow('GitHub API not available');
        });

        it('should not throw when API is available', () => {
            repositoryManager.localOnlyMode = false;

            expect(() =>
                repositoryManager._ensureAPIAvailable()
            ).not.toThrow();
        });
    });
});
