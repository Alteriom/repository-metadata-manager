#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { Command, InvalidArgumentError } = require('commander');
const Engine = require('../lib/engine/Engine');
const Context = require('../lib/engine/Context');
const Inventory = require('../lib/control/Inventory');
const { formatReport, formatGitHubAnnotations } = require('../lib/interfaces/cli');
const { formatReport: formatJson } = require('../lib/interfaces/json');
const pkg = require('../package.json');

const FORMATS = new Set(['cli', 'json', 'github']);

function commaList(value) {
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

function score(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
    throw new InvalidArgumentError('Score must be an integer between 0 and 100');
  }
  return parsed;
}

function format(value) {
  if (!FORMATS.has(value)) throw new InvalidArgumentError(`Format must be one of: ${[...FORMATS].join(', ')}`);
  return value;
}

function writeOutput(output, outputPath) {
  if (!outputPath) {
    console.log(output);
    return;
  }
  const resolved = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${output.replace(/\n$/, '')}\n`, 'utf8');
  console.error(`Output written to ${resolved}`);
}

function renderReport(report, outputFormat, verbose = false) {
  if (outputFormat === 'json') return formatJson(report);
  if (outputFormat === 'github') return formatGitHubAnnotations(report);
  return formatReport(report, { verbose });
}

function engineOptions(options) {
  return {
    projectRoot: path.resolve(options.project || process.cwd()),
    config: options.policy || '.repo-manager.json',
  };
}

const program = new Command();
program
  .name('repo-manager')
  .description('Policy-driven repository compliance evaluation and controlled remediation')
  .version(pkg.version);

program
  .command('check')
  .alias('evaluate')
  .description('Evaluate a repository against its versioned policy')
  .option('-o, --only <checkers>', 'Run only specific checkers (comma-separated)', commaList)
  .option('-f, --format <format>', 'Output format: cli, json, github', format, 'cli')
  .option('-v, --verbose', 'Show detailed findings', false)
  .option('--output <file>', 'Write output to a file')
  .option('--project <path>', 'Project root path', process.cwd())
  .option('--policy <path>', 'Policy file relative to the project root', '.repo-manager.json')
  .option('--fail-below <score>', 'Override the minimum score gate', score)
  .action(async options => {
    try {
      const engine = new Engine(engineOptions(options));
      const report = await engine.run(options.only);
      if (options.failBelow !== undefined) {
        const gate = report.gates.find(item => item.id === 'minimum-score');
        if (gate) {
          gate.expected = `>= ${options.failBelow}`;
          gate.passed = report.score >= options.failBelow;
        } else {
          report.gates.push({ id: 'minimum-score', actual: report.score, expected: `>= ${options.failBelow}`, passed: report.score >= options.failBelow });
        }
        report.status = report.gates.every(item => item.passed) ? 'pass' : 'fail';
      }
      writeOutput(renderReport(report, options.format, options.verbose), options.output);
      if (report.status === 'fail') process.exitCode = 1;
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exitCode = 1;
    }
  });

program
  .command('plan')
  .description('Create a deterministic remediation plan without changing files')
  .option('-o, --only <checkers>', 'Plan only specific checkers', commaList)
  .option('--output <file>', 'Write the plan to a file')
  .option('--project <path>', 'Project root path', process.cwd())
  .option('--policy <path>', 'Policy file relative to the project root', '.repo-manager.json')
  .action(async options => {
    try {
      const engine = new Engine(engineOptions(options));
      const plan = await engine.plan({ only: options.only });
      writeOutput(JSON.stringify(plan, null, 2), options.output);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exitCode = 1;
    }
  });

program
  .command('apply <plan>')
  .description('Preview or apply an approved remediation plan')
  .option('--approve', 'Explicitly approve and apply the plan', false)
  .option('--audit-log <file>', 'Append the execution record to a JSONL audit log')
  .option('--project <path>', 'Project root path', process.cwd())
  .option('--policy <path>', 'Policy file relative to the project root', '.repo-manager.json')
  .action(async (planPath, options) => {
    try {
      const plan = JSON.parse(fs.readFileSync(path.resolve(planPath), 'utf8'));
      const engine = new Engine(engineOptions(options));
      const audit = await engine.applyPlan(plan, {
        approved: options.approve,
        dryRun: !options.approve,
        auditPath: options.auditLog ? path.resolve(options.auditLog) : null,
      });
      console.log(JSON.stringify(audit, null, 2));
      if (!options.approve) console.error('Preview only. Re-run with --approve to apply this exact plan.');
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exitCode = 1;
    }
  });

program
  .command('fix')
  .description('Compatibility command: create and preview a remediation plan')
  .option('--approve', 'Explicitly approve and apply the generated plan', false)
  .option('--audit-log <file>', 'Append the execution record to a JSONL audit log')
  .option('--project <path>', 'Project root path', process.cwd())
  .option('--policy <path>', 'Policy file relative to the project root', '.repo-manager.json')
  .action(async options => {
    try {
      const engine = new Engine(engineOptions(options));
      const result = await engine.fix({
        dryRun: !options.approve,
        approved: options.approve,
        auditPath: options.auditLog ? path.resolve(options.auditLog) : null,
      });
      console.log(JSON.stringify(result, null, 2));
      if (!options.approve) console.error('Preview only. Use plan/apply for controlled automation or add --approve.');
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exitCode = 1;
    }
  });

program
  .command('verify')
  .description('Evaluate the repository and fail when any policy gate fails')
  .option('--project <path>', 'Project root path', process.cwd())
  .option('--policy <path>', 'Policy file relative to the project root', '.repo-manager.json')
  .option('-f, --format <format>', 'Output format: cli, json, github', format, 'cli')
  .action(async options => {
    try {
      const report = await new Engine(engineOptions(options)).run();
      console.log(renderReport(report, options.format, true));
      if (report.status !== 'pass') process.exitCode = 1;
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exitCode = 1;
    }
  });

program
  .command('inventory')
  .description('Produce normalized local or GitHub organization repository inventory')
  .option('--organization <org>', 'Inventory every repository in a GitHub organization')
  .option('--project <path>', 'Local project root path', process.cwd())
  .option('--policy <path>', 'Policy file relative to the project root', '.repo-manager.json')
  .option('--output <file>', 'Write inventory JSON to a file')
  .action(async options => {
    try {
      let inventory;
      if (options.organization) {
        const { Octokit } = require('@octokit/rest');
        const token = process.env.GITHUB_TOKEN;
        if (!token) throw new Error('GITHUB_TOKEN is required for organization inventory');
        inventory = await Inventory.organization(new Octokit({ auth: token }), options.organization);
      } else {
        const context = await Context.build({
          projectRoot: path.resolve(options.project),
          token: process.env.GITHUB_TOKEN || null,
          configPath: options.policy,
        });
        inventory = Inventory.local(context);
      }
      writeOutput(JSON.stringify(inventory, null, 2), options.output);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exitCode = 1;
    }
  });

program
  .command('config')
  .description('Show the validated effective policy and detected repository context')
  .option('--project <path>', 'Project root path', process.cwd())
  .option('--policy <path>', 'Policy file relative to the project root', '.repo-manager.json')
  .action(async options => {
    try {
      const context = await Context.build({
        projectRoot: path.resolve(options.project),
        token: process.env.GITHUB_TOKEN || null,
        configPath: options.policy,
      });
      console.log(JSON.stringify({
        repository: context.repositoryIdentity(),
        githubAvailable: context.github !== null,
        githubError: context.githubError,
        policySource: context.policySource,
        policy: context.config,
      }, null, 2));
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv).catch(error => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});

if (!process.argv.slice(2).length) program.help();
