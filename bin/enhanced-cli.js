#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('../lib/utils/colors');
const figlet = require('figlet');
const inquirer = require('inquirer');

// Import all managers
const SecurityManager = require('../lib/features/SecurityManager');
const BranchProtectionManager = require('../lib/features/BranchProtectionManager');
const DocumentationManager = require('../lib/features/DocumentationManager');
const CICDManager = require('../lib/features/CICDManager');
const HealthScoreManager = require('../lib/features/HealthScoreManager');
const MultiRepositoryManager = require('../lib/features/MultiRepositoryManager');
const DashboardGenerator = require('../lib/features/DashboardGenerator');
const IoTManager = require('../lib/features/IoTManager');
const TemplateEngine = require('../lib/features/TemplateEngine');
const OrganizationAnalytics = require('../lib/features/OrganizationAnalytics');
const SecurityPolicyManager = require('../lib/features/SecurityPolicyManager');
const AutoFixManager = require('../lib/features/AutoFixManager');

// Import utilities
const TokenManager = require('../lib/utils/TokenManager');
const EnvironmentDetector = require('../lib/utils/EnvironmentDetector');

const program = new Command();

// ASCII Art Banner
console.log(
    chalk.cyan(figlet.textSync('Repo Manager', { horizontalLayout: 'full' }))
);
console.log(chalk.gray('🚀 Complete Repository Management Suite\n'));

program
    .name('repository-manager')
    .description('Complete repository compliance and health management tool')
    .version('2.0.0');

// Health Score Commands
program
    .command('health')
    .description('Calculate overall repository health score')
    .option('--report', 'Generate detailed health report')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
        const config = await loadConfig();
        const healthManager = new HealthScoreManager(config);

        console.log(chalk.blue('🔍 Calculating repository health score...\n'));

        if (options.report) {
            const { health, report } =
                await healthManager.generateHealthReport();
            if (options.json) {
                console.log(JSON.stringify(health, null, 2));
            } else {
                console.log(report);
            }
        } else {
            const health = await healthManager.calculateHealthScore();
            displayHealthSummary(health);
        }
    });

// Security Commands
program
    .command('security')
    .description('Security audit and enforcement')
    .option('--audit', 'Run security audit')
    .option('--enforce', 'Apply security standards')
    .option('--fix', 'Auto-fix security issues')
    .action(async (options) => {
        const config = await loadConfig();
        const securityManager = new SecurityManager(config);

        if (options.audit || (!options.enforce && !options.fix)) {
            console.log(chalk.blue('🔐 Running security audit...\n'));
            const results = await securityManager.securityAudit();
            displaySecurityResults(results);
        }

        if (options.enforce || options.fix) {
            console.log(chalk.blue('🛡️ Enforcing security standards...\n'));
            const results = await securityManager.enforceSecurityStandards();
            console.log(
                chalk.green(`✅ Applied ${results.fixes.length} security fixes`)
            );
            results.fixes.forEach((fix) => console.log(`  - ${fix}`));
        }
    });

// Branch Protection Commands
program
    .command('branches')
    .description('Branch protection management')
    .option('--audit', 'Audit branch protection rules')
    .option('--enforce', 'Apply branch protection')
    .option('--reviewers <number>', 'Required reviewers', '1')
    .option('--status-checks <checks...>', 'Required status checks')
    .action(async (options) => {
        const config = await loadConfig();
        const branchManager = new BranchProtectionManager(config);

        if (options.audit || !options.enforce) {
            console.log(chalk.blue('🌿 Auditing branch protection...\n'));
            const results = await branchManager.auditBranchProtection();
            displayBranchResults(results);
        }

        if (options.enforce) {
            const settings = {
                requiredReviewers: parseInt(options.reviewers),
                statusChecks: options.statusChecks || ['ci/tests'],
            };

            console.log(chalk.blue('🔒 Enforcing branch protection...\n'));
            const results =
                await branchManager.enforceBranchProtection(settings);
            displayEnforcementResults(results);
        }
    });

// Documentation Commands
program
    .command('docs')
    .description('Documentation audit and generation')
    .option('--audit', 'Audit documentation')
    .option('--generate', 'Generate missing documentation')
    .option('--templates', 'Create documentation templates')
    .action(async (options) => {
        const config = await loadConfig();
        const docsManager = new DocumentationManager(config);

        if (options.audit || (!options.generate && !options.templates)) {
            console.log(chalk.blue('📚 Auditing documentation...\n'));
            const results = await docsManager.auditDocumentation();
            displayDocumentationResults(results);
        }

        if (options.generate) {
            console.log(chalk.blue('📝 Generating missing documentation...\n'));
            const results = await docsManager.generateMissingDocs();
            console.log(
                chalk.green(
                    `✅ Generated ${results.generated.length} documentation files`
                )
            );
            results.generated.forEach((file) => console.log(`   - ${file}`));
        }
    });

// CI/CD Commands
program
    .command('cicd')
    .description('CI/CD workflow management')
    .option('--audit', 'Audit workflows')
    .option(
        '--generate <type>',
        'Generate workflow templates (node|security|release|all)'
    )
    .action(async (options) => {
        const config = await loadConfig();
        const cicdManager = new CICDManager(config);

        if (options.audit || !options.generate) {
            console.log(chalk.blue('⚙️ Auditing CI/CD workflows...\n'));
            const results = await cicdManager.auditWorkflows();
            displayCICDResults(results);
        }

        if (options.generate) {
            console.log(
                chalk.blue(
                    `🔧 Generating ${options.generate} workflow templates...\n`
                )
            );
            const generated = await cicdManager.generateWorkflowTemplates(
                options.generate
            );
            console.log(
                chalk.green(`✅ Generated ${generated.length} workflow files`)
            );
            generated.forEach((file) => console.log(`   - ${file}`));
        }
    });

// Interactive Mode
program
    .command('interactive')
    .alias('i')
    .description('Interactive repository management wizard')
    .action(async () => {
        await runInteractiveMode();
    });

// Full Compliance Check
program
    .command('compliance')
    .description('Run full compliance check and fixes')
    .option('--fix', 'Auto-fix issues where possible')
    .option('--report', 'Generate compliance report')
    .action(async (options) => {
        const config = await loadConfig();
        console.log(chalk.blue('🎯 Running full compliance check...\n'));

        const healthManager = new HealthScoreManager(config);
        const { health, report } = await healthManager.generateHealthReport();

        if (options.report) {
            console.log(report);
        } else {
            displayHealthSummary(health);
        }

        if (options.fix) {
            console.log(chalk.blue('\n🔧 Applying automatic fixes...\n'));
            await applyAutomaticFixes(config);
        }
    });

// AI Agent Auto-Fix Command
program
    .command('ai-agent')
    .description('AI agent mode with automatic token detection and local fixes')
    .option('--auto-fix', 'Automatically fix compliance issues without prompting')
    .option('--local-only', 'Only perform local file-based fixes (no GitHub API)')
    .option('--dry-run', 'Show what would be fixed without making changes')
    .option('--detect', 'Show environment detection information')
    .action(async (options) => {
        console.log(chalk.blue('🤖 AI Agent Mode\n'));

        // Detect environment
        const envDetector = new EnvironmentDetector();
        const envSummary = envDetector.getEnvironmentSummary();

        if (options.detect) {
            console.log(chalk.cyan('🔍 Environment Detection:\n'));
            console.log(`  Platform: ${envSummary.environment}`);
            console.log(`  Type: ${envSummary.type}`);
            console.log(`  CI Environment: ${envSummary.isCI ? '✓' : '✗'}`);
            console.log(`  GitHub Actions: ${envSummary.isGitHubActions ? '✓' : '✗'}`);
            console.log(`  GitHub Token Available: ${envSummary.hasToken ? '✓' : '✗'}`);
            console.log(`  AI Agent Mode: ${envSummary.aiAgentMode ? '✓' : '✗'}`);
            
            const repoContext = envDetector.getRepositoryContext();
            if (repoContext.owner && repoContext.repo) {
                console.log(chalk.cyan('\n📦 Repository Context:\n'));
                console.log(`  Owner: ${repoContext.owner}`);
                console.log(`  Repo: ${repoContext.repo}`);
                console.log(`  Branch: ${repoContext.branch || 'N/A'}`);
                console.log(`  SHA: ${repoContext.sha ? repoContext.sha.substring(0, 7) : 'N/A'}`);
            }

            const tokenManager = new TokenManager();
            const tokenInfo = tokenManager.detectToken();
            console.log(chalk.cyan('\n🔑 Token Detection:\n'));
            console.log(`  Source: ${tokenManager.getTokenSourceDescription()}`);
            console.log(`  Available: ${tokenInfo.isAvailable ? '✓' : '✗'}`);
            console.log(`  Local-only Mode: ${tokenInfo.localOnlyMode ? '✓' : '✗'}`);

            console.log('');
            return;
        }

        // Determine execution mode
        const recommendedMode = envDetector.getRecommendedMode();
        const localOnly = options.localOnly || recommendedMode.localOnly;
        const autoFix = options.autoFix !== undefined ? options.autoFix : recommendedMode.autoFix;
        const dryRun = options.dryRun || false;

        console.log(chalk.gray(`Mode: ${localOnly ? 'Local-only' : 'API-enabled'} | Auto-fix: ${autoFix ? 'On' : 'Off'} | Dry-run: ${dryRun ? 'Yes' : 'No'}\n`));

        // Run auto-fix manager for local fixes
        const autoFixManager = new AutoFixManager({
            dryRun,
            repoPath: process.cwd(),
        });

        await autoFixManager.runAllFixes();
        autoFixManager.displaySummary();

        // If not local-only and token is available, run API-based checks
        if (!localOnly) {
            try {
                // Check token availability using TokenManager
                const tokenManager = new TokenManager();
                const tokenInfo = tokenManager.detectToken();
                
                if (tokenInfo.isAvailable) {
                    console.log(chalk.blue('\n🔍 Running API-based compliance checks...\n'));
                    const config = await loadConfig();
                    const healthManager = new HealthScoreManager(config);
                    const { health } = await healthManager.generateHealthReport();
                    displayHealthSummary(health);
                } else {
                    console.log(chalk.yellow('\n⚠️  No GitHub token available for API-based checks'));
                    console.log(chalk.gray('   Use --local-only flag to skip this warning\n'));
                }
            } catch (error) {
                if (error.message.includes('local-only mode')) {
                    console.log(chalk.yellow('\n⚠️  API checks skipped (no token available)'));
                } else {
                    console.error(chalk.red(`\n❌ API checks failed: ${error.message}`));
                }
            }
        }

        // Summary
        console.log(chalk.blue('\n✅ AI Agent run complete\n'));
        if (dryRun) {
            console.log(chalk.yellow('💡 This was a dry run. Use without --dry-run to apply changes.\n'));
        }
    });

// Multi-Repository Management Commands
program
    .command('org')
    .description('Organization-wide repository management')
    .option('--audit', 'Audit all repositories in organization')
    .option('--fix', 'Apply fixes across all repositories')
    .option('--report', 'Generate organization health report')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
        const config = await loadConfig();
        const multiRepoManager = new MultiRepositoryManager(config);

        if (options.audit) {
            console.log(
                chalk.blue('🏥 Running organization-wide health audit...\n')
            );
            const results = await multiRepoManager.auditAllRepositories();

            if (options.json) {
                console.log(JSON.stringify(results, null, 2));
            } else {
                displayOrganizationSummary(results);
            }

            if (options.report) {
                const report = multiRepoManager.generateHealthReport(results);
                console.log('\n' + chalk.cyan('📋 ORGANIZATION HEALTH REPORT'));
                console.log(chalk.cyan('='.repeat(50)));
                console.log(`Organization: ${report.organization}`);
                console.log(
                    `Total Repositories: ${report.summary.total_repositories}`
                );
                console.log(
                    `Average Score: ${report.summary.average_score}/100 (${report.grade})`
                );
                console.log(`Healthy: ${report.summary.healthy_repositories}`);
                console.log(
                    `Needs Attention: ${report.summary.unhealthy_repositories}`
                );

                if (report.recommendations.length > 0) {
                    console.log(
                        '\n' + chalk.yellow('🎯 Organization Recommendations:')
                    );
                    report.recommendations.forEach((rec, i) => {
                        console.log(
                            `${i + 1}. ${rec.message} (${rec.priority} priority)`
                        );
                    });
                }
            }
        }

        if (options.fix) {
            console.log(chalk.blue('🔧 Applying organization-wide fixes...\n'));
            const fixResults = await multiRepoManager.applyOrganizationFixes({
                apply: true,
            });

            console.log(
                chalk.green(
                    `✅ Applied fixes to ${fixResults.applied.length} repositories`
                )
            );
            if (fixResults.failed.length > 0) {
                console.log(
                    chalk.red(
                        `❌ Failed to fix ${fixResults.failed.length} repositories`
                    )
                );
            }
            if (fixResults.skipped.length > 0) {
                console.log(
                    chalk.yellow(
                        `⏭️  Skipped ${fixResults.skipped.length} repositories`
                    )
                );
            }
        }
    });

// IoT-Specific Commands
program
    .command('iot')
    .description('IoT-specific repository management for Alteriom projects')
    .option('--audit', 'Run IoT-specific compliance checks')
    .option(
        '--template <type>',
        'Generate IoT project template (firmware|server|dashboard)'
    )
    .action(async (options) => {
        const config = await loadConfig();
        console.log(chalk.blue('🔌 IoT Repository Management\n'));

        if (options.audit) {
            console.log(
                chalk.blue('Running IoT-specific compliance checks...\n')
            );
            await runIoTAudit(config);
        }

        if (options.template) {
            console.log(
                chalk.blue(`Generating ${options.template} IoT template...\n`)
            );
            await generateIoTTemplate(options.template, config);
        }
    });

// Dashboard Generation
program
    .command('dashboard')
    .description('Generate interactive HTML dashboard for organization health')
    .option('--output <file>', 'Output file name', 'alteriom-dashboard.html')
    .option('--open', 'Open dashboard in browser after generation')
    .action(async (options) => {
        const config = await loadConfig();
        console.log(
            chalk.blue('📊 Generating organization health dashboard...\n')
        );

        const multiRepoManager = new MultiRepositoryManager(config);
        const dashboardGenerator = new DashboardGenerator(config);

        // Get organization health data
        const results = await multiRepoManager.auditAllRepositories();

        // Generate and save dashboard
        const filepath = await dashboardGenerator.saveDashboard(
            results,
            options.output
        );

        console.log(chalk.green(`✅ Dashboard generated successfully!`));
        console.log(chalk.blue(`📂 File: ${filepath}`));

        if (options.open) {
            const { spawn } = require('child_process');
            const opener =
                process.platform === 'darwin'
                    ? 'open'
                    : process.platform === 'win32'
                      ? 'start'
                      : 'xdg-open';

            try {
                spawn(opener, [filepath], { detached: true, stdio: 'ignore' });
                console.log(chalk.green('🌐 Opening dashboard in browser...'));
            } catch (error) {
                console.log(
                    chalk.yellow(
                        `⚠️  Could not open browser automatically. Please open: ${filepath}`
                    )
                );
            }
        }
    });

// Organization Analytics
program
    .command('analytics')
    .description('Generate comprehensive organization analytics and insights')
    .option('--export <format>', 'Export report (json|csv)', 'json')
    .option('--save <file>', 'Save report to file')
    .action(async (options) => {
        const config = await loadConfig();
        console.log(chalk.blue('📊 Organization Analytics\n'));

        const analytics = new OrganizationAnalytics(config);

        try {
            const insights = await analytics.generateOrganizationReport();

            if (options.save) {
                const fs = require('fs').promises;
                const filename = options.save;

                if (options.export === 'json') {
                    await fs.writeFile(
                        filename,
                        JSON.stringify(insights, null, 2)
                    );
                } else if (options.export === 'csv') {
                    // Convert to CSV format
                    const csv = convertInsightsToCSV(insights);
                    await fs.writeFile(filename, csv);
                }

                console.log(chalk.green(`\n💾 Report saved to: ${filename}`));
            }
        } catch (error) {
            console.error(chalk.red(`❌ Analytics failed: ${error.message}`));
        }
    });

// Security Policy Management
program
    .command('security-policy')
    .description('Generate and manage security policies for repositories')
    .option(
        '--type <type>',
        'Policy type (organization|iot|ai-agent|web-platform)',
        'organization'
    )
    .option('--audit', 'Audit existing security policies')
    .option('--generate', 'Generate security policy files')
    .option(
        '--contact <email>',
        'Security contact email',
        'security@alteriom.com'
    )
    .action(async (options) => {
        const config = await loadConfig();
        const securityPolicyManager = new SecurityPolicyManager(config);

        if (options.audit) {
            console.log(chalk.blue('🔍 Auditing security policies...\n'));

            try {
                const audit =
                    await securityPolicyManager.auditSecurityPolicies();

                console.log(
                    chalk.bold(`🔒 Security Policy Score: ${audit.score}/100\n`)
                );

                audit.checks.forEach((check) => {
                    const icon = check.status ? '✅' : '❌';
                    console.log(`${icon} ${check.name}`);
                    if (!check.status && check.fix) {
                        console.log(chalk.gray(`   Fix: ${check.fix}`));
                    }
                });

                if (audit.recommendations.length > 0) {
                    console.log(chalk.yellow('\n💡 Recommendations:'));
                    audit.recommendations.forEach((rec, i) => {
                        console.log(`  ${i + 1}. ${rec}`);
                    });
                }
            } catch (error) {
                console.error(
                    chalk.red(`❌ Security audit failed: ${error.message}`)
                );
            }
        }

        if (options.generate) {
            console.log(
                chalk.blue(`🔒 Generating ${options.type} security policy...\n`)
            );

            try {
                const result =
                    await securityPolicyManager.generateSecurityPolicy(
                        options.type,
                        {
                            contactEmail: options.contact,
                            organizationName:
                                config.organizationName || 'Alteriom',
                            organizationTag:
                                config.organizationTag || 'alteriom',
                        }
                    );

                console.log(
                    chalk.green(`✅ Security policy generated successfully!`)
                );
                console.log(chalk.blue(`📁 Policy Type: ${result.policy}`));
                console.log(
                    chalk.blue(`📄 Files: ${result.files.length} files created`)
                );

                console.log(chalk.yellow('\n📝 Next Steps:'));
                console.log('  1. Review generated security policy files');
                console.log(
                    '  2. Customize contact information and procedures'
                );
                console.log('  3. Commit files to your repository');
                console.log('  4. Enable GitHub security features');
            } catch (error) {
                console.error(
                    chalk.red(
                        `❌ Security policy generation failed: ${error.message}`
                    )
                );
            }
        }

        if (!options.audit && !options.generate) {
            console.log(chalk.blue('🔒 Security Policy Management\n'));
            console.log('Available policy types:');
            console.log(
                '  • organization - Standard organizational security policy'
            );
            console.log(
                '  • iot - Enhanced policy for IoT devices and firmware'
            );
            console.log(
                '  • ai-agent - Security policy for AI agents and automation'
            );
            console.log(
                '  • web-platform - Security policy for web applications'
            );
            console.log('\nUsage:');
            console.log('  repository-manager security-policy --audit');
            console.log(
                '  repository-manager security-policy --generate --type iot'
            );
        }
    });

// Template Generation
program
    .command('template')
    .description('Generate new projects from templates')
    .option('--list', 'List available templates')
    .option(
        '--type <type>',
        'Template type (iot-firmware|ai-agent|iot-platform|cli-tool)'
    )
    .option('--name <name>', 'Project name')
    .option('--output <path>', 'Output directory')
    .action(async (options) => {
        const config = await loadConfig();
        const templateEngine = new TemplateEngine(config);

        if (options.list) {
            templateEngine.listTemplates();
            return;
        }

        if (!options.type || !options.name) {
            console.log(chalk.red('❌ Both --type and --name are required'));
            console.log(chalk.blue('💡 Use --list to see available templates'));
            console.log(
                chalk.blue(
                    '💡 Example: repository-manager template --type iot-firmware --name my-sensor-project'
                )
            );
            return;
        }

        try {
            const result = await templateEngine.generateProject(
                options.type,
                options.name,
                {
                    outputPath: options.output,
                    organizationTag: config.organizationTag || 'alteriom',
                }
            );

            console.log(
                chalk.green(
                    `\n🎉 Successfully created ${options.type} project!`
                )
            );
            console.log(chalk.blue(`📁 Location: ${result.path}`));
            console.log(
                chalk.blue(`📄 Files: ${result.files.length} files created`)
            );
        } catch (error) {
            console.error(
                chalk.red(`❌ Template generation failed: ${error.message}`)
            );
        }
    });

// Automation Commands
program
    .command('automation')
    .description('Enhanced automation features for cross-repository operations')
    .option('--org-health', 'Run organization-wide health audit')
    .option(
        '--detect-workflows',
        'Detect missing workflows across repositories'
    )
    .option('--track-deps', 'Track dependencies across organization')
    .option('--auto-fix', 'Auto-fix compliance issues')
    .option('--target <target>', 'Target scope: current or all (default: current)')
    .option('--categorize', 'Categorize repositories by type')
    .option('--prioritize', 'Prioritize fixes based on impact and effort')
    .option('--compliance-report', 'Generate comprehensive compliance report')
    .option('--security-dashboard', 'Generate security vulnerability dashboard')
    .option('--maintenance', 'Run automated maintenance tasks')
    .option('--dry-run', 'Dry run mode (show what would be done)')
    .option('--report', 'Show detailed report')
    .option('--save', 'Save report to file')
    .option('--json', 'Output as JSON')
    .option('--trending', 'Show trend analysis compared to historical data')
    .option(
        '--sequential',
        'Process repositories sequentially (slower but uses less memory)'
    )
    .option(
        '--concurrency <number>',
        'Number of repositories to process in parallel (default: 5)',
        parseInt
    )
    .option(
        '--top-n <number>',
        'Number of top priority items to show (default: 10)',
        parseInt
    )
    .option('--batch-suggestions', 'Show batch fix suggestions')
    .option(
        '--group-by-similarity',
        'Group similar issues for batch operations'
    )
    .option(
        '--tasks <tasks>',
        'Comma-separated maintenance tasks: stale-issues,outdated-deps,unused-workflows'
    )
    .action(async (options) => {
        const config = await loadConfig();
        const AutomationManager = require('../lib/features/AutomationManager');
        const automation = new AutomationManager(config);

        if (options.orgHealth) {
            const results = await automation.runOrganizationHealthAudit({
                report: options.report,
                parallel: !options.sequential,
                concurrency: options.concurrency || 5,
                trending: options.trending,
            });

            if (options.json) {
                console.log(JSON.stringify(results, null, 2));
            }
        }

        if (options.detectWorkflows) {
            const results = await automation.detectMissingWorkflows({
                report: options.report,
            });

            if (options.json) {
                console.log(JSON.stringify(results, null, 2));
            }
        }

        if (options.trackDeps) {
            const results = await automation.trackDependencies({
                report: options.report,
            });

            if (options.json) {
                console.log(JSON.stringify(results, null, 2));
            }
        }

        if (options.autoFix) {
            const results = await automation.autoFixComplianceIssues({
                dryRun: !!options.dryRun,
                target: options.target || 'current',
            });

            if (options.json) {
                console.log(JSON.stringify(results, null, 2));
            }
        }

        if (options.categorize) {
            const repositories =
                await automation.multiRepoManager.discoverRepositories();
            const categories =
                await automation.categorizeRepositories(repositories);

            if (options.json) {
                console.log(JSON.stringify(categories, null, 2));
            }
        }

        if (options.prioritize) {
            // Run health audit first if not already done
            let auditResults;
            if (options.orgHealth) {
                // Already have results
                auditResults = await automation.runOrganizationHealthAudit({
                    report: false,
                    parallel: !options.sequential,
                    concurrency: options.concurrency || 5,
                });
            } else {
                console.log(
                    chalk.gray('Running health audit for prioritization...\n')
                );
                auditResults = await automation.runOrganizationHealthAudit({
                    report: false,
                    parallel: !options.sequential,
                    concurrency: options.concurrency || 5,
                });
            }

            const priorities = await automation.prioritizeFixes(auditResults, {
                topN: options.topN || 10,
                batchSuggestions: options.batchSuggestions,
                groupBySimilarity: options.groupBySimilarity,
            });

            if (options.json) {
                console.log(JSON.stringify(priorities, null, 2));
            }
        }

        if (options.complianceReport) {
            const report = await automation.generateComplianceReport({
                save: options.save,
            });

            if (options.json) {
                console.log(JSON.stringify(report, null, 2));
            }
        }

        if (options.securityDashboard) {
            const dashboard = await automation.generateSecurityDashboard({
                save: options.save,
            });

            if (options.json) {
                console.log(JSON.stringify(dashboard, null, 2));
            }
        }

        if (options.maintenance) {
            const tasks = options.tasks
                ? options.tasks.split(',').map((t) => t.trim())
                : ['stale-issues', 'outdated-deps', 'unused-workflows'];

            const results = await automation.performMaintenance({
                tasks,
                dryRun: !!options.dryRun,
            });

            if (options.json) {
                console.log(JSON.stringify(results, null, 2));
            }
        }

        if (
            !options.orgHealth &&
            !options.detectWorkflows &&
            !options.trackDeps &&
            !options.autoFix &&
            !options.categorize &&
            !options.prioritize
        ) {
            console.log(chalk.blue('🤖 Enhanced Automation Features\n'));
            console.log('Available commands:');
            console.log(
                '  --org-health        Run organization-wide health audit'
            );
            console.log('  --detect-workflows  Detect missing CI/CD workflows');
            console.log(
                '  --track-deps        Track dependency versions across repos'
            );
            console.log('  --auto-fix          Auto-fix compliance issues');
            console.log(
                '  --categorize        Categorize repositories by type'
            );
            console.log(
                '  --prioritize        Prioritize fixes by impact and effort'
            );
            console.log('\nOptions:');
            console.log(
                '  --dry-run               Show what would be done without applying changes'
            );
            console.log('  --report                Show detailed report');
            console.log('  --json                  Output results as JSON');
            console.log(
                '  --trending              Show trend analysis vs. historical data'
            );
            console.log(
                '  --sequential            Process repos sequentially (slower, less memory)'
            );
            console.log(
                '  --concurrency <n>       Parallel processing limit (default: 5)'
            );
            console.log(
                '  --top-n <n>             Number of top priorities to show (default: 10)'
            );
            console.log('  --batch-suggestions     Show batch fix suggestions');
            console.log(
                '  --group-by-similarity   Group similar issues across repos'
            );
            console.log('\nExamples:');
            console.log(
                '  repository-manager automation --org-health --report --trending'
            );
            console.log(
                '  repository-manager automation --prioritize --top-n 15'
            );
            console.log('  repository-manager automation --categorize --json');
            console.log(
                '  repository-manager automation --prioritize --batch-suggestions'
            );
            console.log('  repository-manager automation --auto-fix --dry-run');
        }
    });

// Helper Functions
async function loadConfig() {
    require('dotenv').config();

    return {
        token:
            process.env.ORG_ACCESS_TOKEN ||
            process.env.AGENT_ORG_TOKEN ||
            process.env.GITHUB_TOKEN,
        owner: process.env.GITHUB_REPOSITORY_OWNER,
        repo: process.env.GITHUB_REPOSITORY_NAME,
        organizationTag: process.env.ORGANIZATION_TAG,
        organizationName: process.env.ORGANIZATION_NAME,
    };
}

function displayHealthSummary(health) {
    console.log(
        chalk.bold(`\n📊 Repository Health Score: ${health.score}/100`)
    );

    const gradeColor = getGradeColor(health.grade);
    console.log(chalk.bold(`🎓 Grade: ${gradeColor(health.grade)}`));

    console.log('\n📋 Category Breakdown:');
    for (const [category, data] of Object.entries(health.categories)) {
        const color =
            data.score >= 80
                ? chalk.green
                : data.score >= 60
                  ? chalk.yellow
                  : chalk.red;
        const icon = data.score >= 80 ? '✅' : data.score >= 60 ? '⚠️' : '❌';
        console.log(`  ${icon} ${category}: ${color(data.score + '%')}`);
    }

    if (health.recommendations.length > 0) {
        console.log('\n🎯 Top Recommendations:');
        health.recommendations.slice(0, 3).forEach((rec, i) => {
            const priority =
                rec.priority === 'HIGH' ? chalk.red('🔴') : chalk.yellow('🟡');
            console.log(`  ${i + 1}. ${priority} ${rec.message}`);
        });
    }
}

function getGradeColor(grade) {
    const colors = {
        A: chalk.green,
        B: chalk.blue,
        C: chalk.yellow,
        D: chalk.yellow,
        F: chalk.red,
    };
    return colors[grade] || chalk.gray;
}

function displaySecurityResults(results) {
    console.log(`🔐 Security Score: ${results.score}/100\n`);

    results.checks.forEach((check) => {
        const icon = check.status ? '✅' : '❌';
        console.log(`${icon} ${check.name}`);
        if (!check.status && check.fix) {
            console.log(chalk.gray(`   Fix: ${check.fix}`));
        }
    });

    if (results.vulnerabilities.length > 0) {
        console.log(chalk.red('\n⚠️ Vulnerabilities Found:'));
        results.vulnerabilities.forEach((vuln) => console.log(`  - ${vuln}`));
    }
}

function displayBranchResults(results) {
    console.log(`🌿 Branch Protection Score: ${results.score}/100\n`);

    results.branches.forEach((branch) => {
        console.log(chalk.bold(`Branch: ${branch.branch}`));
        console.log(`  Protected: ${branch.protected ? '✅' : '❌'}`);
        console.log(`  Score: ${branch.score}/100`);

        if (branch.issues.length > 0) {
            console.log(chalk.yellow('  Issues:'));
            branch.issues.forEach((issue) => console.log(`    - ${issue}`));
        }
        console.log('');
    });
}

function displayDocumentationResults(results) {
    console.log(`📚 Documentation Score: ${results.score}/100\n`);

    results.files.forEach((file) => {
        const icon = file.exists ? '✅' : '❌';
        console.log(`${icon} ${file.file} (${file.score}/${file.weight})`);

        if (file.issues.length > 0) {
            file.issues.forEach((issue) =>
                console.log(chalk.gray(`    - ${issue}`))
            );
        }
    });
}

function displayCICDResults(results) {
    console.log(`⚙️ CI/CD Score: ${results.score}/100\n`);

    if (results.workflows.length === 0) {
        console.log(chalk.yellow('No workflows found'));
        return;
    }

    results.workflows.forEach((workflow) => {
        console.log(chalk.bold(`Workflow: ${workflow.name}`));
        console.log(`  Score: ${workflow.score}/100`);

        if (workflow.securityIssues.length > 0) {
            console.log(chalk.red('  Security Issues:'));
            workflow.securityIssues.forEach((issue) =>
                console.log(`    - ${issue}`)
            );
        }
        console.log('');
    });
}

function displayEnforcementResults(results) {
    results.forEach((result) => {
        const icon = result.status === 'success' ? '✅' : '❌';
        console.log(`${icon} ${result.branch}: ${result.message}`);
    });
}

async function runInteractiveMode() {
    const choices = await inquirer.prompt([
        {
            type: 'checkbox',
            name: 'actions',
            message: 'What would you like to do?',
            choices: [
                { name: '📊 Calculate Health Score', value: 'health' },
                { name: '🔐 Security Audit', value: 'security' },
                { name: '🌿 Branch Protection', value: 'branches' },
                { name: '📚 Documentation Check', value: 'docs' },
                { name: '⚙️ CI/CD Audit', value: 'cicd' },
                { name: '🔌 IoT Compliance Check', value: 'iot' },
                { name: '🎯 Full Compliance Check', value: 'compliance' },
                { name: '🎨 Generate New Project', value: 'template' },
                { name: '📈 Organization Analytics', value: 'analytics' },
                {
                    name: '🛡️ Security Policy Management',
                    value: 'security-policy',
                },
            ],
        },
    ]);

    const config = await loadConfig();

    for (const action of choices.actions) {
        console.log(chalk.blue(`\n${'='.repeat(50)}`));
        console.log(chalk.blue(`Running ${action}...`));
        console.log(chalk.blue(`${'='.repeat(50)}\n`));

        switch (action) {
            case 'health': {
                const healthManager = new HealthScoreManager(config);
                const health = await healthManager.calculateHealthScore();
                displayHealthSummary(health);
                break;
            }
            case 'security': {
                const securityManager = new SecurityManager(config);
                const secResults = await securityManager.securityAudit();
                displaySecurityResults(secResults);
                break;
            }
            case 'branches': {
                const branchManager = new BranchProtectionManager(config);
                const branchResults =
                    await branchManager.auditBranchProtection();
                displayBranchResults(branchResults);
                break;
            }
            case 'docs': {
                const docsManager = new DocumentationManager(config);
                const docResults = await docsManager.auditDocumentation();
                displayDocumentationResults(docResults);
                break;
            }
            case 'cicd': {
                const cicdManager = new CICDManager(config);
                const cicdResults = await cicdManager.auditWorkflows();
                displayCICDResults(cicdResults);
                break;
            }
            case 'iot': {
                await runIoTAudit(config);
                break;
            }
            case 'compliance': {
                const complianceManager = new HealthScoreManager(config);
                const complianceHealth =
                    await complianceManager.calculateHealthScore();
                displayHealthSummary(complianceHealth);
                break;
            }
            case 'template': {
                await runTemplateWizard(config);
                break;
            }
            case 'analytics': {
                const analytics = new OrganizationAnalytics(config);
                await analytics.generateOrganizationReport();
                break;
            }
            case 'security-policy': {
                await runSecurityPolicyWizard(config);
                break;
            }
        }
    }
}

async function applyAutomaticFixes(config) {
    const fixes = [];

    try {
        // Security fixes
        const securityManager = new SecurityManager(config);
        const secResults = await securityManager.enforceSecurityStandards();
        fixes.push(...secResults.fixes);

        // Documentation fixes
        const docsManager = new DocumentationManager(config);
        const docResults = await docsManager.generateMissingDocs({
            autoGenerate: true,
        });
        fixes.push(...docResults.generated.map((f) => `Generated ${f}`));

        console.log(
            chalk.green(`\n✅ Applied ${fixes.length} automatic fixes:`)
        );
        fixes.forEach((fix) => console.log(`  - ${fix}`));
    } catch (error) {
        console.log(chalk.red(`❌ Error applying fixes: ${error.message}`));
    }
}

function displayOrganizationSummary(results) {
    console.log(chalk.cyan('\n🏢 ORGANIZATION HEALTH SUMMARY'));
    console.log(chalk.cyan('='.repeat(50)));

    console.log(`Total Repositories: ${results.summary.total_repositories}`);
    console.log(`Average Health Score: ${results.summary.average_score}/100`);
    console.log(
        `Healthy Repositories: ${chalk.green(results.summary.healthy_repositories)}`
    );
    console.log(
        `Needs Attention: ${chalk.red(results.summary.unhealthy_repositories)}`
    );

    if (results.repositories.length > 0) {
        console.log('\n📊 Repository Breakdown:');
        results.repositories.forEach((repo) => {
            const gradeColor = getGradeColor(repo.grade);
            const icon =
                repo.health_score >= 70
                    ? '✅'
                    : repo.health_score >= 50
                      ? '⚠️'
                      : '❌';
            console.log(
                `  ${icon} ${repo.name}: ${repo.health_score}/100 (${gradeColor(repo.grade)})`
            );
        });
    }

    if (results.recommendations.length > 0) {
        console.log('\n🎯 Organization Recommendations:');
        results.recommendations.forEach((rec, i) => {
            console.log(`  ${i + 1}. ${rec.message}`);
        });
    }
}

async function runIoTAudit(config) {
    console.log(chalk.blue('🔌 Starting IoT-Specific Compliance Audit...\n'));

    const iotManager = new IoTManager(config);

    try {
        const results = await iotManager.auditIoTCompliance();

        if (results.isIoT) {
            console.log(
                chalk.green(
                    '✅ IoT repository detected and audited successfully!'
                )
            );

            // Display score with color coding
            const score = results.score;
            let scoreColor = chalk.red;
            if (score >= 80) scoreColor = chalk.green;
            else if (score >= 60) scoreColor = chalk.yellow;

            console.log(
                `📊 IoT Compliance Score: ${scoreColor(score + '/100')}`
            );
            console.log(
                `🎯 Repository Type: ${chalk.cyan(results.repositoryType)}`
            );

            if (results.iotFiles.length > 0) {
                console.log(chalk.blue('\n🔧 IoT Files Detected:'));
                results.iotFiles.forEach((file) =>
                    console.log(chalk.gray(`  • ${file}`))
                );
            }

            // Also run standard health check for comparison
            console.log(chalk.blue('\n🏥 Overall Repository Health:'));
            const healthManager = new HealthScoreManager(config);
            const health = await healthManager.calculateHealthScore();
            displayHealthSummary(health);
        } else {
            console.log(
                chalk.yellow(
                    'ℹ️  This repository does not appear to be IoT-related.'
                )
            );
            console.log(
                '💡 To audit general repository health, use: npm run health'
            );
        }
    } catch (error) {
        console.error(chalk.red(`❌ IoT audit failed: ${error.message}`));
    }
}

async function generateIoTTemplate(type, config) {
    console.log(chalk.blue(`🏗️  Generating IoT ${type} template...\n`));

    const iotManager = new IoTManager(config);

    const validTypes = [
        'firmware',
        'server',
        'dashboard',
        'infrastructure',
        'documentation',
    ];

    // Map CLI names to internal names
    const typeMapping = {
        firmware: 'iot-firmware',
        server: 'iot-server',
        dashboard: 'iot-documentation', // For now, use documentation template
        infrastructure: 'iot-infrastructure',
        documentation: 'iot-documentation',
    };

    if (!validTypes.includes(type)) {
        console.log(chalk.red(`❌ Unknown IoT template: ${type}`));
        console.log(chalk.yellow('Available templates:'));
        validTypes.forEach((t) => console.log(chalk.gray(`  • ${t}`)));
        return;
    }

    try {
        const mappedType = typeMapping[type];
        await iotManager.generateIoTTemplate(mappedType);

        console.log(
            chalk.green(`✅ IoT ${type} template generated successfully!`)
        );
        console.log(chalk.blue('\n💡 Next steps:'));
        console.log(chalk.gray('  1. Review the generated structure'));
        console.log(chalk.gray('  2. Customize configuration files'));
        console.log(
            chalk.gray('  3. Follow the setup instructions in README.md')
        );
    } catch (error) {
        console.error(
            chalk.red(`❌ Template generation failed: ${error.message}`)
        );
    }
}

async function runTemplateWizard(config) {
    const templateEngine = new TemplateEngine(config);

    console.log(chalk.blue('🎨 Project Template Generator\n'));

    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'templateType',
            message: 'What type of project would you like to create?',
            choices: [
                {
                    name: '🔧 IoT Firmware (ESP32/ESP8266, Arduino, PlatformIO)',
                    value: 'iot-firmware',
                },
                {
                    name: '🤖 AI Agent (GitHub automation, compliance)',
                    value: 'ai-agent',
                },
                {
                    name: '🌐 IoT Platform (React frontend + Python backend)',
                    value: 'iot-platform',
                },
                {
                    name: '⚡ CLI Tool (Command line utility)',
                    value: 'cli-tool',
                },
            ],
        },
        {
            type: 'input',
            name: 'projectName',
            message: 'Project name:',
            validate: (input) => {
                if (!input.trim()) return 'Project name is required';
                if (!/^[a-z0-9-]+$/.test(input))
                    return 'Use lowercase letters, numbers, and hyphens only';
                return true;
            },
        },
        {
            type: 'input',
            name: 'outputPath',
            message: 'Output directory (optional):',
            default: (answers) => `./${answers.projectName}`,
        },
    ]);

    try {
        const result = await templateEngine.generateProject(
            answers.templateType,
            answers.projectName,
            {
                outputPath: answers.outputPath,
                organizationTag: config.organizationTag || 'alteriom',
            }
        );

        console.log(
            chalk.green(
                `\n🎉 Successfully created ${answers.templateType} project!`
            )
        );
        console.log(chalk.blue(`📁 Location: ${result.path}`));
        console.log(
            chalk.blue(`📄 Files: ${result.files.length} files created`)
        );
    } catch (error) {
        console.error(
            chalk.red(`❌ Template generation failed: ${error.message}`)
        );
    }
}

async function runSecurityPolicyWizard(config) {
    const securityPolicyManager = new SecurityPolicyManager(config);

    console.log(chalk.blue('🛡️ Security Policy Management\n'));

    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
                { name: '🔍 Audit existing security policies', value: 'audit' },
                {
                    name: '📝 Generate new security policies',
                    value: 'generate',
                },
            ],
        },
    ]);

    if (answers.action === 'audit') {
        console.log(chalk.blue('🔍 Auditing security policies...\n'));

        try {
            const audit = await securityPolicyManager.auditSecurityPolicies();

            console.log(
                chalk.bold(`🔒 Security Policy Score: ${audit.score}/100\n`)
            );

            audit.checks.forEach((check) => {
                const icon = check.status ? '✅' : '❌';
                console.log(`${icon} ${check.name}`);
                if (!check.status && check.fix) {
                    console.log(chalk.gray(`   Fix: ${check.fix}`));
                }
            });

            if (audit.recommendations.length > 0) {
                console.log(chalk.yellow('\n💡 Recommendations:'));
                audit.recommendations.forEach((rec, i) => {
                    console.log(`  ${i + 1}. ${rec}`);
                });
            }
        } catch (error) {
            console.error(
                chalk.red(`❌ Security audit failed: ${error.message}`)
            );
        }
    } else if (answers.action === 'generate') {
        const generateAnswers = await inquirer.prompt([
            {
                type: 'list',
                name: 'policyType',
                message: 'What type of security policy?',
                choices: [
                    {
                        name: '🏢 Organization - Standard organizational security policy',
                        value: 'organization',
                    },
                    {
                        name: '🔌 IoT - Enhanced policy for IoT devices and firmware',
                        value: 'iot',
                    },
                    {
                        name: '🤖 AI Agent - Security policy for AI agents and automation',
                        value: 'ai-agent',
                    },
                    {
                        name: '🌐 Web Platform - Security policy for web applications',
                        value: 'web-platform',
                    },
                ],
            },
            {
                type: 'input',
                name: 'contactEmail',
                message: 'Security contact email:',
                default: 'security@alteriom.com',
                validate: (input) => {
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
                        return 'Please enter a valid email address';
                    }
                    return true;
                },
            },
        ]);

        try {
            const result = await securityPolicyManager.generateSecurityPolicy(
                generateAnswers.policyType,
                {
                    contactEmail: generateAnswers.contactEmail,
                    organizationName: config.organizationName || 'Alteriom',
                    organizationTag: config.organizationTag || 'alteriom',
                }
            );

            console.log(
                chalk.green(`\n✅ Security policy generated successfully!`)
            );
            console.log(chalk.blue(`📁 Policy Type: ${result.policy}`));
            console.log(
                chalk.blue(`📄 Files: ${result.files.length} files created`)
            );

            console.log(chalk.yellow('\n📝 Next Steps:'));
            console.log('  1. Review generated security policy files');
            console.log('  2. Customize contact information and procedures');
            console.log('  3. Commit files to your repository');
            console.log('  4. Enable GitHub security features');
        } catch (error) {
            console.error(
                chalk.red(
                    `❌ Security policy generation failed: ${error.message}`
                )
            );
        }
    }
}

function convertInsightsToCSV(insights) {
    // Convert key insights to CSV format
    let csv = 'Category,Metric,Value\n';

    // Overview
    csv += `Overview,Total Repositories,${insights.overview.totalRepositories}\n`;
    csv += `Overview,Average Health Score,${insights.overview.averageHealthScore}\n`;
    csv += `Overview,Total Stars,${insights.overview.totalStars}\n`;
    csv += `Overview,Total Forks,${insights.overview.totalForks}\n`;

    // Languages
    insights.languages.forEach((lang) => {
        csv += `Languages,${lang.language},${lang.count}\n`;
    });

    // Repository Types
    insights.repoTypes.forEach((type) => {
        csv += `Repository Types,${type.type},${type.count}\n`;
    });

    return csv;
}

program.parse();
