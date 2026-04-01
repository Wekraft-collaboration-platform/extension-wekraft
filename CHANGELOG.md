# Changelog

All notable changes to the GitPilot extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned Features
- Entropy-based secret detection (beyond regex patterns)
- Commit search and filtering within repositories
- Multi-workspace support validation
- Error telemetry and analytics
- Extension settings UI (customize secret detection rules)

## [0.1.0] - 2026-02-01

### Added

#### Authentication & Onboarding
- GitHub-only authentication using VS Code's built-in provider
- Auto-login with session state persistence
- Smooth loading animation on extension startup (no login flash)
- Logout command with session state reset

#### Repository Management
- List authenticated user's repositories in sidebar
- View repository details including recent commit history
- Set project deadlines with datetime picker (date + time components)
- Dynamic deadline badges showing time remaining:
  - "< 2 days" for deadlines within 2 days
  - "< 12 hrs" for deadlines within 12 hours
  - "Overdue" for past deadlines
- Visual highlighting for deadline repos (green left border accent)
- Back navigation between views

#### Commit History & Details
- Browse last 5 commits per repository
- Click commits to view full details:
  - Author name and email
  - Commit timestamp
  - Full commit message
  - Complete file changeset with status indicators
  - Per-file line change statistics (+added, -removed)
- Open commits on GitHub for detailed review

#### Pre-Push Intelligence
- Git pre-push hook installation (`GitPilot: Install Pre-Push Hook`)
- Automatic line metrics calculation:
  - Total lines added on outgoing commits
  - Total lines removed on outgoing commits
  - Commits included in push range
- Generated `.gitpilot/last-prepush-report.json` after each push attempt
- Report includes timestamp, branch, commit range, and statistics

#### Secret Detection & Blocking
- Regex-based scanning for exposed API keys in outgoing commits:
  - OpenAI tokens (sk-*)
  - GitHub personal access tokens (ghp_*)
  - AWS access keys (AKIA*)
  - Stripe API keys (sk_live_*, sk_test_*)
  - Generic API key patterns
- Emergency push blocking when secrets detected
- `GITPILOT_ALLOW_PUSH=1` override for trusted commits
- Categorized secret hits with file, line number, and rule name

#### UI & UX
- Minimalist, Linear-inspired sidebar design
- VS Code native CSS variables for theme-aware styling
- Responsive webview supporting light, dark, and high-contrast themes
- One-click repository access from sidebar
- Intuitive datetime picker for deadline setting
- Clear visual indicators for deadline status

#### Commands
- `GitPilot: Login with GitHub` - Authenticate with GitHub
- `GitPilot: Logout` - Sign out and clear session
- `GitPilot: Install Pre-Push Hook` - Set up git pre-push safety checks
- `GitPilot: Run Pre-Push Check` - Manually execute pre-push analysis
- `GitPilot: Refresh Sidebar` - Force re-fetch repositories

#### Documentation
- Comprehensive README with feature overview and usage guide
- LICENSE file (MIT) for open-source distribution
- Pre-configured `package.json` for VS Code Marketplace
- Publishing guide (PUBLISHING.md)

### Technical Details
- **Language**: TypeScript (compiled to CommonJS ES2022)
- **Dependencies**: VS Code API, GitHub OAuth, Node.js builtins
- **Activation**: On VS Code startup (`onStartupFinished`)
- **VS Code Minimum Version**: 1.85.0

### Known Limitations
- Pre-push hook only works in directories with initialized git repositories
- Secret detection is regex-based (May produce false positives)
- Supports up to 5 most recent commits per repository in detail view
- GitHub API rate limits (60 requests/hour for unauthenticated, 5000 for authenticated)

---

## Release History

### v0.1.0 (Initial Release)
- First public release of GitPilot
- Core features: GitHub auth, repo browsing, deadline tracking, commit history, pre-push intelligence
- Marketplace publication ready
