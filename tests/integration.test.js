const fs = require('fs');
const RepositoryMetadataManager = require('../index');

describe('Integration Tests', () => {
    let tempPackageJson;
    let originalPackageJson;

    beforeAll(() => {
        // Backup original package.json
        try {
            originalPackageJson = fs.readFileSync('package.json', 'utf8');
        } catch (error) {
            // No package.json exists
        }
    });

    afterAll(() => {
        // Restore original package.json if it existed
        if (originalPackageJson) {
            fs.writeFileSync('package.json', originalPackageJson);
        }
    });

    beforeEach(() => {
        tempPackageJson = {
            name: '@alteriom/test-integration',
            version: '1.0.0',
            description: 'Integration test package for metadata manager',
            keywords: ['test', 'integration', 'automation'],
            repository: {
                url: 'https://github.com/Alteriom/test-integration.git'
            }
        };
    });

    afterEach(() => {
        // Clean up temp package.json
        try {
            if (fs.existsSync('test-package.json')) {
                fs.unlinkSync('test-package.json');
            }
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('End-to-End Workflow', () => {
        it('should complete full metadata management workflow', () => {
            // Create test package.json
            fs.writeFileSync('test-package.json', JSON.stringify(tempPackageJson, null, 2));

            // Initialize manager
            const manager = new RepositoryMetadataManager({
                organizationTag: 'alteriom',
                packagePath: './test-package.json'
            });

            // Test getPackageMetadata
            const packageMetadata = manager.getPackageMetadata();
            expect(packageMetadata).toBeTruthy();
            expect(packageMetadata.name).toBe('@alteriom/test-integration');
            expect(packageMetadata.description).toBe('Integration test package for metadata manager');

            // Test repository type detection
            const repoType = manager.detectRepositoryType(packageMetadata);
            expect(repoType).toBe('ai-agent'); // 'automation' keyword triggers ai-agent detection

            // Test topic generation
            const recommendedTopics = manager.generateRecommendedTopics(packageMetadata);
            expect(recommendedTopics).toContain('alteriom');
            expect(recommendedTopics).toContain('test');
            expect(recommendedTopics).toContain('integration');
            expect(recommendedTopics).toContain('automation');
            expect(recommendedTopics).toContain('github-integration'); // from ai-agent type

            // Test validation
            const validation = manager.validateMetadata(
                packageMetadata.description,
                recommendedTopics
            );
            expect(validation.issues).toHaveLength(0); // Should be valid
        });

        it('should handle different repository types correctly', () => {
            const testCases = [
                {
                    keywords: ['ai', 'agent'],
                    expectedType: 'ai-agent',
                    expectedTopics: ['automation', 'github-integration', 'compliance']
                },
                {
                    keywords: ['api', 'server'],
                    expectedType: 'api',
                    expectedTopics: ['api', 'backend', 'server']
                },
                {
                    keywords: ['cli', 'tool'],
                    expectedType: 'cli-tool',
                    expectedTopics: ['cli', 'tool', 'command-line']
                },
                {
                    keywords: ['library', 'sdk'],
                    expectedType: 'library',
                    expectedTopics: ['library', 'package', 'sdk']
                }
            ];

            testCases.forEach(({ keywords, expectedType, expectedTopics }) => {
                const testPackage = {
                    ...tempPackageJson,
                    keywords,
                    name: `@alteriom/test-${expectedType}`
                };

                fs.writeFileSync('test-package.json', JSON.stringify(testPackage, null, 2));

                const manager = new RepositoryMetadataManager({
                    organizationTag: 'alteriom',
                    packagePath: './test-package.json'
                });

                const packageMetadata = manager.getPackageMetadata();
                const detectedType = manager.detectRepositoryType(packageMetadata);
                const topics = manager.generateRecommendedTopics(packageMetadata);

                expect(detectedType).toBe(expectedType);
                expectedTopics.forEach(topic => {
                    expect(topics).toContain(topic);
                });
            });
        });

        it('should validate metadata compliance correctly', () => {
            const testCases = [
                {
                    description: '',
                    topics: [],
                    expectedIssues: 2 // Missing description and topics
                },
                {
                    description: 'Valid description',
                    topics: [],
                    expectedIssues: 1 // Missing topics only
                },
                {
                    description: '',
                    topics: ['topic1', 'topic2'],
                    expectedIssues: 1 // Missing description only
                },
                {
                    description: 'Valid description',
                    topics: ['topic1', 'topic2'],
                    expectedIssues: 0 // All good
                }
            ];

            const manager = new RepositoryMetadataManager({
                organizationTag: 'alteriom'
            });

            testCases.forEach(({ description, topics, expectedIssues }) => {
                const validation = manager.validateMetadata(description, topics);
                expect(validation.issues).toHaveLength(expectedIssues);
            });
        });
    });

    describe('Configuration Loading', () => {
        it('should load configuration from file', () => {
            const configContent = {
                organizationTag: 'test-org',
                repositoryType: 'library',
                customTopics: {
                    'library': ['custom', 'library', 'topic']
                }
            };

            fs.writeFileSync('test-config.json', JSON.stringify(configContent, null, 2));

            try {
                const manager = new RepositoryMetadataManager({
                    configFile: './test-config.json'
                });

                expect(manager.config.organizationTag).toBe('test-org');
                expect(manager.config.repositoryType).toBe('library');
                expect(manager.config.customTopics.library).toContain('custom');
            } finally {
                fs.unlinkSync('test-config.json');
            }
        });

        it('should handle missing config file gracefully', () => {
            const manager = new RepositoryMetadataManager({
                configFile: './non-existent-config.json'
            });

            // Should still initialize with defaults
            expect(manager.config.packagePath).toBe('./package.json');
            expect(manager.config.repositoryType).toBe('auto-detect');
        });
    });
});
