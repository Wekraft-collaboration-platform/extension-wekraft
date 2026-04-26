# GitPilot — Tech Stack & Architecture

> **GitPilot: Push Intelligence** — an AI-native VS Code extension for deadline tracking, commit history, todo management, and pre-push secret scanning.

---

## Core Philosophy

| Principle | Implementation |
|---|---|
| **VS Code manages identity** | GitHub OAuth via `vscode.authentication` — no custom auth server |
| **Convex manages storage** | Cloud DB for users, deadlines, todos — no local SQLite, no native binaries |
| **In-memory cache for speed** | `Map<>` stores keep UI instant; write-through to Convex on change |
| **Offline resilience** | Local cache falls back gracefully when Convex is unreachable |
| **No native addons** | Zero compiled binaries — runs on any Node version VS Code uses |

---

## Tech Stack

### Extension Runtime

| Technology | Version | Purpose |
|---|---|---|
| **TypeScript** | `^5.5` | Type-safe extension code |
| **Node.js** | Bundled with VS Code | Extension host runtime |
| **VS Code API** | `^1.90.0` | Webview, auth, commands, globalState |
| **CommonJS** | — | Extension module format (required by VS Code) |

### Backend / Cloud

| Technology | Version | Purpose |
|---|---|---|
| **Convex** | `^1.0.0` | Real-time cloud database — users, deadlines, todos |
| **ConvexHttpClient** | — | HTTP-based queries/mutations from the extension host |
| **Convex Schema** | TypeScript-first | Type-safe table definitions with index declarations |

### Authentication

| Technology | Purpose |
|---|---|
| **VS Code `authentication` API** | Native GitHub OAuth — VS Code manages token lifecycle |
| **GitHub REST API v3** | Fetch user profile, repos, commits — no GraphQL needed |
| **VS Code `SecretStorage`** | Not used for tokens (VS Code's auth session handles it) |

### Frontend (Webview)

| Technology | Purpose |
|---|---|
| **HTML5 + Vanilla CSS** | Sidebar UI — no React/Vue to keep bundle size minimal |
| **VS Code CSS variables** | Automatic theme adaptation (dark/light/high-contrast) |
| **`acquireVsCodeApi()`** | Message bridge between webview iframe and extension host |
| **Content Security Policy** | Strict nonce-based CSP for all webview scripts |

### Git Integration

| Technology | Purpose |
|---|---|
| **`child_process.execSync`** | Run git CLI commands for diff stats and branch info |
| **Git pre-push hook** | Shell script → Node.js runtime for pre-push validation |
| **Regex-based secret scanner** | Detects OpenAI keys, GitHub tokens, AWS keys, Stripe secrets |

### Developer Tooling

| Tool | Version | Purpose |
|---|---|---|
| **TypeScript Compiler** | `^5.5` | Build: `tsc -p ./` |
| **dotenv** | `^16.6` | Load `.env.local` for `CONVEX_DEPLOYMENT_URL` |
| **Convex CLI** | `npx convex` | Deploy backend functions and generate types |

---

## Project Structure

```
extension/
├── convex/                     ← Convex backend (runs in Convex cloud)
│   ├── schema.ts               ← Table definitions (users, deadlines, todos)
│   ├── users.ts                ← registerOrGet, setPlan, getById
│   ├── deadlines.ts            ← upsert, remove, list, getForRepo
│   ├── todos.ts                ← create, updateStatus, remove, clearDone
│   └── tsconfig.json           ← Convex-specific TS config (ESNext + bundler)
│
├── src/                        ← Extension source (compiled to dist/)
│   ├── extension.ts            ← Entry point — lean, wires up features
│   │
│   ├── convex/                 ← Convex client layer
│   │   ├── client.ts           ← ConvexHttpClient singleton + initConvex()
│   │   └── api.ts              ← Typed wrappers: usersApi, deadlinesApi, todosApi
│   │
│   ├── features/               ← One folder per product feature
│   │   ├── auth/
│   │   │   └── githubAuth.ts   ← getExistingSession, signIn, fetchGitHubProfile
│   │   ├── deadlines/
│   │   │   └── deadlineManager.ts  ← In-memory cache + plan-limit enforcement
│   │   ├── todos/
│   │   │   └── todoManager.ts  ← Todo CRUD + cache + plan limits
│   │   ├── repos/
│   │   │   └── repoProvider.ts ← fetchUserRepos, fetchRepoCommits, fetchCommitDetail
│   │   └── git/
│   │       ├── gitUtils.ts     ← getCurrentBranch, getDiffNumStat, getAddedPatch
│   │       ├── secretScanner.ts← Regex-based secret detection in git diffs
│   │       ├── prePushCheck.ts ← Orchestrates git scan → PrePushReport
│   │       └── hookInstaller.ts← Writes .git/hooks/pre-push + runtime script
│   │
│   ├── shared/
│   │   └── types.ts            ← All shared types (ConvexUser, Deadline, Todo, etc.)
│   │
│   └── ui/
│       └── sidebar/
│           ├── sidebarProvider.ts  ← WebviewViewProvider — message handler
│           └── sidebarHtml.ts      ← Full HTML template (separated from logic)
│
├── media/
│   └── logo.svg                ← Extension icon (activity bar + webview)
│
├── docs/
│   ├── USER_FLOW.md            ← This file's companion — flow diagrams
│   └── TECH_STACK.md           ← This file
│
├── .env.local                  ← CONVEX_DEPLOYMENT_URL (gitignored)
├── .env.local.example          ← Template for contributors
├── tsconfig.json               ← Extension TypeScript config (rootDir: src)
└── package.json                ← Extension manifest
```

---

## Convex Database Schema

```
┌──────────────────────────────────────────────┐
│  users                                       │
│  ─────────────────────────────────────────── │
│  _id           Convex ID (primary key)       │
│  github_id     number   (indexed, unique)    │
│  github_login  string                        │
│  name          string                        │
│  email         string | null                 │
│  avatar_url    string                        │
│  plan          "free" | "pro"                │
│  created_at    number (epoch ms)             │
│  updated_at    number (epoch ms)             │
└──────────────────────────────────────────────┘
           │ 1
           │
           │ N
┌──────────────────────────────────────────────┐
│  deadlines                                   │
│  ─────────────────────────────────────────── │
│  _id            Convex ID                    │
│  user_id        → users._id  (indexed)       │
│  repo_full_name string  e.g. "bhanu/repo"   │
│  deadline_ts    number (epoch ms)            │
│  note           string? (optional)           │
│  created_at     number                       │
│  updated_at     number                       │
│                                              │
│  Indexes:                                    │
│    by_user          [user_id]                │
│    by_user_and_repo [user_id, repo_full_name]│
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│  todos                                       │
│  ─────────────────────────────────────────── │
│  _id            Convex ID                    │
│  user_id        → users._id  (indexed)       │
│  repo_full_name string                       │
│  title          string                       │
│  status         "open"|"in-progress"|"done"  │
│  priority       number  1 (low) – 5 (high)  │
│  created_at     number                       │
│  updated_at     number                       │
│                                              │
│  Indexes:                                    │
│    by_user          [user_id]                │
│    by_user_and_repo [user_id, repo_full_name]│
│    by_status        [user_id, status]        │
└──────────────────────────────────────────────┘
```

---

## Feature Limits by Plan

| Feature | Free | Pro |
|---|---|---|
| Deadline tracking | 3 repos | Unlimited |
| Todos per account | 10 | Unlimited |
| Repos shown | 30 (GitHub API default) | 30 |
| Commit history | Last 5 per repo | Last 5 per repo |
| Pre-push security scan | ✅ Unlimited | ✅ Unlimited |
| Secret detection | ✅ Always on | ✅ Always on |

> Plan is stored in the `users.plan` field in Convex. Upgrade via your backend dashboard or an admin webhook calling `users:setPlan`.

---

## Data Flow Summary

```
                    ┌─────────────────────────────────┐
                    │         GitHub OAuth             │
                    │  VS Code vscode.authentication   │
                    └──────────────┬──────────────────┘
                                   │ accessToken
                    ┌──────────────▼──────────────────┐
                    │         GitHub REST API          │
                    │   /user  /repos  /commits        │
                    └──────────────┬──────────────────┘
                                   │ profile + repo data
                    ┌──────────────▼──────────────────┐
                    │         Convex HTTP Client       │
                    │  users:registerOrGet             │
                    │  deadlines:list / upsert         │
                    │  todos:list / create / update    │
                    └──────────────┬──────────────────┘
                                   │ ConvexUser + Deadlines + Todos
                    ┌──────────────▼──────────────────┐
                    │      In-Memory Cache (Map)       │
                    │  deadlineManager  todoManager    │
                    └──────────────┬──────────────────┘
                                   │ instant reads
                    ┌──────────────▼──────────────────┐
                    │      Sidebar Webview HTML        │
                    │  VS Code theme variables         │
                    │  postMessage ↔ onDidReceiveMsg   │
                    └─────────────────────────────────┘
```

---

## Security Decisions

| Concern | Solution |
|---|---|
| GitHub token storage | Managed entirely by VS Code's built-in auth session — never stored in code |
| Convex URL exposure | In `.env.local` (gitignored) — the deployment URL is not secret but we keep it out of source |
| Webview XSS | Strict Content Security Policy (`nonce`-based scripts, no `unsafe-eval`) |
| Secret detection in commits | Regex patterns run locally via git CLI — nothing sent to cloud |
| Native binary vuln | Zero native addons — no NODE_MODULE_VERSION mismatch possible |
| Plan enforcement | Enforced client-side with server-side count queries available for server validation |
