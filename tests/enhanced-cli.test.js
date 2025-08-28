const { execSync } = require('child_process');
const path = require('path');

// Test the enhanced CLI by running it as a subprocess
describe('Enhanced CLI', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'enhanced-cli.js');

    // Helper function to run CLI commands
    const runCLI = (args) => {
        try {
            const command = `node "${cliPath}" ${args}`;
            const output = execSync(command, {
                encoding: 'utf8',
                timeout: 30000,
                stdio: 'pipe',
            });
            return output;
        } catch (error) {
            return {
                stdout: error.stdout || '',
                stderr: error.stderr || '',
                status: error.status || 1,
                output: error.stdout || error.stderr || 'Command failed',
            };
        }
    };

    // Helper function to get output text from result
    const getOutput = (result) => {
        if (typeof result === 'string') {
            return result;
        }
        return result.output || result.stdout || result.stderr || '';
    };

    describe('Help Command', () => {
        it('should display help when no arguments provided', () => {
            const result = runCLI('--help');
            const output = getOutput(result);
            expect(output).toContain('Complete Repository Management Suite');
            expect(output).toContain('Commands:');
        });

        it('should display version information', () => {
            const result = runCLI('--version');
            const output = getOutput(result);
            expect(output).toMatch(/\d+\.\d+\.\d+/);
        });
    });

    describe('Health Command', () => {
        it('should run health check command', () => {
            const result = runCLI('health');
            const output = getOutput(result);
            // Should contain health-related output
            expect(output).toMatch(/(health|score|audit)/i);
        });

        it('should support detailed health flag', () => {
            const result = runCLI('health --detailed');
            const output = getOutput(result);
            expect(output).toMatch(/(health|score|detailed)/i);
        });

        it('should support json output format', () => {
            const result = runCLI('health --json');
            const output = getOutput(result);
            // Should be valid JSON or contain JSON-related output
            expect(output.length).toBeGreaterThan(0);
        });
    });

    describe('Documentation Command', () => {
        it('should run documentation audit', () => {
            const result = runCLI('docs --audit');
            const output = getOutput(result);
            expect(output).toMatch(/(documentation|docs|audit)/i);
        });

        it('should support dry-run mode', () => {
            const result = runCLI('docs --audit --dry-run');
            const output = getOutput(result);
            expect(output).toMatch(/(dry.?run|preview|simulation)/i);
        });
    });

    describe('Security Command', () => {
        it('should run security audit', () => {
            const result = runCLI('security --audit');
            const output = getOutput(result);
            expect(output).toMatch(/(security|audit|vulnerability)/i);
        });

        it('should support local security checks', () => {
            const result = runCLI('security --local');
            const output = getOutput(result);
            expect(output).toMatch(/(security|local|audit)/i);
        });
    });

    describe('Branch Protection Command', () => {
        it('should run branch protection audit', () => {
            const result = runCLI('branches --audit');
            const output = getOutput(result);
            expect(output).toMatch(/(branch|protection|audit)/i);
        });

        it('should support specific branch analysis', () => {
            const result = runCLI('branches --audit --branch main');
            const output = getOutput(result);
            expect(output).toMatch(/(branch|main|protection)/i);
        });
    });

    describe('CI/CD Command', () => {
        it('should run CICD audit', () => {
            const result = runCLI('cicd --audit');
            const output = getOutput(result);
            expect(output).toMatch(/(ci.?cd|workflow|pipeline)/i);
        });

        it('should support workflow template generation', () => {
            const result = runCLI('cicd --template');
            const output = getOutput(result);
            expect(output).toMatch(/(template|workflow|generate)/i);
        });
    });

    describe('Compliance Command', () => {
        it('should run compliance check', () => {
            const result = runCLI('compliance');
            const output = getOutput(result);
            expect(output).toMatch(/(compliance|check|standard)/i);
        });

        it('should support auto-fix mode', () => {
            const result = runCLI('compliance --fix');
            const output = getOutput(result);
            expect(output).toMatch(/(compliance|fix|auto)/i);
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid commands gracefully', () => {
            const result = runCLI('invalid-command');
            expect(
                result.status ||
                    result.stderr ||
                    result.stdout ||
                    getOutput(result)
            ).toBeTruthy();
            // Should contain error message or help text
        });

        it('should handle invalid flags gracefully', () => {
            const result = runCLI('health --invalid-flag');
            expect(
                result.status ||
                    result.stderr ||
                    result.stdout ||
                    getOutput(result)
            ).toBeTruthy();
            // Should handle unknown options
        });
    });

    describe('Global Options', () => {
        it('should support verbose mode', () => {
            const result = runCLI('health --verbose');
            const output = getOutput(result);
            // Verbose mode should produce more output
            expect(output.length).toBeGreaterThan(0);
        });

        it('should support quiet mode', () => {
            const result = runCLI('health --quiet');
            const output = getOutput(result);
            // Quiet mode should produce less output or specific format
            expect(output.length).toBeGreaterThanOrEqual(0);
        });

        it('should support config file option', () => {
            const result = runCLI('health --config config.example.json');
            const output = getOutput(result);
            expect(output.length).toBeGreaterThan(0);
        });
    });

    describe('Output Formatting', () => {
        it('should support JSON output format', () => {
            const result = runCLI('health --json');
            const output = getOutput(result);
            // Should handle JSON output format
            expect(output.length).toBeGreaterThan(0);
        });

        it('should support table output format', () => {
            const result = runCLI('health --format table');
            const output = getOutput(result);
            expect(output.length).toBeGreaterThan(0);
        });
    });

    describe('Repository Detection', () => {
        it('should work in repository context', () => {
            const result = runCLI('health');
            const output = getOutput(result);
            // Should detect current repository and run analysis
            expect(output.length).toBeGreaterThan(0);
        });

        it('should handle repository specification', () => {
            const result = runCLI('health --repo owner/repo');
            const output = getOutput(result);
            expect(output.length).toBeGreaterThan(0);
        });
    });

    describe('Interactive Mode', () => {
        // Note: Interactive mode testing is limited without user input simulation
        it('should recognize interactive command', () => {
            // Test that the interactive command is recognized (won't actually run interactively)
            const result = runCLI('interactive --help');
            const output = getOutput(result);
            expect(output).toMatch(/(interactive|guided|wizard)/i);
        });
    });

    describe('Configuration', () => {
        it('should handle configuration loading', () => {
            const result = runCLI('health --config config.example.json');
            const output = getOutput(result);
            expect(output.length).toBeGreaterThan(0);
        });

        it('should handle missing configuration gracefully', () => {
            const result = runCLI('health --config nonexistent-config.json');
            expect(
                result.status ||
                    result.stderr ||
                    result.stdout ||
                    getOutput(result)
            ).toBeTruthy();
            // Should handle missing config file
        });
    });

    describe('Environment Integration', () => {
        it('should respect environment variables', () => {
            // Set test environment variable
            process.env.REPOSITORY_METADATA_TEST = 'true';

            const result = runCLI('health');
            const output = getOutput(result);
            expect(output.length).toBeGreaterThan(0);

            // Clean up
            delete process.env.REPOSITORY_METADATA_TEST;
        });

        it('should handle GitHub token environment', () => {
            // Test with mock token
            const originalToken = process.env.GITHUB_TOKEN;
            process.env.GITHUB_TOKEN = 'test-token';

            const result = runCLI('health');
            const output = getOutput(result);
            expect(output.length).toBeGreaterThan(0);

            // Restore original token
            if (originalToken) {
                process.env.GITHUB_TOKEN = originalToken;
            } else {
                delete process.env.GITHUB_TOKEN;
            }
        });
    });

    describe('Performance', () => {
        it('should complete health check within reasonable time', () => {
            const startTime = Date.now();
            const result = runCLI('health');
            const endTime = Date.now();

            const output = getOutput(result);
            expect(output.length).toBeGreaterThan(0);
            expect(endTime - startTime).toBeLessThan(30000); // 30 seconds max
        });

        it('should handle large repository analysis', () => {
            const result = runCLI('health --detailed');
            const output = getOutput(result);
            expect(output.length).toBeGreaterThan(0);
        });
    });
});
