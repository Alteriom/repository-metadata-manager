const fs = require('fs');
const RepositoryMetadataManager = require('../index');

// Mock fs module
jest.mock('fs');
jest.mock('@octokit/rest', () => {
    return {
        Octokit: jest.fn().mockImplementation(() => ({
            rest: {
                repos: {
                    get: jest.fn(),
                    update: jest.fn(),
                    replaceAllTopics: jest.fn(),
                },
            },
        })),
    };
});

describe('RepositoryMetadataManager', () => {
    let manager;
    let mockPackageJson;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPackageJson = {
            name: '@alteriom/test-package',
            description: 'A test package for Alteriom organization',
            keywords: ['test', 'package', 'utility'],
            repository: {
                url: 'https://github.com/Alteriom/test-package.git',
            },
        };

        fs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

        manager = new RepositoryMetadataManager({
            organizationTag: 'alteriom',
        });
    });

    describe('constructor', () => {
        it('should initialize with default configuration', () => {
            const mgr = new RepositoryMetadataManager();
            expect(mgr.config.packagePath).toBe('./package.json');
            expect(mgr.config.repositoryType).toBe('auto-detect');
        });

        it('should accept custom configuration', () => {
            const mgr = new RepositoryMetadataManager({
                organizationTag: 'custom-org',
                packagePath: './custom-package.json',
                repositoryType: 'library',
            });
            expect(mgr.config.organizationTag).toBe('custom-org');
            expect(mgr.config.packagePath).toBe('./custom-package.json');
            expect(mgr.config.repositoryType).toBe('library');
        });

        it('should load configuration from file when provided', () => {
            const configContent = {
                organizationTag: 'file-org',
                packagePath: './file-package.json',
            };
            fs.readFileSync.mockReturnValueOnce(JSON.stringify(configContent));

            const mgr = new RepositoryMetadataManager({
                configFile: './config.json',
            });

            expect(mgr.config.organizationTag).toBe('file-org');
            expect(mgr.config.packagePath).toBe('./file-package.json');
        });
    });

    describe('getPackageMetadata', () => {
        it('should read and parse package.json correctly', () => {
            const metadata = manager.getPackageMetadata();

            expect(metadata).toEqual({
                description: 'A test package for Alteriom organization',
                keywords: ['test', 'package', 'utility'],
                repository: 'https://github.com/Alteriom/test-package.git',
                name: '@alteriom/test-package',
            });
        });

        it('should handle missing package.json gracefully', () => {
            fs.readFileSync.mockImplementation(() => {
                throw new Error('File not found');
            });

            const metadata = manager.getPackageMetadata();
            expect(metadata).toBeNull();
        });

        it('should handle malformed JSON gracefully', () => {
            fs.readFileSync.mockReturnValue('invalid json');

            const metadata = manager.getPackageMetadata();
            expect(metadata).toBeNull();
        });

        it('should handle missing fields in package.json', () => {
            fs.readFileSync.mockReturnValue(JSON.stringify({ name: 'test' }));

            const metadata = manager.getPackageMetadata();
            expect(metadata).toEqual({
                description: '',
                keywords: [],
                repository: '',
                name: 'test',
            });
        });
    });

    describe('detectRepositoryType', () => {
        it('should detect ai-agent type', () => {
            const metadata = {
                keywords: ['ai', 'automation'],
                name: 'ai-agent-tool',
                description: 'AI powered automation tool',
            };

            const type = manager.detectRepositoryType(metadata);
            expect(type).toBe('ai-agent');
        });

        it('should detect api type', () => {
            const metadata = {
                keywords: ['api', 'server'],
                name: 'backend-api',
                description: 'REST API server',
            };

            const type = manager.detectRepositoryType(metadata);
            expect(type).toBe('api');
        });

        it('should detect frontend type', () => {
            const metadata = {
                keywords: ['react', 'ui'],
                name: 'frontend-app',
                description: 'React frontend application',
            };

            const type = manager.detectRepositoryType(metadata);
            expect(type).toBe('frontend');
        });

        it('should detect cli-tool type', () => {
            const metadata = {
                keywords: ['cli', 'tool'],
                name: 'command-line-utility',
                description: 'CLI utility tool',
            };

            const type = manager.detectRepositoryType(metadata);
            expect(type).toBe('cli-tool');
        });

        it('should detect library type', () => {
            const metadata = {
                keywords: ['library', 'sdk'],
                name: 'js-library',
                description: 'JavaScript library package',
            };

            const type = manager.detectRepositoryType(metadata);
            expect(type).toBe('library');
        });

        it('should default to general type', () => {
            const metadata = {
                keywords: ['random'],
                name: 'random-repo',
                description: 'Some random project',
            };

            const type = manager.detectRepositoryType(metadata);
            expect(type).toBe('general');
        });

        it('should handle null metadata', () => {
            const type = manager.detectRepositoryType(null);
            expect(type).toBe('general');
        });
    });

    describe('generateRecommendedTopics', () => {
        it('should generate topics with organization tag', () => {
            const topics = manager.generateRecommendedTopics(mockPackageJson);

            expect(topics).toContain('alteriom');
            expect(topics).toContain('test');
            expect(topics).toContain('package');
            expect(topics).toContain('utility');
        });

        it('should include type-specific topics', () => {
            const apiMetadata = {
                keywords: ['api'],
                name: 'api-server',
                description: 'API server',
            };

            const topics = manager.generateRecommendedTopics(apiMetadata);

            expect(topics).toContain('api');
            expect(topics).toContain('backend');
            expect(topics).toContain('server');
        });

        it('should remove duplicates and convert to lowercase', () => {
            const metadata = {
                keywords: ['API', 'api', 'API'],
                name: 'api-tool',
                description: 'API tool',
            };

            const topics = manager.generateRecommendedTopics(metadata);

            const apiCount = topics.filter((topic) => topic === 'api').length;
            expect(apiCount).toBe(1);
        });

        it('should work without organization tag', () => {
            const mgr = new RepositoryMetadataManager(); // No org tag
            const topics = mgr.generateRecommendedTopics(mockPackageJson);

            expect(topics).not.toContain('alteriom');
            expect(topics).toContain('test');
            expect(topics).toContain('package');
        });
    });

    describe('validateMetadata', () => {
        it('should pass validation for valid metadata', () => {
            const validation = manager.validateMetadata('Valid description', [
                'topic1',
                'topic2',
                'alteriom',
            ]);

            expect(validation.issues).toHaveLength(0);
            expect(validation.recommendations).toHaveLength(0);
        });

        it('should flag missing description', () => {
            const validation = manager.validateMetadata('', ['topic1']);

            expect(validation.issues).toContain(
                'Missing repository description'
            );
        });

        it('should flag missing topics', () => {
            const validation = manager.validateMetadata(
                'Valid description',
                []
            );

            expect(validation.issues).toContain(
                'Missing repository topics/tags for discoverability'
            );
        });

        it('should recommend shorter description', () => {
            const longDescription = 'a'.repeat(200);
            const validation = manager.validateMetadata(longDescription, [
                'topic1',
            ]);

            expect(validation.recommendations).toContain(
                'Description should be under 160 characters for optimal display'
            );
        });

        it('should recommend fewer topics', () => {
            const manyTopics = Array.from(
                { length: 25 },
                (_, i) => `topic${i}`
            );
            const validation = manager.validateMetadata(
                'Valid description',
                manyTopics
            );

            expect(validation.recommendations).toContain(
                'Consider reducing topics to 20 or fewer for better focus'
            );
        });

        it('should recommend adding organization tag', () => {
            const validation = manager.validateMetadata('Valid description', [
                'topic1',
                'topic2',
            ]);

            expect(validation.recommendations).toContain(
                'Consider adding "alteriom" topic for organization discoverability'
            );
        });
    });

    describe('getCurrentMetadata', () => {
        it('should fetch repository metadata from GitHub API', async () => {
            const mockResponse = {
                data: {
                    description: 'GitHub repo description',
                    topics: ['github', 'topic'],
                    homepage: 'https://example.com',
                },
            };

            manager.octokit.rest.repos.get.mockResolvedValue(mockResponse);

            const metadata = await manager.getCurrentMetadata('owner', 'repo');

            expect(metadata).toEqual({
                description: 'GitHub repo description',
                topics: ['github', 'topic'],
                homepage: 'https://example.com',
            });

            expect(manager.octokit.rest.repos.get).toHaveBeenCalledWith({
                owner: 'owner',
                repo: 'repo',
            });
        });

        it('should handle API errors gracefully', async () => {
            manager.octokit.rest.repos.get.mockRejectedValue(
                new Error('API Error')
            );

            const metadata = await manager.getCurrentMetadata('owner', 'repo');
            expect(metadata).toBeNull();
        });

        it('should handle missing optional fields', async () => {
            const mockResponse = {
                data: {
                    description: null,
                    topics: null,
                    homepage: null,
                },
            };

            manager.octokit.rest.repos.get.mockResolvedValue(mockResponse);

            const metadata = await manager.getCurrentMetadata('owner', 'repo');

            expect(metadata).toEqual({
                description: '',
                topics: [],
                homepage: '',
            });
        });
    });

    describe('updateDescription', () => {
        it('should successfully update repository description', async () => {
            manager.octokit.rest.repos.update.mockResolvedValue({});

            const result = await manager.updateDescription(
                'owner',
                'repo',
                'New description'
            );

            expect(result).toBe(true);
            expect(manager.octokit.rest.repos.update).toHaveBeenCalledWith({
                owner: 'owner',
                repo: 'repo',
                description: 'New description',
            });
        });

        it('should handle update errors gracefully', async () => {
            manager.octokit.rest.repos.update.mockRejectedValue(
                new Error('Update failed')
            );

            const result = await manager.updateDescription(
                'owner',
                'repo',
                'New description'
            );
            expect(result).toBe(false);
        });
    });

    describe('updateTopics', () => {
        it('should successfully update repository topics', async () => {
            manager.octokit.rest.repos.replaceAllTopics.mockResolvedValue({});

            const result = await manager.updateTopics('owner', 'repo', [
                'topic1',
                'topic2',
            ]);

            expect(result).toBe(true);
            expect(
                manager.octokit.rest.repos.replaceAllTopics
            ).toHaveBeenCalledWith({
                owner: 'owner',
                repo: 'repo',
                names: ['topic1', 'topic2'],
            });
        });

        it('should handle update errors gracefully', async () => {
            manager.octokit.rest.repos.replaceAllTopics.mockRejectedValue(
                new Error('Update failed')
            );

            const result = await manager.updateTopics('owner', 'repo', [
                'topic1',
            ]);
            expect(result).toBe(false);
        });
    });
});
