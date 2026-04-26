/**
 * ui/sidebar/sidebarProvider.ts
 *
 * The GitPilot sidebar webview.
 *
 * Auth flow (all inside the webview message handler):
 *  init  → checkExistingAuth() → if session exists: load repos + deadlines
 *  login → performSignIn()     → VS Code GitHub popup → register in Convex → load data
 *  logout → signOut()          → clear all local state
 *
 * Data flow:
 *  Repos/commits   → GitHub API  (repoProvider)
 *  Deadlines       → Convex      (deadlineManager)
 *  Todos           → Convex      (todoManager)
 */

import * as vscode from "vscode";
import { fetchGitHubApi } from "../../features/auth/githubAuth";
import {
  checkExistingAuthState,
  performLogin,
  performLogout,
  wasAuthenticatedLastSession,
} from "../../features/auth/authManager";
import {
  initDeadlines,
  clearDeadlines,
  getDeadline,
  setDeadline,
  removeDeadline,
  getDeadlineCount,
  canAddDeadline,
} from "../../features/deadlines/deadlineManager";
import {
  initTodos,
  clearTodos,
  getTodos,
  getPersonalTodos,
  createTodo,
  createPersonalTodo,
  updateTodoStatus,
  updateTodoDescription,
  removeTodo,
  PERSONAL_KEY,
} from "../../features/todos/todoManager";
import {
  deleteLocalCommit,
  detectLocalRepoFullName,
} from "../../features/git/commitManager";
import {
  fetchUserRepos,
  fetchRepoCommits,
  fetchCommitDetail,
  fetchLastCommitStats,
} from "../../features/repos/repoProvider";
import { ConvexUser, GitHubProfile, PLAN_LIMITS } from "../../shared/types";
import { getSidebarHtml } from "./sidebarHtml";

export class GitPilotSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "gitpilot.sidebar";

  private view?: vscode.WebviewView;
  private currentToken: string | null   = null;
  private currentUser: ConvexUser | null = null;
  private currentProfile: GitHubProfile | null = null;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly context: vscode.ExtensionContext
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // WebviewViewProvider
  // ─────────────────────────────────────────────────────────────────────────

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;

    const logoUri   = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "logo.svg")
    );
    const cspSource = webviewView.webview.cspSource;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")],
    };
    webviewView.webview.html = getSidebarHtml(logoUri, cspSource);

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {
        case "init":              await this.handleInit(); break;
        case "login":             await this.handleLogin(); break;
        case "logout":            await this.handleLogout(); break;
        case "getRepos":          await this.handleGetRepos(); break;
        case "getRepoDetail":     await this.handleGetRepoDetail(msg.repoFullName); break;
        case "viewCommit":        await this.handleViewCommit(msg.repoFullName, msg.sha); break;
        case "setDeadline":       await this.handleSetDeadline(msg.repoFullName, msg.date); break;
        case "removeDeadline":    await this.handleRemoveDeadline(msg.repoFullName); break;
        // repo todos
        case "createTodo":              await this.handleCreateTodo(msg.repoFullName, msg.title, msg.priority); break;
        case "updateTodo":              await this.handleUpdateTodo(msg.repoFullName, msg.todoId, msg.status); break;
        case "removeTodo":              await this.handleRemoveTodo(msg.repoFullName, msg.todoId); break;
        // standalone task tracker
        case "getTasks":                await this.handleGetTasks(); break;
        case "createTask":              await this.handleCreateTask(msg.title, msg.priority, msg.description); break;
        case "updateTaskStatus":        await this.handleUpdateTaskStatus(msg.todoId, msg.status); break;
        case "updateTaskDescription":   await this.handleUpdateTaskDescription(msg.todoId, msg.description); break;
        case "deleteTask":              await this.handleDeleteTask(msg.todoId); break;
        case "clearDoneTasks":          await this.handleClearDoneTasks(); break;
        // commit management
        case "deleteCommit":            await this.handleDeleteCommit(msg.repoFullName, msg.sha, msg.message); break;
        case "openUrl":                 vscode.env.openExternal(vscode.Uri.parse(msg.url)); break;
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Auth handlers
  // ─────────────────────────────────────────────────────────────────────────

  private async handleInit(): Promise<void> {
    this.post({ type: "setLoading", loading: true });

    // If the user was previously authenticated, send a hint to the webview
    // so it can show the loader (not the login page) while we verify.
    // This prevents the login page from briefly appearing on every re-open.
    const wasAuth = wasAuthenticatedLastSession(this.context);
    if (wasAuth) {
      this.post({ type: "setInitialState", authenticated: true });
    }

    const auth = await checkExistingAuthState(this.context);
    if (!auth) {
      // Only now is it safe to show the login page.
      this.post({ type: "setState", state: "login" });
      this.post({ type: "setLoading", loading: false });
      return;
    }

    await this.onAuthenticated(auth.session.accessToken, auth.profile, auth.convexUser);
  }

  private async handleLogin(): Promise<void> {
    this.post({ type: "setLoading", loading: true });

    const auth = await performLogin(this.context);
    if (!auth) {
      // User cancelled the OAuth popup — stay on login page.
      // Note: we do NOT show an error if auth is null without an exception
      // because the user may have simply dismissed the dialog.
      this.post({ type: "setState", state: "login" });
      this.post({ type: "setLoading", loading: false });
      return;
    }

    await this.onAuthenticated(auth.session.accessToken, auth.profile, auth.convexUser);
  }

  private async handleLogout(): Promise<void> {
    await performLogout(this.context);
    this.currentToken   = null;
    this.currentUser    = null;
    this.currentProfile = null;
    clearDeadlines();
    clearTodos();
    this.post({ type: "setState", state: "login" });
    vscode.window.showInformationMessage(
      "Signed out of GitPilot. (To fully revoke access, use VS Code Accounts menu.)"
    );
  }

  /** Called after successful auth — initialises all features and loads repos. */
  private async onAuthenticated(
    token: string,
    profile: GitHubProfile,
    convexUser: ConvexUser | null
  ): Promise<void> {
    this.currentToken   = token;
    this.currentProfile = profile;
    this.currentUser    = convexUser;

    // Init feature modules — non-fatal: Convex errors must not block the UI
    if (convexUser) {
      try {
        await initDeadlines(convexUser);
      } catch (e) {
        console.warn("GitPilot: initDeadlines failed (Convex may be offline)", e);
      }
      try {
        initTodos(convexUser);
      } catch (e) {
        console.warn("GitPilot: initTodos failed", e);
      }
    }

    // Send user info & switch to repos view — this MUST always happen
    this.post({
      type:       "setUser",
      name:       profile.name ?? profile.login,
      login:      profile.login,
      avatar:     profile.avatar_url,
      plan:       convexUser?.plan ?? "free",
      deadlineLimit: PLAN_LIMITS[convexUser?.plan ?? "free"].deadlines,
      todoLimit:     PLAN_LIMITS[convexUser?.plan ?? "free"].todos,
      deadlineCount: getDeadlineCount(),
    });

    this.post({ type: "setState", state: "repos" });
    await this.handleGetRepos();
  }


  // ─────────────────────────────────────────────────────────────────────────
  // Repo handlers
  // ─────────────────────────────────────────────────────────────────────────

  private async handleGetRepos(): Promise<void> {
    if (!this.currentToken) { this.post({ type: "setLoading", loading: false }); return; }
    this.post({ type: "setLoading", loading: true });
    try {
      const repos    = await fetchUserRepos(this.currentToken);
      const enriched = repos.map((r) => {
        const d = getDeadline(r.full_name);
        return { ...r, deadline: d?.deadline_ts ?? null };
      });
      this.post({ type: "renderRepos", repos: enriched });
    } catch (e) {
      console.error("GitPilot: fetchUserRepos failed", e);
      this.post({ type: "renderRepos", repos: [] });
    } finally {
      this.post({ type: "setLoading", loading: false });
    }
  }

  private async handleGetRepoDetail(repoFullName: string): Promise<void> {
    if (!this.currentToken) return;
    this.post({ type: "setLoading", loading: true });

    const [commits, stats, todos] = await Promise.all([
      fetchRepoCommits(this.currentToken, repoFullName, 5),
      fetchLastCommitStats(this.currentToken, repoFullName),
      this.currentUser ? getTodos(repoFullName) : [],
    ]);

    const deadline = getDeadline(repoFullName);

    this.post({
      type: "renderDetail",
      repoFullName,
      commits,
      stats,
      deadline:    deadline?.deadline_ts ?? null,
      todos,
      canAddTodo:  this.currentUser ? canAddDeadline().allowed : false,
    });
    this.post({ type: "setLoading", loading: false });
  }

  private async handleViewCommit(repoFullName: string, sha: string): Promise<void> {
    if (!this.currentToken) return;
    this.post({ type: "setLoading", loading: true });

    const commit = await fetchCommitDetail(this.currentToken, repoFullName, sha);
    if (commit) {
      this.post({
        type:    "renderCommitDetail",
        commit: {
          sha:          commit.sha,
          message:      commit.commit.message,
          author:       commit.commit.author.name,
          email:        commit.commit.author.email,
          date:         commit.commit.author.date,
          additions:    commit.stats?.additions ?? 0,
          deletions:    commit.stats?.deletions ?? 0,
          filesChanged: commit.files?.length ?? 0,
          files:        (commit.files ?? []).slice(0, 20),
        },
      });
    }
    this.post({ type: "setLoading", loading: false });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Deadline handlers
  // ─────────────────────────────────────────────────────────────────────────

  private async handleSetDeadline(repoFullName: string, dateStr: string): Promise<void> {
    if (!this.currentUser) {
      vscode.window.showErrorMessage("Sign in to save deadlines.");
      return;
    }
    const ts = new Date(dateStr).getTime();
    
    if (ts < Date.now()) {
      vscode.window.showErrorMessage("GitPilot: Deadlines must be set in the future.");
      return;
    }

    const result = await setDeadline(repoFullName, ts);

    if (!result.ok) {
      vscode.window.showWarningMessage(`GitPilot: ${result.reason}`);
      return;
    }
    vscode.window.showInformationMessage(`✅ Deadline saved for ${repoFullName}`);
    this.post({ type: "deadlineUpdated", repoFullName, deadline_ts: ts, deadlineCount: getDeadlineCount() });
  }

  private async handleRemoveDeadline(repoFullName: string): Promise<void> {
    await removeDeadline(repoFullName);
    this.post({ type: "deadlineRemoved", repoFullName, deadlineCount: getDeadlineCount() });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Todo handlers
  // ─────────────────────────────────────────────────────────────────────────

  private async handleGetTodos(repoFullName: string): Promise<void> {
    if (!this.currentUser) return;
    const todos = await getTodos(repoFullName);
    this.post({ type: "renderTodos", repoFullName, todos });
  }

  private async handleCreateTodo(
    repoFullName: string,
    title: string,
    priority: "low" | "medium" | "high" | "critical" = "medium"
  ): Promise<void> {
    if (!this.currentUser) { vscode.window.showErrorMessage("Sign in to create todos."); return; }

    const result = await createTodo(repoFullName, title, priority);
    if (!result.ok) {
      vscode.window.showWarningMessage(`GitPilot: ${result.reason}`);
      return;
    }
    const todos = await getTodos(repoFullName);
    this.post({ type: "renderTodos", repoFullName, todos });
  }

  private async handleUpdateTodo(
    repoFullName: string,
    todoId: string,
    status: "todo" | "in_progress" | "done"
  ): Promise<void> {
    await updateTodoStatus(repoFullName, todoId, status);
    const todos = await getTodos(repoFullName);
    this.post({ type: "renderTodos", repoFullName, todos });
  }

  private async handleRemoveTodo(repoFullName: string, todoId: string): Promise<void> {
    const pick = await vscode.window.showWarningMessage(
      "Delete this repo task? This cannot be undone.",
      { modal: true },
      "Delete"
    );
    if (pick !== "Delete") return;

    await removeTodo(repoFullName, todoId);
    const todos = await getTodos(repoFullName);
    this.post({ type: "renderTodos", repoFullName, todos });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Standalone Task Tracker handlers
  // ─────────────────────────────────────────────────────────────────────────

  private async handleGetTasks(): Promise<void> {
    const tasks = await getPersonalTodos();
    this.post({ type: "renderTasks", tasks });
  }

  private async handleCreateTask(
    title: string,
    priority: "low" | "medium" | "high" | "critical" = "medium",
    description?: string,
  ): Promise<void> {
    if (!this.currentUser) { vscode.window.showErrorMessage("Sign in to create tasks."); return; }
    const result = await createPersonalTodo(title, priority, description);
    if (!result.ok) {
      vscode.window.showWarningMessage(`GitPilot: ${result.reason}`);
      return;
    }
    const tasks = await getPersonalTodos();
    this.post({ type: "renderTasks", tasks });
  }

  private async handleUpdateTaskStatus(
    todoId: string,
    status: "todo" | "in_progress" | "done"
  ): Promise<void> {
    await updateTodoStatus(PERSONAL_KEY, todoId, status);
    const tasks = await getPersonalTodos();
    this.post({ type: "renderTasks", tasks });
  }

  private async handleUpdateTaskDescription(
    todoId: string,
    description: string | undefined,
  ): Promise<void> {
    await updateTodoDescription(PERSONAL_KEY, todoId, description || undefined);
    const tasks = await getPersonalTodos();
    this.post({ type: "renderTasks", tasks });
  }

  private async handleDeleteTask(todoId: string): Promise<void> {
    const pick = await vscode.window.showWarningMessage(
      "Delete this task? This cannot be undone.",
      { modal: true },
      "Delete"
    );
    if (pick !== "Delete") return;
    await removeTodo(PERSONAL_KEY, todoId);
    const tasks = await getPersonalTodos();
    this.post({ type: "renderTasks", tasks });
  }

  private async handleClearDoneTasks(): Promise<void> {
    const tasks = await getPersonalTodos();
    const done = tasks.filter(t => t.status === "done");
    if (!done.length) {
      vscode.window.showInformationMessage("No completed tasks to clear.");
      return;
    }
    const pick = await vscode.window.showWarningMessage(
      `Clear ${done.length} completed task${done.length !== 1 ? "s" : ""}?`,
      { modal: true },
      "Clear"
    );
    if (pick !== "Clear") return;
    for (const t of done) {
      await removeTodo(PERSONAL_KEY, t._id);
    }
    const updated = await getPersonalTodos();
    this.post({ type: "renderTasks", tasks: updated });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Commit management handlers
  // ─────────────────────────────────────────────────────────────────────────

  private async handleDeleteCommit(
    repoFullName: string,
    sha: string,
    commitMessage: string,
  ): Promise<void> {
    // Find a workspace folder whose git remote matches repoFullName
    const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
    let matchedPath: string | undefined;

    for (const folder of workspaceFolders) {
      const detected = await detectLocalRepoFullName(folder.uri.fsPath);
      if (detected && detected.toLowerCase() === repoFullName.toLowerCase()) {
        matchedPath = folder.uri.fsPath;
        break;
      }
    }

    if (!matchedPath) {
      vscode.window.showErrorMessage(
        `GitPilot: Could not find a local clone of '${repoFullName}' in your workspace. ` +
        `Open the repo folder in VS Code to delete commits from history.`
      );
      return;
    }

    // Confirmation dialog
    const shortSha = sha.slice(0, 7);
    const shortMsg = commitMessage.split("\n")[0].slice(0, 60);
    const pick = await vscode.window.showWarningMessage(
      `Delete commit ${shortSha}?\n"${shortMsg}"\n\n⚠️ This rewrites local git history. You will need to force-push afterward.`,
      { modal: true },
      "Delete Commit"
    );
    if (pick !== "Delete Commit") return;

    // Run the rebase
    this.post({ type: "setLoading", loading: true });
    const result = await deleteLocalCommit(matchedPath, sha);
    this.post({ type: "setLoading", loading: false });

    if (!result.ok) {
      vscode.window.showErrorMessage(`GitPilot: ${result.reason}`);
      return;
    }

    // Show success with force-push hint
    const action = await vscode.window.showInformationMessage(
      result.message,
      "Copy force-push command"
    );
    if (action === "Copy force-push command") {
      await vscode.env.clipboard.writeText("git push --force-with-lease");
      vscode.window.showInformationMessage("Copied: git push --force-with-lease");
    }

    // Reload repo detail to reflect updated commits
    await this.handleGetRepoDetail(repoFullName);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  public refresh(): void {
    void this.handleInit();
  }

  /** Called from extension.ts createTodo command */
  public async handleCreateTodoCommand(title: string): Promise<void> {
    const repos  = this.currentProfile ? await fetchUserRepos(this.currentToken!) : [];
    const first  = repos[0]?.full_name;
    if (!first) { vscode.window.showErrorMessage("Open a repo first."); return; }
    await this.handleCreateTodo(first, title);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private post(message: Record<string, unknown>): void {
    this.view?.webview.postMessage(message);
  }
}
