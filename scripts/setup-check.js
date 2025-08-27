#!/usr/bin/env node

/**
 * GitHub Secrets Setup Verification Script
 * Helps verify that all required secrets and environment variables are properly configured
 */

console.log('🔍 GitHub Secrets Setup Verification\n');

// Check local environment
console.log('📋 Local Environment Check:');

const requiredEnvVars = [
    'NPM_TOKEN',
    'GITHUB_TOKEN'
];

const optionalEnvVars = [
    'AGENT_ORG_TOKEN',
    'GITHUB_REPOSITORY_OWNER',
    'GITHUB_REPOSITORY_NAME'
];

requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`✅ ${varName}: SET (${value.substring(0, 8)}...)`);
    } else {
        console.log(`❌ ${varName}: NOT SET`);
    }
});

console.log('\n📋 Optional Environment Variables:');
optionalEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`✅ ${varName}: SET (${value.substring(0, 8)}...)`);
    } else {
        console.log(`⚪ ${varName}: NOT SET (optional)`);
    }
});

// Instructions for GitHub Secrets
console.log('\n🔐 Required GitHub Repository Secrets:');
console.log(`
To set up GitHub repository secrets:

1. Go to: https://github.com/Alteriom/repository-metadata-manager/settings/secrets/actions

2. Click "New repository secret" and add:

   Name: NPM_TOKEN
   Value: ${process.env.NPM_TOKEN || 'npm_your_token_here'}

3. The GITHUB_TOKEN is automatically provided by GitHub Actions

🎯 After adding the NPM_TOKEN secret, your automated releases will work!
`);

// Test npm authentication
console.log('🧪 Testing NPM Authentication:');
try {
    const { execSync } = require('child_process');
    const whoami = execSync('npm whoami', { encoding: 'utf8' }).trim();
    console.log(`✅ NPM Authentication: Logged in as "${whoami}"`);
    
    // Test package access
    try {
        const packageInfo = execSync('npm view @alteriom/repository-metadata-manager version', { encoding: 'utf8' }).trim();
        console.log(`✅ Package Access: Current version ${packageInfo} found on npm`);
    } catch (error) {
        console.log(`❌ Package Access: Cannot access @alteriom/repository-metadata-manager`);
    }
} catch (error) {
    console.log(`❌ NPM Authentication: Not logged in or token invalid`);
    console.log(`   Run: npm login`);
}

console.log('\n🚀 Release System Status:');
const packageJson = require('../package.json');
console.log(`📦 Current Version: ${packageJson.version}`);
console.log(`📝 Release Scripts Available:`);
console.log(`   npm run release:patch    # ${packageJson.version} → patch bump`);
console.log(`   npm run release:minor    # ${packageJson.version} → minor bump`);
console.log(`   npm run release:major    # ${packageJson.version} → major bump`);
console.log(`   npm run release:prerelease # ${packageJson.version} → beta version`);

console.log('\n✨ Next Steps:');
if (!process.env.NPM_TOKEN) {
    console.log('1. ❌ Set NPM_TOKEN environment variable locally');
} else {
    console.log('1. ✅ NPM_TOKEN is set locally');
}
console.log('2. 🔐 Add NPM_TOKEN to GitHub repository secrets (see URL above)');
console.log('3. 🚀 Test automated release with: npm run release:patch');
