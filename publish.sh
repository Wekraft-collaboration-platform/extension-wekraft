#!/bin/bash

# GitPilot Extension - Automated Publication Script
# This script automates the VS Code Marketplace publication process
# Usage: bash publish.sh [patch|minor|major]

set -e  # Exit on error

VERSION_TYPE="${1:-patch}"  # Default to patch version bump

echo "🚀 GitPilot Extension Publisher"
echo "================================"
echo ""

# Check prerequisites
echo "✓ Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js from https://nodejs.org"
    exit 1
fi

if ! command -v vsce &> /dev/null; then
    echo "⚠️  VSCE not found. Installing @vsce/vsce..."
    npm install -g @vsce/vsce
fi

# Verify in correct directory
if [ ! -f "package.json" ] || [ ! -f "dist/extension.js" ]; then
    echo "❌ Not in gitpilot-vscode root directory or build missing"
    echo "   Please run: npm run build"
    exit 1
fi

# Build extension
echo ""
echo "📦 Building extension..."
npm run build

if [ ! -f "dist/extension.js" ]; then
    echo "❌ Build failed!"
    exit 1
fi
echo "✅ Build successful"

# Get current version
CURRENT_VERSION=$(grep '"version"' package.json | head -1 | sed -E 's/.*"version": "([^"]+)".*/\1/')
echo ""
echo "📋 Current version: $CURRENT_VERSION"
echo "📋 Publishing type: $VERSION_TYPE"

# Verify vsce login
echo ""
echo "🔐 Checking VSCE authentication..."
if ! vsce ls &>/dev/null; then
    echo "⚠️  Not authenticated. Running: vsce login wekraft"
    echo "   (You will need your Azure DevOps Personal Access Token)"
    vsce login wekraft
fi

# Confirm before publishing
echo ""
echo "📤 Ready to publish to VS Code Marketplace"
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

# Publish
echo ""
echo "📤 Publishing extension..."
vsce publish "$VERSION_TYPE"

echo ""
echo "✅ Publication complete!"
echo ""
echo "📍 View your extension:"
echo "   https://marketplace.visualstudio.com/items?itemName=wekraft.gitpilot"
echo ""
echo "💡 To install locally before publishing:"
echo "   vsce package  # Creates .vsix file"
