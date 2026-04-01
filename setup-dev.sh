#!/bin/bash

# GitPilot Extension - Local Development Setup
# Run this script to prepare the extension for local testing and development

set -e

echo "🔧 GitPilot Extension Development Setup"
echo "========================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found"
    exit 1
fi

echo "✅ npm found: $(npm --version)"

# Install dependencies
echo ""
echo "📥 Installing dependencies..."
npm install

# Build TypeScript
echo ""
echo "🔨 Building TypeScript..."
npm run build

# Success message
echo ""
echo "✅ Development setup complete!"
echo ""
echo "🚀 Next steps:"
echo ""
echo "Option 1: Test in Extension Development Host"
echo "  - Open this folder in VS Code"
echo "  - Press F5 to launch Extension Development Host"
echo "  - Test the extension in the new window"
echo ""
echo "Option 2: Package for local testing"
echo "  - npm install -g @vsce/vsce  (one-time)"
echo "  - vsce package"
echo "  - Install the .vsix file manually in VS Code"
echo ""
echo "Option 3: Watch for changes during development"
echo "  - npm run watch"
echo "  - Make code changes and TypeScript will auto-compile"
echo ""
echo "📖 For publication to marketplace, see PUBLISHING.md"
echo ""
