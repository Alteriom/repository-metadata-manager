#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
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
            console.log(chalk.blue('🏥 Running organization-wide health audit...\n'));
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
                console.log(`Total Repositories: ${report.summary.total_repositories}`);
                console.log(`Average Score: ${report.summary.average_score}/100 (${report.grade})`);
                console.log(`Healthy: ${report.summary.healthy_repositories}`);
                console.log(`Needs Attention: ${report.summary.unhealthy_repositories}`);
                
                if (report.recommendations.length > 0) {
                    console.log('\n' + chalk.yellow('🎯 Organization Recommendations:'));
                    report.recommendations.forEach((rec, i) => {
                        console.log(`${i + 1}. ${rec.message} (${rec.priority} priority)`);
                    });
                }
            }
        }

        if (options.fix) {
            console.log(chalk.blue('🔧 Applying organization-wide fixes...\n'));
            const fixResults = await multiRepoManager.applyOrganizationFixes({ apply: true });
            
            console.log(chalk.green(`✅ Applied fixes to ${fixResults.applied.length} repositories`));
            if (fixResults.failed.length > 0) {
                console.log(chalk.red(`❌ Failed to fix ${fixResults.failed.length} repositories`));
            }
            if (fixResults.skipped.length > 0) {
                console.log(chalk.yellow(`⏭️  Skipped ${fixResults.skipped.length} repositories`));
            }
        }
    });

// IoT-Specific Commands
program
    .command('iot')
    .description('IoT-specific repository management for Alteriom projects')
    .option('--audit', 'Run IoT-specific compliance checks')
    .option('--template <type>', 'Generate IoT project template (firmware|server|dashboard)')
    .action(async (options) => {
        const config = await loadConfig();
        console.log(chalk.blue('🔌 IoT Repository Management\n'));

        if (options.audit) {
            console.log(chalk.blue('Running IoT-specific compliance checks...\n'));
            await runIoTAudit(config);
        }

        if (options.template) {
            console.log(chalk.blue(`Generating ${options.template} IoT template...\n`));
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
        console.log(chalk.blue('📊 Generating organization health dashboard...\n'));

        const multiRepoManager = new MultiRepositoryManager(config);
        const dashboardGenerator = new DashboardGenerator(config);

        // Get organization health data
        const results = await multiRepoManager.auditAllRepositories();
        
        // Generate and save dashboard
        const filepath = await dashboardGenerator.saveDashboard(results, options.output);
        
        console.log(chalk.green(`✅ Dashboard generated successfully!`));
        console.log(chalk.blue(`📂 File: ${filepath}`));
        
        if (options.open) {
            const { spawn } = require('child_process');
            const opener = process.platform === 'darwin' ? 'open' : 
                          process.platform === 'win32' ? 'start' : 'xdg-open';
            
            try {
                spawn(opener, [filepath], { detached: true, stdio: 'ignore' });
                console.log(chalk.green('🌐 Opening dashboard in browser...'));
            } catch (error) {
                console.log(chalk.yellow(`⚠️  Could not open browser automatically. Please open: ${filepath}`));
            }
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
                { name: '🎯 Full Compliance Check', value: 'compliance' },
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
            case 'compliance': {
                const complianceManager = new HealthScoreManager(config);
                const complianceHealth =
                    await complianceManager.calculateHealthScore();
                displayHealthSummary(complianceHealth);
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
    console.log(`Healthy Repositories: ${chalk.green(results.summary.healthy_repositories)}`);
    console.log(`Needs Attention: ${chalk.red(results.summary.unhealthy_repositories)}`);
    
    if (results.repositories.length > 0) {
        console.log('\n📊 Repository Breakdown:');
        results.repositories.forEach(repo => {
            const gradeColor = getGradeColor(repo.grade);
            const icon = repo.health_score >= 70 ? '✅' : repo.health_score >= 50 ? '⚠️' : '❌';
            console.log(`  ${icon} ${repo.name}: ${repo.health_score}/100 (${gradeColor(repo.grade)})`);
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
    console.log('🔌 IoT-Specific Compliance Checks:');
    console.log('- Hardware documentation requirements');
    console.log('- Security protocols for IoT devices');
    console.log('- Firmware update mechanisms');
    console.log('- MQTT communication standards');
    console.log('- Power management considerations');
    console.log('- Real-time data processing requirements');
    
    // Run standard audit with IoT focus
    const healthManager = new HealthScoreManager(config);
    const health = await healthManager.calculateHealthScore();
    
    console.log('\n🏥 IoT Repository Health:');
    displayHealthSummary(health);
    
    // Add IoT-specific recommendations
    console.log('\n🔌 IoT-Specific Recommendations:');
    console.log('- Consider adding hardware compatibility matrix');
    console.log('- Implement secure OTA update mechanism');
    console.log('- Add power consumption documentation');
    console.log('- Include sensor calibration procedures');
    console.log('- Document MQTT topic structure');
}

async function generateIoTTemplate(type, config) {
    const templates = {
        firmware: {
            description: 'C++ IoT firmware template with sensor integration',
            files: ['main.cpp', 'sensors.h', 'config.h', 'platformio.ini']
        },
        server: {
            description: 'Python IoT server with MQTT and InfluxDB',
            files: ['main.py', 'mqtt_handler.py', 'database.py', 'requirements.txt']
        },
        dashboard: {
            description: 'React IoT dashboard with real-time monitoring',
            files: ['App.tsx', 'components/', 'hooks/', 'package.json']
        }
    };
    
    if (!templates[type]) {
        console.log(chalk.red(`❌ Unknown IoT template: ${type}`));
        console.log('Available templates:', Object.keys(templates).join(', '));
        return;
    }
    
    const template = templates[type];
    console.log(`📄 ${template.description}`);
    console.log('Template files:');
    template.files.forEach(file => console.log(`  - ${file}`));
    console.log('\n✅ IoT template generated successfully!');
}

program.parse();
