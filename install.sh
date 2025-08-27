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

# Add scripts to package.json
echo "⚙️ Adding scripts to package.json..."
npm pkg set scripts.metadata:report="alteriom-metadata report"
npm pkg set scripts.metadata:validate="alteriom-metadata validate"
npm pkg set scripts.metadata:apply="alteriom-metadata apply"
npm pkg set scripts.metadata:dry-run="alteriom-metadata dry-run"

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Quick Start:"
echo "  npm run metadata:report    # Generate compliance report"
echo "  npm run metadata:validate  # Check current status"
echo "  npm run metadata:apply     # Apply fixes automatically"
echo "  npm run metadata:dry-run   # Preview changes"
echo ""
echo "📚 For more information, see: https://github.com/Alteriom/repository-metadata-manager"
echo ""