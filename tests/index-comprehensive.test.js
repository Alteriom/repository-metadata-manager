const RepositoryMetadataManager = require('../index');
const fs = require('fs');

// Mock dependencies
jest.mock('fs');

describe('RepositoryMetadataManager Comprehensive Tests', () => {
  let manager;
  
  beforeEach(() => {
    jest.clearAllMocks();
    fs.readFileSync = jest.fn();
    fs.existsSync = jest.fn().mockReturnValue(true);
  });

  describe('Package Metadata Operations', () => {
    it('should get package metadata successfully', () => {
      const mockPackage = {
        name: 'test-package',
        description: 'Test package description',
        keywords: ['test', 'package'],
        repository: { url: 'https://github.com/owner/repo.git' }
      };
      
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPackage));
      
      manager = new RepositoryMetadataManager();
      const result = manager.getPackageMetadata();
      
      expect(result).toEqual({
        description: 'Test package description',
        keywords: ['test', 'package'],
        repository: 'https://github.com/owner/repo.git',
        name: 'test-package'
      });
    });

    it('should handle missing package.json', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      
      manager = new RepositoryMetadataManager();
      const result = manager.getPackageMetadata();
      
      expect(result).toBeNull();
    });

    it('should handle invalid JSON in package.json', () => {
      fs.readFileSync.mockReturnValue('invalid json');
      
      manager = new RepositoryMetadataManager();
      const result = manager.getPackageMetadata();
      
      expect(result).toBeNull();
    });

    it('should use custom package path', () => {
      const mockPackage = { name: 'custom-package' };
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPackage));
      
      manager = new RepositoryMetadataManager();
      manager.getPackageMetadata('./custom/package.json');
      
      expect(fs.readFileSync).toHaveBeenCalledWith(
        expect.stringMatching(/custom[\/\\]package\.json/),
        'utf8'
      );
    });
  });

  describe('Repository Type Detection', () => {
    it('should detect AI agent repository', () => {
      manager = new RepositoryMetadataManager();
      const packageMetadata = {
        name: 'ai-agent-tool',
        description: 'AI automation agent',
        keywords: ['ai', 'agent', 'automation']
      };
      
      const result = manager.detectRepositoryType(packageMetadata);
      expect(result).toBe('ai-agent');
    });

    it('should detect API repository', () => {
      manager = new RepositoryMetadataManager();
      const packageMetadata = {
        name: 'api-server',
        description: 'Backend API server',
        keywords: ['api', 'server', 'backend']
      };
      
      const result = manager.detectRepositoryType(packageMetadata);
      expect(result).toBe('api');
    });

    it('should detect frontend repository', () => {
      manager = new RepositoryMetadataManager();
      const packageMetadata = {
        name: 'frontend-app',
        description: 'React frontend application',
        keywords: ['react', 'frontend', 'ui']
      };
      
      const result = manager.detectRepositoryType(packageMetadata);
      expect(result).toBe('frontend');
    });

    it('should detect CLI tool repository', () => {
      manager = new RepositoryMetadataManager();
      const packageMetadata = {
        name: 'cli-tool',
        description: 'Command line utility',
        keywords: ['cli', 'tool', 'utility']
      };
      
      const result = manager.detectRepositoryType(packageMetadata);
      expect(result).toBe('cli-tool');
    });

    it('should detect library repository', () => {
      manager = new RepositoryMetadataManager();
      const packageMetadata = {
        name: 'simple-library',
        description: 'A simple library',
        keywords: ['library']
      };
      
      const result = manager.detectRepositoryType(packageMetadata);
      expect(result).toBe('library');
    });

    it('should default to general for unknown types', () => {
      manager = new RepositoryMetadataManager();
      const packageMetadata = {
        name: 'unknown-project',
        description: 'Some random project',
        keywords: ['random', 'project']
      };
      
      const result = manager.detectRepositoryType(packageMetadata);
      expect(result).toBe('general');
    });

    it('should handle null package metadata', () => {
      manager = new RepositoryMetadataManager();
      const result = manager.detectRepositoryType(null);
      expect(result).toBe('general');
    });
  });

  describe('Topic Generation', () => {
    it('should generate recommended topics with organization tag', () => {
      manager = new RepositoryMetadataManager({
        organizationTag: 'test-org'
      });
      
      const packageMetadata = {
        keywords: ['test', 'package'],
        name: 'test-package'
      };
      
      const result = manager.generateRecommendedTopics(packageMetadata, 'library');
      
      expect(result).toContain('test-org');
      expect(result).toContain('test');
      expect(result).toContain('package');
      expect(result).toContain('library');
    });

    it('should generate topics without organization tag', () => {
      manager = new RepositoryMetadataManager();
      
      const packageMetadata = {
        keywords: ['test', 'package']
      };
      
      const result = manager.generateRecommendedTopics(packageMetadata, 'cli-tool');
      
      expect(result).toContain('test');
      expect(result).toContain('package');
      expect(result).toContain('cli');
      expect(result).toContain('tool');
    });

    it('should auto-detect repository type for topics', () => {
      manager = new RepositoryMetadataManager();
      
      const packageMetadata = {
        keywords: ['api'],
        name: 'api-server',
        description: 'Backend API'
      };
      
      const result = manager.generateRecommendedTopics(packageMetadata);
      
      expect(result).toContain('api');
      expect(result).toContain('backend');
      expect(result).toContain('server');
    });

    it('should remove duplicate topics', () => {
      manager = new RepositoryMetadataManager();
      
      const packageMetadata = {
        keywords: ['api', 'server'],
        name: 'api-server',
        description: 'API server'
      };
      
      const result = manager.generateRecommendedTopics(packageMetadata, 'api');
      
      const apiCount = result.filter(topic => topic === 'api').length;
      expect(apiCount).toBe(1);
    });

    it('should handle custom topics configuration', () => {
      manager = new RepositoryMetadataManager({
        customTopics: {
          'custom-type': ['custom', 'topic', 'test']
        }
      });
      
      const packageMetadata = { keywords: [] };
      const result = manager.generateRecommendedTopics(packageMetadata, 'custom-type');
      
      expect(result).toContain('custom');
      expect(result).toContain('topic');
      expect(result).toContain('test');
    });
  });

  describe('Metadata Validation', () => {
    it('should validate good metadata', () => {
      manager = new RepositoryMetadataManager({
        organizationTag: 'test-org'
      });
      
      const description = 'Good description under 160 characters';
      const topics = ['test-org', 'good', 'topics'];
      
      const result = manager.validateMetadata(description, topics);
      
      expect(result.issues).toHaveLength(0);
      expect(result.recommendations).toHaveLength(0);
    });

    it('should detect missing description', () => {
      manager = new RepositoryMetadataManager();
      
      const result = manager.validateMetadata('', ['topic']);
      
      expect(result.issues).toContain('Missing repository description');
    });

    it('should detect missing topics', () => {
      manager = new RepositoryMetadataManager();
      
      const result = manager.validateMetadata('Good description', []);
      
      expect(result.issues).toContain('Missing repository topics/tags for discoverability');
    });

    it('should recommend shorter description', () => {
      manager = new RepositoryMetadataManager();
      
      const longDescription = 'A'.repeat(200);
      const result = manager.validateMetadata(longDescription, ['topic']);
      
      expect(result.recommendations).toContain(
        'Description should be under 160 characters for optimal display'
      );
    });

    it('should recommend fewer topics', () => {
      manager = new RepositoryMetadataManager();
      
      const manyTopics = Array.from({ length: 25 }, (_, i) => `topic${i}`);
      const result = manager.validateMetadata('Good description', manyTopics);
      
      expect(result.recommendations).toContain(
        'Consider reducing topics to 20 or fewer for better focus'
      );
    });

    it('should recommend organization tag', () => {
      manager = new RepositoryMetadataManager({
        organizationTag: 'test-org'
      });
      
      const result = manager.validateMetadata('Good description', ['other-topic']);
      
      expect(result.recommendations).toContain(
        'Consider adding "test-org" topic for organization discoverability'
      );
    });
  });

  describe('Offline Report Generation', () => {
    it('should generate offline report', () => {
      manager = new RepositoryMetadataManager({
        organizationTag: 'test-org'
      });
      
      const packageMetadata = {
        name: 'test-package',
        description: 'Test package',
        keywords: ['test']
      };
      
      // Mock console.log to capture output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = manager.generateOfflineReport(packageMetadata, 'owner', 'repo');
      
      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Package.json Metadata:')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Recommended Repository Metadata')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Management', () => {
    it('should load configuration from file', () => {
      const configData = {
        organizationTag: 'config-org',
        packagePath: './config-package.json'
      };
      
      fs.readFileSync.mockReturnValue(JSON.stringify(configData));
      
      manager = new RepositoryMetadataManager({
        configFile: 'test-config.json'
      });
      
      expect(manager.config.organizationTag).toBe('config-org');
      expect(manager.config.packagePath).toBe('./config-package.json');
    });

    it('should handle missing config file', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      
      // Mock console.warn to avoid output during tests
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      manager = new RepositoryMetadataManager({
        configFile: 'missing-config.json',
        organizationTag: 'test-org' // Prevent org tag warning
      });
      
      expect(manager.config).toBeDefined();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Warning: Could not load config file'),
        expect.any(String)
      );
      
      warnSpy.mockRestore();
    });

    it('should warn about missing organization tag', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      manager = new RepositoryMetadataManager();
      
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Organization tag is not configured')
      );
      
      warnSpy.mockRestore();
    });

    it('should not warn when organization tag is provided', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      manager = new RepositoryMetadataManager({
        organizationTag: 'test-org'
      });
      
      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Warning: Organization tag is not configured')
      );
      
      warnSpy.mockRestore();
    });
  });

  describe('GitHub Token Handling', () => {
    it('should use provided token', () => {
      manager = new RepositoryMetadataManager({
        token: 'provided-token'
      });
      
      expect(manager.octokit).toBeDefined();
    });

    it('should use GITHUB_TOKEN environment variable', () => {
      const originalToken = process.env.GITHUB_TOKEN;
      process.env.GITHUB_TOKEN = 'env-github-token';
      
      manager = new RepositoryMetadataManager();
      expect(manager.octokit).toBeDefined();
      
      // Restore original token
      if (originalToken) {
        process.env.GITHUB_TOKEN = originalToken;
      } else {
        delete process.env.GITHUB_TOKEN;
      }
    });

    it('should use AGENT_ORG_TOKEN environment variable', () => {
      const originalGitHubToken = process.env.GITHUB_TOKEN;
      const originalAgentToken = process.env.AGENT_ORG_TOKEN;
      
      delete process.env.GITHUB_TOKEN;
      process.env.AGENT_ORG_TOKEN = 'env-agent-token';
      
      manager = new RepositoryMetadataManager();
      expect(manager.octokit).toBeDefined();
      
      // Restore original tokens
      if (originalGitHubToken) {
        process.env.GITHUB_TOKEN = originalGitHubToken;
      }
      if (originalAgentToken) {
        process.env.AGENT_ORG_TOKEN = originalAgentToken;
      } else {
        delete process.env.AGENT_ORG_TOKEN;
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid repository type gracefully', () => {
      manager = new RepositoryMetadataManager();
      
      const packageMetadata = {
        keywords: undefined,
        name: null,
        description: null
      };
      
      const result = manager.detectRepositoryType(packageMetadata);
      expect(result).toBe('general');
    });

    it('should handle empty package metadata', () => {
      manager = new RepositoryMetadataManager();
      
      const packageMetadata = {};
      const result = manager.generateRecommendedTopics(packageMetadata);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
