@echo off
REM GitPilot Extension - Automated Publication Script (Windows)
REM This script automates the VS Code Marketplace publication process
REM Usage: publish.bat [patch|minor|major]

setlocal enabledelayedexpansion

set VERSION_TYPE=%1
if "%VERSION_TYPE%"=="" set VERSION_TYPE=patch

echo.
echo 🚀 GitPilot Extension Publisher
echo ================================
echo.

REM Check if Node is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Please install from https://nodejs.org
    exit /b 1
)

REM Check if vsce is installed
vsce --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  VSCE not found. Installing @vsce/vsce...
    call npm install -g @vsce/vsce
)

REM Verify in correct directory
if not exist "package.json" (
    echo ❌ Not in gitpilot-vscode root directory
    exit /b 1
)

if not exist "dist\extension.js" (
    echo ❌ Build not found. Run: npm run build
    exit /b 1
)

REM Build extension
echo.
echo 📦 Building extension...
call npm run build

if not exist "dist\extension.js" (
    echo ❌ Build failed!
    exit /b 1
)
echo ✅ Build successful

REM Get current version
for /f "tokens=2 delims=:" %%a in ('findstr "version" package.json ^| findstr /v "vscode"') do (
    set CURRENT_VERSION=%%a
    set CURRENT_VERSION=!CURRENT_VERSION:"=!
    set CURRENT_VERSION=!CURRENT_VERSION:,=!
    goto :version_found
)
:version_found

echo.
echo 📋 Current version: !CURRENT_VERSION!
echo 📋 Publishing type: %VERSION_TYPE%

REM Check authentication
echo.
echo 🔐 Checking VSCE authentication...
vsce ls >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Not authenticated. Running: vsce login wekraft
    echo    (You will need your Azure DevOps Personal Access Token)
    call vsce login wekraft
)

REM Confirm before publishing
echo.
echo 📤 Ready to publish to VS Code Marketplace
set /p CONFIRM="Continue? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo ❌ Cancelled
    exit /b 1
)

REM Publish
echo.
echo 📤 Publishing extension...
call vsce publish %VERSION_TYPE%

echo.
echo ✅ Publication complete!
echo.
echo 📍 View your extension:
echo    https://marketplace.visualstudio.com/items?itemName=wekraft.gitpilot
echo.
echo 💡 To package locally for testing:
echo    vsce package
echo.
