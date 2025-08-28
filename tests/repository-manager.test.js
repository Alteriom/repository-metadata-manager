const RepositoryManager = require('../lib/core/RepositoryManager');
const fs = require('fs');

// Mock dependencies
jest.mock('@octokit/rest');
jest.mock('fs');

describe('RepositoryManager', () => {
  let repositoryManager;
  let mockOctokit;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { Octokit } = require('@octokit/rest');
    mockOctokit = {
      repos: {
        getContent: jest.fn(),
        get: jest.fn(),
      },
    };
    Octokit.mockImplementation(() => mockOctokit);

    repositoryManager = new RepositoryManager({
      token: 'test-token',
      owner: 'test-owner',
      repo: 'test-repo'
    });
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      const config = {
        token: 'test-token',
        owner: 'test-owner',
        repo: 'test-repo'
      };
      const manager = new RepositoryManager(config);
      expect(manager.config).toEqual(config);
      expect(manager.owner).toBe('test-owner');
      expect(manager.repo).toBe('test-repo');
    });

    it('should initialize octokit with token', () => {
      const config = {
        token: 'test-token',
        owner: 'test-owner', 
        repo: 'test-repo'
      };
      new RepositoryManager(config);
      expect(Octokit).toHaveBeenCalledWith({ auth: 'test-token' });
    });
  });

  describe('getContents', () => {
    it('should fetch file contents from GitHub API', async () => {
      const mockContent = {
        data: {
          content: Buffer.from('Test content').toString('base64'),
          encoding: 'base64'
        }
      };
      
      mockOctokit.rest.repos.getContent.mockResolvedValue(mockContent);

      const result = await repositoryManager.getContents('owner', 'repo', 'README.md');
      
      expect(result).toBe('Test content');
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        path: 'README.md'
      });
    });

    it('should handle directory contents', async () => {
      const mockContent = {
        data: [
          { name: 'file1.txt', type: 'file' },
          { name: 'file2.txt', type: 'file' }
        ]
      };
      
      mockOctokit.rest.repos.getContent.mockResolvedValue(mockContent);

      const result = await repositoryManager.getContents('owner', 'repo', 'src/');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should handle API errors gracefully', async () => {
      mockOctokit.rest.repos.getContent.mockRejectedValue(new Error('Not found'));

      const result = await repositoryManager.getContents('owner', 'repo', 'nonexistent.md');
      
      expect(result).toBeNull();
    });

    it('should handle non-base64 encoded content', async () => {
      const mockContent = {
        data: {
          content: 'Direct content',
          encoding: 'utf-8'
        }
      };
      
      mockOctokit.rest.repos.getContent.mockResolvedValue(mockContent);

      const result = await repositoryManager.getContents('owner', 'repo', 'file.txt');
      
      expect(result).toBe('Direct content');
    });
  });

  describe('getRepositoryInfo', () => {
    it('should fetch repository information', async () => {
      const mockRepo = {
        data: {
          name: 'test-repo',
          description: 'Test repository',
          default_branch: 'main',
          private: false,
          topics: ['test', 'repo']
        }
      };
      
      mockOctokit.rest.repos.get.mockResolvedValue(mockRepo);

      const result = await repositoryManager.getRepositoryInfo('owner', 'repo');
      
      expect(result).toEqual(mockRepo.data);
      expect(mockOctokit.rest.repos.get).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo'
      });
    });

    it('should handle API errors for repository info', async () => {
      mockOctokit.rest.repos.get.mockRejectedValue(new Error('Repository not found'));

      const result = await repositoryManager.getRepositoryInfo('owner', 'nonexistent');
      
      expect(result).toBeNull();
    });
  });

  describe('parseRepositoryUrl', () => {
    it('should parse GitHub HTTPS URLs', () => {
      const url = 'https://github.com/owner/repo.git';
      const result = repositoryManager.parseRepositoryUrl(url);
      
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should parse GitHub SSH URLs', () => {
      const url = 'git@github.com:owner/repo.git';
      const result = repositoryManager.parseRepositoryUrl(url);
      
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should handle URLs without .git extension', () => {
      const url = 'https://github.com/owner/repo';
      const result = repositoryManager.parseRepositoryUrl(url);
      
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should handle invalid URLs', () => {
      const url = 'not-a-github-url';
      const result = repositoryManager.parseRepositoryUrl(url);
      
      expect(result).toBeNull();
    });

    it('should handle undefined URLs', () => {
      const result = repositoryManager.parseRepositoryUrl(undefined);
      
      expect(result).toBeNull();
    });
  });

  describe('fileExists', () => {
    it('should check if file exists locally', () => {
      fs.existsSync.mockReturnValue(true);
      
      const result = repositoryManager.fileExists('package.json');
      
      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith('package.json');
    });

    it('should return false for non-existent files', () => {
      fs.existsSync.mockReturnValue(false);
      
      const result = repositoryManager.fileExists('nonexistent.json');
      
      expect(result).toBe(false);
    });
  });

  describe('readLocalFile', () => {
    it('should read local file content', () => {
      const mockContent = 'File content';
      fs.readFileSync.mockReturnValue(mockContent);
      
      const result = repositoryManager.readLocalFile('test.txt');
      
      expect(result).toBe(mockContent);
      expect(fs.readFileSync).toHaveBeenCalledWith('test.txt', 'utf8');
    });

    it('should handle file read errors', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      
      const result = repositoryManager.readLocalFile('nonexistent.txt');
      
      expect(result).toBeNull();
    });
  });

  describe('isGitRepository', () => {
    it('should detect git repository', () => {
      fs.existsSync.mockReturnValue(true);
      
      const result = repositoryManager.isGitRepository();
      
      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith('.git');
    });

    it('should return false for non-git directories', () => {
      fs.existsSync.mockReturnValue(false);
      
      const result = repositoryManager.isGitRepository();
      
      expect(result).toBe(false);
    });
  });

  describe('getCurrentBranch', () => {
    it('should get current branch from git', () => {
      fs.readFileSync.mockReturnValue('ref: refs/heads/main\\n');
      fs.existsSync.mockReturnValue(true);
      
      const result = repositoryManager.getCurrentBranch();
      
      expect(result).toBe('main');
    });

    it('should handle detached HEAD state', () => {
      fs.readFileSync.mockReturnValue('abc123def456');
      fs.existsSync.mockReturnValue(true);
      
      const result = repositoryManager.getCurrentBranch();
      
      expect(result).toBe('HEAD');
    });

    it('should handle missing .git/HEAD', () => {
      fs.existsSync.mockReturnValue(false);
      
      const result = repositoryManager.getCurrentBranch();
      
      expect(result).toBe('unknown');
    });

    it('should handle file read errors', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      const result = repositoryManager.getCurrentBranch();
      
      expect(result).toBe('unknown');
    });
  });

  describe('getRemoteUrl', () => {
    it('should get remote URL from git config', () => {
      const gitConfig = `[core]
        repositoryformatversion = 0
[remote "origin"]
        url = https://github.com/owner/repo.git
        fetch = +refs/heads/*:refs/remotes/origin/*`;
      
      fs.readFileSync.mockReturnValue(gitConfig);
      fs.existsSync.mockReturnValue(true);
      
      const result = repositoryManager.getRemoteUrl();
      
      expect(result).toBe('https://github.com/owner/repo.git');
    });

    it('should handle missing git config', () => {
      fs.existsSync.mockReturnValue(false);
      
      const result = repositoryManager.getRemoteUrl();
      
      expect(result).toBeNull();
    });

    it('should handle config without remote URL', () => {
      const gitConfig = `[core]
        repositoryformatversion = 0`;
      
      fs.readFileSync.mockReturnValue(gitConfig);
      fs.existsSync.mockReturnValue(true);
      
      const result = repositoryManager.getRemoteUrl();
      
      expect(result).toBeNull();
    });
  });
});
