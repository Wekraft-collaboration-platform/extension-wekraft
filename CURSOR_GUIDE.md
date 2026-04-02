# GitPilot for Cursor

GitPilot works seamlessly with **Cursor** — the AI-first code editor.

## Installation

### Option 1: Install from VS Code Marketplace (Easiest)

1. Open **Cursor**
2. Press `Ctrl+Shift+X` to open Extensions
3. Search for `gitpilot-bhanu`
4. Click **Install**

### Option 2: Install via Command Palette

1. Open Cursor
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type `Extensions: Install from VSIX`
4. Select the `gitpilot-bhanu-0.1.1.vsix` file from your downloads

## Features in Cursor

GitPilot brings **push intelligence and deadline tracking** to Cursor:

- 🔐 **Secret Detection**: Automatically scans for exposed API keys, tokens, and credentials before you push
- 📊 **Push Metrics**: Tracks lines added/removed and commit frequency
- 📅 **Deadline Reminders**: Monitor project deadlines and push urgency
- 🔗 **GitHub Integration**: View pull requests, commits, and team activity
- ⚠️ **Pre-Push Checks**: Validates code quality before attempting to push to GitHub

## Usage

### Activate the Sidebar

1. Open Cursor and look for the **GitPilot** icon in the Activity Bar (left sidebar)
2. Click to open the GitPilot sidebar view

### Login with GitHub

1. In GitPilot sidebar, click **Login with GitHub**
2. Authorize the app to access your GitHub account
3. GitPilot will fetch your repositories and recent activity

### Install Pre-Push Hook

1. Click **Install Pre-Push Hook** in the sidebar
2. GitPilot will automatically run checks before every `git push`
3. If secrets are detected, the push will be blocked with a warning

### View Push Intelligence

- **Commits**: See recent commits with deadline status
- **Metrics**: Lines added/removed since last commit
- **Secrets**: List of potential exposed credentials

## AI Integration

Since you're using Cursor with its AI capabilities, GitPilot **complements** Cursor's AI:

- GitPilot handles **push safety** (secrets, metrics)
- Cursor's AI helps with **code completion** and **generation**
- Together: **AI-assisted development with safety guardrails**

## Troubleshooting

### Extension not appearing?

- Make sure you have a folder open in Cursor (not a single file)
- Reload the window: `Ctrl+R` (or `Cmd+R` on Mac)

### GitHub login fails?

- Check your internet connection
- Try logging out and back in: `GitPilot: Logout` from Command Palette
- Verify your GitHub PAT has `read:user` and `user:email` scopes

### Pre-push hook not triggering?

- Ensure the workspace is a Git repository
- Run `GitPilot: Install Pre-Push Hook` again
- Check Git is properly initialized: `git status`

## Feedback & Support

- 🐛 Report bugs: https://github.com/Bhanu-partap-13/gitpilot-vscode/issues
- 💬 Feature requests: Discussions on GitHub
- 📧 Direct support: bhanu@wekraft.xyz

---

**Happy coding with GitPilot in Cursor! 🚀**
