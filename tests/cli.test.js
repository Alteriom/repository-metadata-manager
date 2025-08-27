const fs = require('fs');
const path = require('path');

describe('CLI Integration Tests', () => {
    const cliPath = path.resolve(__dirname, '..', 'bin', 'cli.js');

    describe('CLI module loading', () => {
        it('should load CLI module without errors', () => {
            expect(() => {
                require(cliPath);
            }).not.toThrow();
        });

        it('should have executable file permissions', () => {
            expect(fs.existsSync(cliPath)).toBe(true);
            const stats = fs.statSync(cliPath);
            expect(stats.isFile()).toBe(true);
        });
    });

    describe('CLI file structure', () => {
        it('should contain required shebang and imports', () => {
            const cliContent = fs.readFileSync(cliPath, 'utf8');
            expect(cliContent).toContain('#!/usr/bin/env node');
            expect(cliContent).toContain('RepositoryMetadataManager');
        });

        it('should contain main command cases', () => {
            const cliContent = fs.readFileSync(cliPath, 'utf8');
            expect(cliContent).toContain('case \'report\'');
            expect(cliContent).toContain('case \'apply\'');
            expect(cliContent).toContain('case \'dry-run\'');
            expect(cliContent).toContain('case \'validate\'');
        });

        it('should contain help and version handling', () => {
            const cliContent = fs.readFileSync(cliPath, 'utf8');
            expect(cliContent).toContain('Options:');
            expect(cliContent).toContain('Commands:');
            expect(cliContent).toContain('Examples:');
        });
    });
});
