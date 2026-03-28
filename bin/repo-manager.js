#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { Command } = require('commander');
const Engine = require('../lib/engine/Engine');
const { formatReport, formatFixResult, formatGitHubAnnotations } = require('../lib/interfaces/cli');
const { formatReport: formatJson } = require('../lib/interfaces/json');
const pkg = require('../package.json');

const program = new Command();

program
  .name('repo-manager')
  .description('Repository health and compliance analysis')
  .version(pkg.version);

program
  .command('check')
  .description('Run health checks on the current repository')
  .option('-o, --only <checkers>', 'Run only specific checkers (comma-separated)', val => val.split(','))
  .option('-f, --format <format>', 'Output format: cli, json, github', 'cli')
  .option('-v, --verbose', 'Show detailed findings', false)
  .option('--output <file>', 'Write output to file')
  .option('--project <path>', 'Project root path', process.cwd())
  .option('--fail-below <score>', 'Exit with code 1 if score is below this threshold', parseInt)
  .option('--token <token>', 'GitHub API token (defaults to GITHUB_TOKEN env var)')
  .action(async (options) => {
    try {
      // Auto-detect CI environment
      if (process.env.GITHUB_ACTIONS === 'true' && !options.format) {
        options.format = 'github';
      }

      const engine = new Engine({
        projectRoot: options.project,
        token: options.token
      });
      const report = await engine.run(options.only);

      let output;
      if (options.format === 'json') {
        output = formatJson(report);
      } else if (options.format === 'github') {
        output = formatGitHubAnnotations(report);
      } else {
        output = formatReport(report, { verbose: options.verbose });
      }

      if (options.output) {
        fs.writeFileSync(options.output, output, 'utf8');
        console.log(`Report written to ${options.output}`);
      } else {
        console.log(output);
      }

      // Exit with error code if below fail threshold
      const threshold = options.failBelow || 0;
      if (report.score < threshold) {
        process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('fix')
  .description('Auto-fix detected issues')
  .option('--dry-run', 'Preview fixes without applying', false)
  .option('-f, --format <format>', 'Output format: cli, json', 'cli')
  .option('--project <path>', 'Project root path', process.cwd())
  .option('--token <token>', 'GitHub API token (defaults to GITHUB_TOKEN env var)')
  .action(async (options) => {
    try {
      const engine = new Engine({
        projectRoot: options.project,
        token: options.token
      });
      const { report, fixes } = await engine.fix({ dryRun: options.dryRun });

      if (options.format === 'json') {
        console.log(JSON.stringify({ report, fixes }, null, 2));
      } else {
        console.log(formatReport(report));
        console.log(formatFixResult(fixes));

        if (options.dryRun) {
          console.log('(Dry run \u2014 no changes applied)');
        }
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Show loaded configuration')
  .option('--project <path>', 'Project root path', process.cwd())
  .action(async (options) => {
    try {
      const Context = require('../lib/engine/Context');
      const context = await Context.build({ projectRoot: options.project });
      console.log(JSON.stringify({
        projectRoot: context.projectRoot,
        projectType: context.projectType,
        githubAvailable: context.github !== null,
        config: context.config,
      }, null, 2));
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);

// Show help if no command
if (!process.argv.slice(2).length) {
  program.help();
}
