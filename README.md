# GitPilot - Wekraft for VS Code

GitPilot is an **AI-native VS Code extension** that brings intelligent project collaboration and shipping velocity to your workspace. Authenticate with GitHub, track repositories, set project deadlines, and monitor commit history—all without leaving your editor.

## Features

### 🚀 GitHub-Native Integration
- **GitHub-only authentication** for seamless workspace access
- Direct connection to your GitHub repositories
- Real-time repository data syncing

### 📊 Push Intelligence & Metrics
- **Line-level tracking**: See total lines added/removed on every push
- **Pre-push secret detection**: Automatic scanning for exposed API keys with emergency alerts
- **Block-and-override** safety: Prevents accidental credential commits

### 🎯 Project Deadline Management
- Set **project deadlines with hourly precision** (datetime picker)
- **Visual highlights** for repos with approaching deadlines
- **Dynamic time badges**: Shows "< 2 days", "< 12 hrs", or "Overdue" status
- Green accent highlight for quick identification

### 📜 Rich Commit History
- Browse **recent commits** in the sidebar
- **Click any commit** to see full details:
  - Author and timestamp
  - Complete commit message
  - All changed files with status (added/modified/deleted)
  - Per-file line change statistics
- Open commits directly on GitHub for detailed review

### 💼 Minimalist Linear-Inspired UI
- **Sidebar-first workflow**: Full-height repository panel
- **Zero bloat design**: Compact, scannable interface using VS Code native styling
- **Smooth transitions**: Progressive disclosure of commit details
- **Dark-mode optimized**: Respects your VS Code theme

## How to Use

### 1. Log In
1. Open GitPilot sidebar (look for the GitPilot icon in the activity bar)
2. Click **"Login with GitHub"**
3. Authorize the extension to access your repositories and public profile
4. Your repositories load automatically

### 2. Explore Repositories
- Browse your recent repositories listed one after another
- Repos with deadlines show a green accent and time-remaining badge
- Click any repository to see details

### 3. Set Project Deadlines
1. In the repository detail view, find **"Project Deadline"**
2. Click the datetime picker and set your target completion date and time
3. Click **"Save"**
4. The repo card updates with a deadline badge showing time remaining

### 4. View Commit History
1. Scroll to **"Recent History"** in the repo detail view
2. Click any commit to open the full commit detail panel
3. View:
   - Author name and email
   - Exact commit timestamp
   - Full commit message
   - Complete file changeset with per-file statistics

### 5. Pre-Push Safety (Advanced)
1. GitPilot can install a **git pre-push hook** that:
   - Calculates total lines added/removed
   - Scans for exposed API keys (OpenAI, GitHub tokens, AWS keys, etc.)
   - Blocks the push if secrets are detected
   - Allows override with `GITPILOT_ALLOW_PUSH=1` environment variable

## System Requirements

- **VS Code**: 1.85.0 or later
- **Node.js**: 16.0.0 or later (included with VS Code)
- **Git**: 2.0.0 or later (for pre-push hook features)
- **GitHub Account**: Required for authentication

## Privacy & Security

- GitPilot uses **GitHub's OAuth 2.0** for authentication—we never store your credentials
- All API calls go directly to GitHub's REST API
- Commit data is cached locally in your VS Code global state
- Pre-push secret scanning runs locally on your machine
- No telemetry or tracking (except what VS Code reports)

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open GitPilot | Click GitPilot icon in activity bar |
| Go back | Click back arrow (← icon) |
| Navigate commits | Click commit row to expand |

## Commands

| Command | Description |
|---------|-------------|
| `GitPilot: Login with GitHub` | Authenticate with GitHub |
| `GitPilot: Logout` | Disconnect from GitPilot |
| `GitPilot: Install Pre-Push Hook` | Set up local git safety checks |
| `GitPilot: Run Pre-Push Check` | Manually scan outgoing commits |
| `GitPilot: Refresh Sidebar` | Force reload repositories |

## Troubleshooting

### Login page appears after session initialization
- **Cause**: GitHub session not cached
- **Fix**: Close and reopen the sidebar, or restart VS Code

### Commits not loading
- **Cause**: GitHub API rate limiting (60 requests/hour unauthenticated)
- **Fix**: Ensure you're logged in with GitHub account

### Pre-push hook not running
- **Cause**: Git hook not installed
- **Fix**: Run `GitPilot: Install Pre-Push Hook` command

### Secret detection shows false positives
- **Cause**: Heuristic pattern matching can flag non-secret strings
- **Fix**: Use `GITPILOT_ALLOW_PUSH=1` to override for trusted commits, then rotate any actual exposed keys

## Support & Feedback

- 🐛 **Report bugs**: Open an issue on [GitHub](https://github.com/wekraft/gitpilot-vscode/issues)
- 💡 **Feature requests**: Suggest ideas or vote on existing requests
- 📧 **Contact**: Visit [Wekraft](https://wekraft.xyz) for more info

## Credits

**GitPilot** is built by the **Wekraft** team for shipping faster, safer, and together.

## License

MIT License – See LICENSE file for details

