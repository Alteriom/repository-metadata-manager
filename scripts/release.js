#!/usr/bin/env node

/**
 * Release Helper Script
 * Helps manage versioning and releases for the repository metadata manager
 */

// Load environment variables from .env file
require('dotenv').config();

const { execSync } = require('child_process');
const packageJson = require('../package.json');

function getCurrentVersion() {
    return packageJson.version;
}

function getNextVersion(type) {
    const [major, minor, patch] = getCurrentVersion().split('.').map(Number);
    
    switch (type) {
        case 'major':
            return `${major + 1}.0.0`;
        case 'minor':
            return `${major}.${minor + 1}.0`;
        case 'patch':
            return `${major}.${minor}.${patch + 1}`;
        default:
            throw new Error(`Unknown version type: ${type}`);
    }
}

function showHelp() {
    console.log(`
🚀 Repository Metadata Manager - Release Helper

Usage: node release.js [command] [options]

Commands:
  status              Show current version and git status
  check               Check if ready for release (lint + test)
  preview <type>      Preview what the next version would be
  release <type>      Create and publish a new release

Version Types:
  patch              Bug fixes (1.0.0 -> 1.0.1)
  minor              New features (1.0.0 -> 1.1.0)
  major              Breaking changes (1.0.0 -> 2.0.0)

Examples:
  node release.js status
  node release.js check
  node release.js preview patch
  node release.js release minor

Environment Variables:
  DRY_RUN=true       Preview mode (don't actually release)
`);
}

function checkStatus() {
    console.log('📋 Current Status:');
    console.log(`📦 Current version: ${getCurrentVersion()}`);
    
    try {
        const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
        if (gitStatus.trim()) {
            console.log('⚠️  Uncommitted changes detected:');
            console.log(gitStatus);
        } else {
            console.log('✅ Working directory clean');
        }
        
        const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
        console.log(`🌿 Current branch: ${branch}`);
        
        if (branch !== 'main' && branch !== 'master') {
            console.log('⚠️  Not on main/master branch');
        }
    } catch (error) {
        console.log('❌ Git not available or not in a git repository');
    }
}

function checkReadiness() {
    console.log('🔍 Checking release readiness...');
    
    try {
        console.log('🧹 Running linter...');
        execSync('npm run lint', { stdio: 'inherit' });
        console.log('✅ Linting passed');
        
        console.log('🧪 Running tests...');
        execSync('npm test', { stdio: 'inherit' });
        console.log('✅ All tests passed');
        
        console.log('🎉 Ready for release!');
        return true;
    } catch (error) {
        console.log('❌ Release check failed');
        return false;
    }
}

function previewVersion(type) {
    try {
        const nextVersion = getNextVersion(type);
        console.log(`📋 Version Preview:`);
        console.log(`   Current: ${getCurrentVersion()}`);
        console.log(`   Next (${type}): ${nextVersion}`);
    } catch (error) {
        console.log(`❌ ${error.message}`);
    }
}

function createRelease(type) {
    const isDryRun = process.env.DRY_RUN === 'true';
    
    if (isDryRun) {
        console.log('🔍 DRY RUN MODE - No changes will be made');
    }
    
    if (!checkReadiness()) {
        process.exit(1);
    }
    
    try {
        const nextVersion = getNextVersion(type);
        console.log(`🚀 Creating ${type} release: ${getCurrentVersion()} -> ${nextVersion}`);
        
        if (!isDryRun) {
            execSync(`npm run release:${type}`, { stdio: 'inherit' });
            console.log('✅ Release completed successfully!');
            console.log(`📦 Version ${nextVersion} published to npm`);
            console.log(`🏷️  Git tag v${nextVersion} created and pushed`);
        } else {
            console.log('✅ Dry run completed - would have created release');
        }
    } catch (error) {
        console.log('❌ Release failed:', error.message);
        process.exit(1);
    }
}

// Main script logic
const [,, command, ...args] = process.argv;

switch (command) {
    case 'status':
        checkStatus();
        break;
    case 'check':
        checkReadiness();
        break;
    case 'preview':
        if (!args[0]) {
            console.log('❌ Version type required (patch, minor, major)');
            process.exit(1);
        }
        previewVersion(args[0]);
        break;
    case 'release':
        if (!args[0]) {
            console.log('❌ Version type required (patch, minor, major)');
            process.exit(1);
        }
        createRelease(args[0]);
        break;
    case 'help':
    case '--help':
    case '-h':
        showHelp();
        break;
    default:
        if (command) {
            console.log(`❌ Unknown command: ${command}`);
        }
        showHelp();
        break;
}
