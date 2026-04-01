@echo off
REM GitPilot Extension - Local Development Setup (Windows)
REM Run this script to prepare the extension for local testing and development

setlocal enabledelayedexpansion

echo.
echo 🔧 GitPilot Extension Development Setup
echo ========================================
echo.

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Please install from https://nodejs.org
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo ✅ Node.js found: %NODE_VER%

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm not found
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VER=%%i
echo ✅ npm found: %NPM_VER%

REM Install dependencies
echo.
echo 📥 Installing dependencies...
call npm install

REM Build TypeScript
echo.
echo 🔨 Building TypeScript...
call npm run build

REM Success message
echo.
echo ✅ Development setup complete!
echo.
echo 🚀 Next steps:
echo.
echo Option 1: Test in Extension Development Host
echo   - Open this folder in VS Code
echo   - Press F5 to launch Extension Development Host
echo   - Test the extension in the new window
echo.
echo Option 2: Package for local testing
echo   - npm install -g @vsce/vsce  (one-time)
echo   - vsce package
echo   - Install the .vsix file manually in VS Code
echo.
echo Option 3: Watch for changes during development
echo   - npm run watch
echo   - Make code changes and TypeScript will auto-compile
echo.
echo 📖 For publication to marketplace, see PUBLISHING.md
echo.
