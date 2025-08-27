#!/usr/bin/env node

/**
 * GitHub Secrets Setup Helper
 * Opens the GitHub secrets page and provides setup instructions
 */

const { execSync } = require('child_process');

console.log('🔐 GitHub Secrets Setup Helper\n');

const repoUrl = 'https://github.com/Alteriom/repository-metadata-manager';
const secretsUrl = `${repoUrl}/settings/secrets/actions`;

console.log('📋 Setting Up GitHub Repository Secrets:\n');

console.log('1. 🌐 Opening GitHub secrets page...');
console.log(`   URL: ${secretsUrl}\n`);

console.log('2. 🔑 Add the following secret:\n');
console.log('   Name: NPM_TOKEN');
console.log(`   Value: ${process.env.NPM_TOKEN || 'npm_your_token_here'}\n`);

console.log('3. ✅ Steps to add secret:');
console.log('   • Click "New repository secret"');
console.log('   • Enter "NPM_TOKEN" as the name');
console.log('   • Paste your npm token as the value');
console.log('   • Click "Add secret"\n');

console.log('4. 🚀 After adding the secret, test with:');
console.log('   npm run release:patch\n');

// Try to open the URL in browser (if possible)
try {
    if (process.platform === 'win32') {
        execSync(`start ${secretsUrl}`, { stdio: 'ignore' });
        console.log('✅ Opened GitHub secrets page in your browser!');
    } else if (process.platform === 'darwin') {
        execSync(`open ${secretsUrl}`, { stdio: 'ignore' });
        console.log('✅ Opened GitHub secrets page in your browser!');
    } else {
        execSync(`xdg-open ${secretsUrl}`, { stdio: 'ignore' });
        console.log('✅ Opened GitHub secrets page in your browser!');
    }
} catch (error) {
    console.log('🌐 Please manually open this URL in your browser:');
    console.log(`   ${secretsUrl}`);
}

console.log('\n📝 Copy this value for the NPM_TOKEN secret:');
console.log('   ' + (process.env.NPM_TOKEN || 'npm_your_token_here'));
