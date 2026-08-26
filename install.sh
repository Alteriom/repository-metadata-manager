#!/bin/bash

# @alteriom/repository-metadata-manager Quick Setup Script
# This script installs and configures the repository metadata manager

set -e

echo "🔧 Setting up @alteriom/repository-metadata-manager..."

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script in a Node.js project root."
    exit 1
fi

# Install the package
echo "📦 Installing @alteriom/repository-metadata-manager..."
npm install --save-dev @alteriom/repository-metadata-manager

# Add safe, supported scripts to package.json
echo "⚙️ Adding scripts to package.json..."
npm pkg set scripts.repository:check="repo-manager check"
npm pkg set scripts.repository:verify="repo-manager verify"
npm pkg set scripts.repository:plan="repo-manager plan --output .repo-manager-plan.json"

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Quick Start:"
echo "  npm run repository:check   # Evaluate policy and show findings"
echo "  npm run repository:verify  # Enforce policy gates"
echo "  npm run repository:plan    # Generate a reviewable remediation plan"
echo "  npx repo-manager apply .repo-manager-plan.json --approve"
echo "                              # Apply only after reviewing the exact plan"
echo ""
echo "📚 For more information, see: https://github.com/Alteriom/repository-metadata-manager"
echo ""
