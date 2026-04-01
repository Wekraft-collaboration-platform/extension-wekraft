# GitPilot Extension - Complete Developer Guide

**Version**: 0.1.0  
**Status**: ✅ Ready for VS Code Marketplace Publication  
**Publisher**: wekraft  
**License**: MIT  

---

## 📖 Table of Contents

1. [Quick Start](#quick-start) — Get publishing in 15 minutes
2. [Project Structure](#project-structure) — Navigate the codebase
3. [Development Workflow](#development-workflow) — Build, test, iterate
4. [Features Overview](#features-overview) — What GitPilot does
5. [File Reference](#file-reference) — All files explained
6. [Publishing Guide](#publishing-guide) — Release to VS Code Marketplace
7. [Troubleshooting](#troubleshooting) — Common issues and fixes

---

## Quick Start

### For First-Time Deployment

```bash
# 1. Build locally
npm install
npm run build

# 2. Install VSCE (one-time)
npm install -g @vsce/vsce

# 3. Create Azure DevOps PAT
# Visit: https://dev.azure.com
# See: QUICKSTART.md for details

# 4. Login to marketplace
vsce login wekraft
# Paste your PAT token

# 5. Publish
vsce publish
```

**Expected time**: ~15 minutes  
**Result**: Extension live on VS Code Marketplace

### For Development

```bash
# 1. Setup
./setup-dev.sh  # macOS/Linux
setup-dev.bat   # Windows

# 2. Watch for changes
npm run watch

# 3. Test in VS Code
# Press F5 to open Extension Development Host

# 4. Make changes → TypeScript auto-compiles → Reload window in dev host
```

---

## Project Structure

```
gitpilot-vscode/
│
├── 📋 Configuration & Docs
│   ├── package.json                 # Manifest, metadata, scripts
│   ├── tsconfig.json                # TypeScript compilation config
│   ├── .gitignore                   # Git ignore rules
│   ├── .vscodeignore                # Marketplace exclusions
│   ├── LICENSE                      # MIT license
│   │
│   └── 📚 Documentation
│       ├── README.md                # User-facing guide
│       ├── QUICKSTART.md            # 15-min publication walkthrough
│       ├── PUBLISHING.md            # Detailed publication guide
│       ├── READY_TO_PUBLISH.md      # Pre-flight checklist
│       └── CHANGELOG.md             # Version history
│
├── 🔧 Source Code
│   └── src/
│       ├── extension.ts             # Entry point, commands, auth
│       │
│       ├── ui/
│       │   └── sidebarProvider.ts   # WebView UI (4 views)
│       │
│       └── core/
│           ├── types.ts             # TypeScript interfaces
│           ├── gitUtils.ts          # Git command wrappers
│           ├── secretScanner.ts     # API key detection
│           ├── prePushCheck.ts      # Pre-push orchestration
│           └── hookInstaller.ts     # Git hook generator
│
├── 🎨 Assets
│   └── media/
│       └── gitpilot.svg             # Activity bar icon
│
├── 📦 Build Output
│   └── dist/
│       └── extension.js             # Compiled JavaScript
│
└── 🚀 Scripts
    ├── publish.sh / publish.bat     # Automated publishing
    └── setup-dev.sh / setup-dev.bat # Development setup
```

---

## Development Workflow

### 1. Local Development

```bash
# Start watch mode (auto-compile on save)
npm run watch

# Open this folder in VS Code
code .

# Press F5 to launch Extension Development Host
# (Separate VS Code window with your extension loaded)
```

### 2. Make Changes

- Edit files in `src/`
- TypeScript auto-compiles to `dist/`
- Reload the dev window (Ctrl+R) to test changes

### 3. Test Features

In the Extension Development Host (F5 window):

- Click GitPilot icon → Sidebar opens
- Click "Login with GitHub" → GitHub auth popup
- Select repositories → View deadline tracking
- Click commits → See full details
- Set deadlines → See time badges

### 4. Build for Release

```bash
npm run build   # Compile TypeScript
npm run build   # Verify no errors
```

### 5. Commit & Push

```bash
git add .
git commit -m "Add feature: ..."
git push
```

---

## Features Overview

### 🔐 Authentication
- **GitHub OAuth integrated with VS Code**
- Single sign-on (no separate credentials needed)
- Session persistence across VSCode restarts

### 📊 Repository Management
- **List all user repositories** in sidebar
- **View repository details** including last 5 commits
- **Search/filter** repos by name (future feature)

### 🎯 Deadline Tracking
- **Set project deadlines** with date and time
- **Visual deadline badges** showing time remaining
- **Highlight repos** with approaching deadlines
- **Relative time display** ("< 2 days", "< 1 hr", "Overdue")

### 📜 Commit History
- **Browse last 5 commits** per repository
- **Click commits** to view full details
- **See file changes** (added/modified/deleted status)
- **View line statistics** (total +lines, -lines per file)
- **Author information** (name, email, timestamp)

### 🛡️ Pre-Push Safety
- **Automatic line metrics** on every push
- **Secret detection** (API keys, tokens, credentials)
- **Emergency blocking** if secrets detected
- **Override capability** with `GITPILOT_ALLOW_PUSH=1`
- **Report generation** (`.gitpilot/last-prepush-report.json`)

### 🎨 User Interface
- **Minimalist Linear-inspired design**
- **Native VS Code theming** (light/dark/high-contrast)
- **Smooth transitions** between views
- **Responsive webview** layout

---

## File Reference

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Extension manifest, metadata, npm scripts |
| `tsconfig.json` | TypeScript compiler options (ES2022, strict mode) |
| `.gitignore` | Git repository exclusions |
| `.vscodeignore` | Marketplace package exclusions |

### Source Code Files

| File | Purpose | Key Functions |
|------|---------|-------|
| `src/extension.ts` | Entry point, command registration | `activate()`, `checkAuth()`, `login()`, `logout()` |
| `src/ui/sidebarProvider.ts` | WebView provider, UI renderer | `resolveWebviewView()`, `fetchRepos()`, `fetchCommitDetail()` |
| `src/core/types.ts` | TypeScript type definitions | `PushStats`, `SecretHit`, `PrePushReport` |
| `src/core/gitUtils.ts` | Git command wrapper | `getCurrentBranch()`, `getDiffNumStat()` |
| `src/core/secretScanner.ts` | Secret detection engine | `scanAddedLines()`, `dedupeHits()` |
| `src/core/prePushCheck.ts` | Pre-push orchestration | `runPrePushCheck()` |
| `src/core/hookInstaller.ts` | Git hook installer | `installPrePushHook()` |

### Documentation Files

| File | Purpose | Audience |
|------|---------|----------|
| `README.md` | User-facing feature guide | End users |
| `QUICKSTART.md` | 15-minute deployment guide | Developers deploying |
| `PUBLISHING.md` | Detailed publication steps | Developers releasing updates |
| `READY_TO_PUBLISH.md` | Pre-flight checklist | QA/Release leads |
| `CHANGELOG.md` | Version history and features | All stakeholders |
| **This file** | Developer guide and reference | Development team |

### Asset Files

| File | Purpose |
|------|---------|
| `media/gitpilot.svg` | Activity bar icon (VS Code sidebar) |
| `LICENSE` | MIT license for distribution |

### Build & Script Files

| File | Purpose | Platform |
|------|---------|----------|
| `publish.sh` | Automated publication script | macOS/Linux |
| `publish.bat` | Automated publication script | Windows |
| `setup-dev.sh` | Development environment setup | macOS/Linux |
| `setup-dev.bat` | Development environment setup | Windows |

---

## Publishing Guide

### Prerequisites
- ✅ Azure DevOps organization created
- ✅ Personal Access Token (PAT) generated
- ✅ VS Code Marketplace publisher account created
- ✅ `vsce` tool installed (`npm install -g @vsce/vsce`)

### Publishing Steps

```bash
# 1. Build
npm run build

# 2. Login (first-time only)
vsce login wekraft
# Paste your PAT token

# 3. Publish
vsce publish patch   # Bug fix: 0.1.0 → 0.1.1
vsce publish minor   # Feature: 0.1.0 → 0.2.0
vsce publish major   # Major: 0.1.0 → 1.0.0
```

### Or Use Automated Script

```bash
./publish.sh patch      # macOS/Linux
publish.bat patch       # Windows
```

### Verify Publication

1. Search "GitPilot" on [VS Code Marketplace](https://marketplace.visualstudio.com)
2. Confirm listing shows correct version and metadata
3. Click "Install" to verify link works

**See [PUBLISHING.md](./PUBLISHING.md) for detailed troubleshooting**

---

## Troubleshooting

### Build Issues

**Problem**: `npm run build` fails with TypeScript errors

**Solution**:
```bash
# Clear build artifacts
rm -rf dist/ node_modules/

# Reinstall and rebuild
npm install
npm run build
```

### Authentication Issues

**Problem**: Login page keeps appearing

**Solution**:
```bash
# Clear extension state
# In VS Code: Ctrl+Shift+P → "Developer: Kill Extension Host"
# Then reload window
```

**Problem**: "401 Unauthorized" when publishing

**Solution**:
```bash
# Re-login with fresh PAT
vsce login wekraft
# Paste new token when prompted
```

### Git & Pre-Push Issues

**Problem**: Pre-push hook not running

**Solution**:
```bash
# Run command to install hook
# In VS Code: Ctrl+Shift+P → "GitPilot: Install Pre-Push Hook"
```

**Problem**: Secret detection shows false positives

**Solution**:
```bash
# Override for this push
GITPILOT_ALLOW_PUSH=1 git push

# Then rotate any actual exposed credentials
```

### Marketplace Issues

**Problem**: Extension doesn't appear after publishing

**Solution**:
1. Wait 5 minutes for marketplace indexing
2. Refresh browser cache (Ctrl+Shift+R)
3. Verify `"publisher": "wekraft"` in package.json

**Problem**: Metadata (README, icon) doesn't display

**Solution**:
1. Verify files exist: `media/gitpilot.svg`, `README.md`, `LICENSE`
2. Verify paths are correct in `package.json`
3. Republish: `vsce publish patch`

---

## Key Concepts

### WebView Architecture
- **Sidebar** runs as WebView (HTML/CSS/JS)
- **Extension host** (TypeScript) handles git operations
- **Message passing** between WebView and host via `postMessage()`

### Pre-Push Hook Flow
1. User runs `git push`
2. Git pre-push hook executes (`.git/hooks/pre-push`)
3. Hook calls `.gitpilot/prepush-runtime.cjs`
4. Runtime calculates line metrics + scans for secrets
5. If secrets found: Blocks push (exit 1) unless `GITPILOT_ALLOW_PUSH=1`
6. Report written to `.gitpilot/last-prepush-report.json`

### GitHub OAuth Integration
- Uses VS Code's built-in GitHub authentication provider
- No manual token storage needed
- Single sign-on with GitHub account
- Permissions limited to public repo access

---

## Performance Considerations

- **API calls cached** in VS Code global state
- **Diff parsing optimized** with regex patterns
- **Secret detection regex** scanned on *added lines only*
- **WebView rendering** uses native VS Code CSS variables
- **Git operations** run asynchronously to avoid blocking UI

---

## Security Notes

- ✅ No credentials stored locally (uses VS Code provider)
- ✅ All GitHub API calls use OAuth tokens
- ✅ Secret detection runs locally (not in cloud)
- ✅ Pre-push hook runs in git repository (user context)
- ✅ MIT licensed (open source, auditable code)

**⚠️ Important**: Never commit `.gitpilot/` directory to git (add to `.gitignore`)

---

## Future Enhancements

### Planned for v0.2.0
- [ ] Entropy-based secret detection
- [ ] Commit search/filter
- [ ] User settings UI
- [ ] Error telemetry

### Potential Future Features
- [ ] Multi-workspace support
- [ ] Webhook integration for CI/CD
- [ ] Badge display in GitHub PRs
- [ ] Slack/Teams notifications
- [ ] Custom rule configuration

---

## Support & Resources

- **VS Code Extension API**: [code.visualstudio.com/api](https://code.visualstudio.com/api)
- **GitHub REST API**: [docs.github.com/rest](https://docs.github.com/rest)
- **WebView Documentation**: [code.visualstudio.com/api/references/webview](https://code.visualstudio.com/api/references/webview)
- **VSCE Documentation**: [code.visualstudio.com/api/working-with-extensions/publishing-extension](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

---

## Quick Command Reference

```bash
# Development
npm install              # Install dependencies
npm run build           # Compile TypeScript
npm run watch          # Watch mode (auto-compile)
npm run lint           # Lint check

# Testing
# Press F5 in VS Code to open Extension Development Host

# Publishing (First Time)
npm install -g @vsce/vsce   # Install VSCE tool
vsce login wekraft          # Login with PAT
vsce publish                # Publish v0.1.0

# Publishing (Future Updates)
vsce publish patch          # Version bump: x.y.Z+1
vsce publish minor          # Version bump: x.Y+1.0
vsce publish major          # Version bump: X+1.0.0

# Utilities
vsce package                # Package into .vsix (local testing)
vsce ls                     # List published versions
./publish.sh patch          # Automated publish (macOS/Linux)
publish.bat patch           # Automated publish (Windows)
```

---

## Changelog

### v0.1.0 (Current)
✅ Initial release with core features:
- GitHub authentication
- Repository listing with deadlines
- Commit history browsing
- Pre-push intelligence (metrics + secret detection)
- Minimalist Linear-inspired UI

---

## License

GitPilot is released under the **MIT License**. See [LICENSE](./LICENSE) file for details.

**Copyright © 2026 Wekraft**

---

**Last Updated**: 2026-02-01  
**Status**: ✅ Production Ready  
**Next Action**: Run `./publish.sh` or `vsce publish` to deploy
