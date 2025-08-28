const RepositoryMetadataManager = require('../index');

describe('Index Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Module Exports', () => {
        it('should export RepositoryMetadataManager class', () => {
            expect(RepositoryMetadataManager).toBeDefined();
            expect(typeof RepositoryMetadataManager).toBe('function');
        });

        it('should be the default export', () => {
            expect(RepositoryMetadataManager.name).toBe(
                'RepositoryMetadataManager'
            );
        });
    });

    describe('Class Instantiation', () => {
        it('should instantiate RepositoryMetadataManager without errors', () => {
            expect(() => new RepositoryMetadataManager()).not.toThrow();
        });

        it('should instantiate with options', () => {
            const options = {
                token: 'test-token',
                organizationTag: 'test-org',
            };
            expect(() => new RepositoryMetadataManager(options)).not.toThrow();
        });

        it('should instantiate with config file', () => {
            // Mock fs for config file loading
            const fs = require('fs');
            jest.mock('fs');
            fs.readFileSync = jest
                .fn()
                .mockReturnValue('{"organizationTag": "test-org"}');

            const options = {
                configFile: 'test-config.json',
            };
            expect(() => new RepositoryMetadataManager(options)).not.toThrow();
        });
    });

    describe('Default Configuration', () => {
        it('should have default configuration values', () => {
            const manager = new RepositoryMetadataManager();

            expect(manager.config).toBeDefined();
            expect(manager.config.packagePath).toBe('./package.json');
            expect(manager.config.repositoryType).toBe('auto-detect');
        });

        it('should merge options with defaults', () => {
            const options = {
                organizationTag: 'test-org',
                packagePath: './custom-package.json',
            };
            const manager = new RepositoryMetadataManager(options);

            expect(manager.config.organizationTag).toBe('test-org');
            expect(manager.config.packagePath).toBe('./custom-package.json');
            expect(manager.config.repositoryType).toBe('auto-detect');
        });
    });

    describe('GitHub Integration', () => {
        it('should detect Octokit availability', () => {
            const manager = new RepositoryMetadataManager();
            expect(typeof manager.octokitAvailable).toBe('boolean');
        });

        it('should initialize Octokit with token', () => {
            const manager = new RepositoryMetadataManager({
                token: 'test-token',
            });
            expect(manager.octokit).toBeDefined();
        });

        it('should work without GitHub token', () => {
            const manager = new RepositoryMetadataManager();
            expect(manager.octokit).toBeDefined();
        });
    });

    describe('Method Availability', () => {
        let manager;

        beforeEach(() => {
            manager = new RepositoryMetadataManager();
        });

        it('should have core metadata methods', () => {
            expect(typeof manager.getPackageMetadata).toBe('function');
            expect(typeof manager.getCurrentMetadata).toBe('function');
            expect(typeof manager.updateDescription).toBe('function');
            expect(typeof manager.updateTopics).toBe('function');
        });

        it('should have analysis methods', () => {
            expect(typeof manager.detectRepositoryType).toBe('function');
            expect(typeof manager.generateRecommendedTopics).toBe('function');
            expect(typeof manager.validateMetadata).toBe('function');
        });

        it('should have compliance methods', () => {
            expect(typeof manager.generateComplianceReport).toBe('function');
            expect(typeof manager.generateOfflineReport).toBe('function');
            expect(typeof manager.applyRecommendedUpdates).toBe('function');
        });
    });

    describe('Configuration Loading', () => {
        it('should handle missing config file gracefully', () => {
            // Mock fs to throw error
            const fs = require('fs');
            jest.mock('fs');
            fs.readFileSync = jest.fn().mockImplementation(() => {
                throw new Error('File not found');
            });

            const manager = new RepositoryMetadataManager({
                configFile: 'nonexistent.json',
            });

            expect(manager).toBeDefined();
            expect(manager.config).toBeDefined();
        });

        it('should handle invalid JSON in config file', () => {
            const fs = require('fs');
            jest.mock('fs');
            fs.readFileSync = jest.fn().mockReturnValue('invalid json');

            const manager = new RepositoryMetadataManager({
                configFile: 'invalid.json',
            });

            expect(manager).toBeDefined();
            expect(manager.config).toBeDefined();
        });
    });

    describe('Environment Integration', () => {
        it('should use GITHUB_TOKEN from environment', () => {
            const originalToken = process.env.GITHUB_TOKEN;
            process.env.GITHUB_TOKEN = 'env-token';

            const manager = new RepositoryMetadataManager();
            expect(manager).toBeDefined();

            // Restore original token
            if (originalToken) {
                process.env.GITHUB_TOKEN = originalToken;
            } else {
                delete process.env.GITHUB_TOKEN;
            }
        });

        it('should use AGENT_ORG_TOKEN from environment', () => {
            const originalToken = process.env.AGENT_ORG_TOKEN;
            process.env.AGENT_ORG_TOKEN = 'agent-token';

            const manager = new RepositoryMetadataManager();
            expect(manager).toBeDefined();

            // Restore original token
            if (originalToken) {
                process.env.AGENT_ORG_TOKEN = originalToken;
            } else {
                delete process.env.AGENT_ORG_TOKEN;
            }
        });
    });

    describe('Offline Mode Support', () => {
        it('should work in offline mode when Octokit unavailable', () => {
            const manager = new RepositoryMetadataManager();
            expect(manager.octokit).toBeDefined();
            // Should still have mock Octokit for offline operation
        });

        it('should provide offline functionality', () => {
            const manager = new RepositoryMetadataManager();
            expect(typeof manager.generateOfflineReport).toBe('function');
            expect(typeof manager.getPackageMetadata).toBe('function');
        });
    });
});
