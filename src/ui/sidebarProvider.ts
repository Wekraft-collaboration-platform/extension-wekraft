import * as vscode from "vscode";

export class GitPilotSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "gitpilot.sidebar";

  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly context: vscode.ExtensionContext
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.getHtml();

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {
        case "init":
          await this.checkAuth();
          break;
        case "login":
          await this.login();
          break;
        case "getRepos":
          await this.fetchRepos();
          break;
        case "getRepoDetail":
          await this.fetchRepoDetail(msg.repoFullName);
          break;
        case "setDeadline":
          await this.setDeadline(msg.repoFullName, msg.date);
          break;
        case "viewCommit":
          await this.fetchCommitDetail(msg.repoFullName, msg.sha);
          break;
        case "openUrl":
          vscode.env.openExternal(vscode.Uri.parse(msg.url));
          break;
        case "logout":
          await this.logout();
          break;
      }
    });
  }

  private async checkAuth() {
    this.view?.webview.postMessage({ type: "setLoading", loading: true });
    
    const isLoggedOut = this.context.globalState.get<boolean>("gitpilot_logged_out");
    if (isLoggedOut) {
      this.view?.webview.postMessage({ type: "setState", state: "login" });
      this.view?.webview.postMessage({ type: "setLoading", loading: false });
      return;
    }

    try {
      const session = await vscode.authentication.getSession("github", ["read:user", "repo"], { createIfNone: false });
      if (session) {
        this.view?.webview.postMessage({ type: "setState", state: "repos" });
        await this.fetchRepos();
      } else {
        this.view?.webview.postMessage({ type: "setState", state: "login" });
        this.view?.webview.postMessage({ type: "setLoading", loading: false });
      }
    } catch (e) {
      this.view?.webview.postMessage({ type: "setState", state: "login" });
      this.view?.webview.postMessage({ type: "setLoading", loading: false });
    }
  }

  private async login() {
    try {
      this.view?.webview.postMessage({ type: "setLoading", loading: true });
      const session = await vscode.authentication.getSession("github", ["read:user", "repo"], { createIfNone: true });
      if (session) {
        await this.context.globalState.update("gitpilot_logged_out", false);
        // Small delay to ensure state is persisted
        await new Promise(resolve => setTimeout(resolve, 200));
        this.view?.webview.postMessage({ type: "setState", state: "repos" });
        await this.fetchRepos();
      } else {
        vscode.window.showErrorMessage("GitHub authentication did not complete.");
        this.view?.webview.postMessage({ type: "setLoading", loading: false });
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      vscode.window.showErrorMessage(`GitHub login failed: ${errorMsg}`);
      this.view?.webview.postMessage({ type: "setLoading", loading: false });
    }
  }

  private async logout() {
    await this.context.globalState.update("gitpilot_logged_out", true);
    this.view?.webview.postMessage({ type: "setState", state: "login" });
    vscode.window.showInformationMessage("Disconnected from GitPilot (To sign out entirely, use the VS Code Accounts menu).");
  }

  private async fetchAPI(path: string) {
    const session = await vscode.authentication.getSession("github", ["read:user", "repo"], { createIfNone: false });
    if (!session) { 
      return null; 
    }
    
    try {
      const response = await fetch(`https://api.github.com${path}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "GitPilot-VSCode-Extension"
        }
      });
      if (!response.ok) {
        console.error(`GitHub API error: ${response.status} ${response.statusText}`);
        return null;
      }
      return await response.json();
    } catch (e) {
      console.error("GitPilot API fetch failed:", e);
      return null;
    }
  }

  private async fetchRepos() {
    this.view?.webview.postMessage({ type: "setLoading", loading: true });
    try {
      const data = await this.fetchAPI("/user/repos?sort=updated&per_page=20");
      if (data === null) {
        vscode.window.showErrorMessage("Failed to fetch repos. Check your GitHub connection.");
        this.view?.webview.postMessage({ type: "setLoading", loading: false });
        return;
      }
      const repos = Array.isArray(data) ? data : [];
      const reposWithDeadlines = repos.map(repo => {
        return {
          ...repo,
          deadline: this.context.globalState.get<string>(`deadline_${repo.full_name}`) || ""
        };
      });
      this.view?.webview.postMessage({ type: "renderRepos", repos: reposWithDeadlines });
    } catch (e) {
      vscode.window.showErrorMessage("Failed to fetch repos.");
    }
    this.view?.webview.postMessage({ type: "setLoading", loading: false });
  }

  private async fetchRepoDetail(repoFullName: string) {
    this.view?.webview.postMessage({ type: "setLoading", loading: true });
    try {
      const commits = await this.fetchAPI(`/repos/${repoFullName}/commits?per_page=5`);
      let stats = { additions: 0, deletions: 0, total: 0 };
      
      if (Array.isArray(commits) && commits.length > 0) {
        const lastCommit: any = await this.fetchAPI(`/repos/${repoFullName}/commits/${commits[0].sha}`);
        if (lastCommit && lastCommit.stats) {
          stats = lastCommit.stats;
        }
      }
      
      const deadline = this.context.globalState.get<string>(`deadline_${repoFullName}`) || "";

      this.view?.webview.postMessage({ 
        type: "renderDetail", 
        repoFullName, 
        commits: Array.isArray(commits) ? commits : [], 
        stats,
        deadline
      });
    } catch (e) {
      console.error("Failed to fetch repo details:", e);
      vscode.window.showErrorMessage("Failed to fetch repo details.");
    }
    this.view?.webview.postMessage({ type: "setLoading", loading: false });
  }

  private async fetchCommitDetail(repoFullName: string, sha: string) {
    this.view?.webview.postMessage({ type: "setLoading", loading: true });
    try {
      const commit: any = await this.fetchAPI(`/repos/${repoFullName}/commits/${sha}`);
      if (commit) {
        this.view?.webview.postMessage({
          type: "renderCommitDetail",
          commit: {
            sha: commit.sha,
            message: commit.commit.message || "(no message)",
            author: commit.commit.author.name || "Unknown",
            email: commit.commit.author.email || "",
            date: commit.commit.author.date || new Date().toISOString(),
            additions: commit.stats?.additions || 0,
            deletions: commit.stats?.deletions || 0,
            filesChanged: commit.files?.length || 0,
            files: (commit.files || []).slice(0, 20)
          }
        });
      } else {
        vscode.window.showErrorMessage("Failed to load commit details.");
      }
    } catch (e) {
      console.error("Failed to fetch commit details:", e);
      vscode.window.showErrorMessage("Failed to fetch commit details.");
    }
    this.view?.webview.postMessage({ type: "setLoading", loading: false });
  }

  private async setDeadline(repoFullName: string, date: string) {
    await this.context.globalState.update(`deadline_${repoFullName}`, date);
    vscode.window.showInformationMessage(`Deadline for ${repoFullName} set to ${date}`);
  }

  public refresh(): void {
    void this.checkAuth();
  }

  private getHtml(): string {
    const nonce = String(Date.now());
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<title>GitPilot</title>
<style>
  :root {
    --bg: var(--vscode-editor-background);
    --text: var(--vscode-editor-foreground);
    --border: var(--vscode-panel-border);
    --hover: var(--vscode-list-hoverBackground);
    --btn-bg: var(--vscode-button-background);
    --btn-fg: var(--vscode-button-foreground);
    --muted: var(--vscode-descriptionForeground);
    --input-bg: var(--vscode-input-background);
    --input-fg: var(--vscode-input-foreground);
    --input-border: var(--vscode-input-border);
  }
  body {
    font-family: var(--vscode-font-family);
    color: var(--text);
    background: transparent;
    padding: 0;
    margin: 0;
    font-size: 13px;
  }
  .view { display: none; height: 100vh; overflow-y: auto; }
  .view.active { display: block; }
  .center { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 20px; text-align: center; }
  .btn { background: var(--btn-bg); color: var(--btn-fg); border: none; padding: 6px 12px; cursor: pointer; border-radius: 2px; font-size: 12px; display: inline-block; transition: opacity 0.2s;}
  .btn:hover { opacity: 0.9; }
  .btn-block { width: 100%; display: block; box-sizing: border-box; }
  .list { list-style: none; padding: 0; margin: 0; }
  .list li { padding: 8px 12px; border-bottom: 1px solid var(--border); cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
  .list li:hover { background: var(--hover); }
  .list li.has-deadline { border-left: 3px solid var(--vscode-charts-green); background: rgba(35, 134, 54, 0.05); }
  .repo-name { font-weight: 500; font-size: 13px; display: flex; justify-content: space-between; align-items: center; }
  .deadline-badge { font-size: 10px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); padding: 2px 6px; border-radius: 10px; }
  .repo-desc { color: var(--muted); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .header { display: flex; align-items: center; padding: 10px 12px; border-bottom: 1px solid var(--border); font-weight: 600; background: var(--bg); position: sticky; top: 0; z-index: 10; }
  .back-btn { cursor: pointer; background: transparent; border: none; color: var(--text); margin-right: 8px; font-size: 14px; padding: 4px; display: flex; align-items: center; justify-content: center; border-radius: 4px; }
  .back-btn:hover { background: var(--hover); }
  .section { padding: 12px; border-bottom: 1px solid var(--border); }
  .section-title { font-size: 11px; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; letter-spacing: 0.5px; }
  .input-row { display: flex; gap: 8px; }
  input[type="datetime-local"] { background: var(--input-bg); color: var(--input-fg); border: 1px solid var(--input-border); padding: 5px; flex: 1; border-radius: 2px; font-family: inherit; font-size: 12px; }
  input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter: invert(0.8); cursor: pointer; }
  .commit { margin-bottom: 12px; padding: 8px; border-radius: 4px; border: 1px solid var(--border); cursor: pointer; transition: all 0.2s; }
  .commit:hover { background: var(--hover); }
  .commit-msg { font-size: 12px; margin-bottom: 2px; line-height: 1.4; font-weight: 500; }
  .commit-meta { color: var(--muted); font-size: 11px; }
  .stats { display: flex; gap: 12px; font-size: 12px; }
  .add { color: #238636; }
  .del { color: #da3633; }
  .file-change { font-size: 11px; margin-bottom: 8px; padding: 6px; background: rgba(255,255,255,0.02); border-radius: 4px; border-left: 2px solid var(--muted); }
  .file-change.added { border-left-color: #238636; }
  .file-change.modified { border-left-color: #0969da; }
  .file-change.deleted { border-left-color: #da3633; }
  .file-name { font-weight: 500; word-break: break-word; }
  .file-stats { color: var(--muted); font-size: 10px; margin-top: 3px; }
  .loader { padding: 12px; text-align: center; color: var(--muted); display: none; font-size: 12px; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: var(--bg); z-index: 20; margin: 0; }
  .loader.active { display: flex; align-items: center; justify-content: center; }
</style>
</head>
<body>
  <div id="loader" class="loader active">Loading...</div>

  <div id="view-login" class="view center">
    <div style="margin-bottom: 16px; font-size: 14px; font-weight: 500;">GitPilot Login</div>
    <div style="margin-bottom: 24px; color: var(--muted); font-size: 12px;">Authenticate with GitHub to track your projects and history in your workspace.</div>
    <button class="btn btn-block" id="login-btn">Login with GitHub</button>
  </div>

  <div id="view-repos" class="view">
    <div class="header">
      <span style="flex: 1;">Your Repositories</span>
      <button class="btn" style="padding: 4px 8px; font-size: 11px; background: transparent; border: 1px solid var(--border);" id="logout-btn">Logout</button>
    </div>
    <ul class="list" id="repo-list"></ul>
  </div>

  <div id="view-detail" class="view">
    <div class="header">
      <button class="back-btn" id="back-btn" title="Back">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.53 2.97a.75.75 0 010 1.06L6.56 8l3.97 3.97a.75.75 0 11-1.06 1.06l-4.5-4.5a.75.75 0 010-1.06l4.5-4.5a.75.75 0 011.06 0z"/></svg>
      </button>
      <span id="detail-name">Repository</span>
    </div>
    
    <div class="section">
      <div class="section-title">Project Deadline</div>
      <div class="input-row">
        <input type="datetime-local" id="deadline-input">
        <button class="btn" id="save-deadline">Save</button>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Commit Size Metrics</div>
      <div class="stats" id="last-commit-stats">
        <span style="color: var(--muted);">Loading latest stat...</span>
      </div>
    </div>

    <div class="section" style="border: none;">
      <div class="section-title">Recent History</div>
      <div id="commit-list" style="color: var(--muted); font-size: 12px;">Fetching...</div>
    </div>
  </div>

  <div id="view-commit" class="view">
    <div class="header">
      <button class="back-btn" id="back-commit-btn" title="Back">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.53 2.97a.75.75 0 010 1.06L6.56 8l3.97 3.97a.75.75 0 11-1.06 1.06l-4.5-4.5a.75.75 0 010-1.06l4.5-4.5a.75.75 0 011.06 0z"/></svg>
      </button>
      <span id="commit-header">Commit</span>
    </div>

    <div class="section">
      <div class="section-title">Commit Info</div>
      <div style="font-size: 11px; color: var(--muted);">
        <div style="margin-bottom: 8px;">
          <strong>Author:</strong> <span id="commit-author"></span>
        </div>
        <div style="margin-bottom: 8px;">
          <strong>Date:</strong> <span id="commit-date"></span>
        </div>
        <div style="word-break: break-word;">
          <strong>SHA:</strong> <span id="commit-sha" style="font-family: monospace; font-size: 10px;"></span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Commit Message</div>
      <div id="commit-message" style="font-size: 12px; line-height: 1.5; white-space: pre-wrap; word-break: break-word;"></div>
    </div>

    <div class="section">
      <div class="section-title">Changes</div>
      <div style="display: flex; gap: 12px; font-size: 12px; margin-bottom: 12px;">
        <span><strong id="commit-files">0</strong> files</span>
        <span class="add">+<span id="commit-additions">0</span></span>
        <span class="del">-<span id="commit-deletions">0</span></span>
      </div>
      <div id="commit-files-list"></div>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let currentRepo = "";

    function showView(id) {
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById(id).classList.add('active');
    }

    document.getElementById('login-btn').addEventListener('click', () => {
      vscode.postMessage({ type: 'login' });
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
      vscode.postMessage({ type: 'logout' });
    });

    document.getElementById('back-btn').addEventListener('click', () => {
      showView('view-repos');
      document.getElementById('loader').classList.remove('active');
      vscode.postMessage({ type: 'getRepos' });
    });

    document.getElementById('back-commit-btn').addEventListener('click', () => {
      showView('view-detail');
      vscode.postMessage({ type: 'getRepoDetail', repoFullName: currentRepo });
    });

    document.getElementById('save-deadline').addEventListener('click', () => {
      const date = document.getElementById('deadline-input').value;
      vscode.postMessage({ type: 'setDeadline', repoFullName: currentRepo, date });
    });

    window.addEventListener('message', event => {
      const msg = event.data;
      
      if (msg.type === 'setState') {
        showView('view-' + msg.state);
        document.getElementById('loader').classList.remove('active');
      }
      
      if (msg.type === 'setLoading') {
        if (msg.loading) {
          document.getElementById('loader').classList.add('active');
        } else {
          document.getElementById('loader').classList.remove('active');
        }
      }
      
      if (msg.type === 'renderRepos') {
        const list = document.getElementById('repo-list');
        list.innerHTML = '';
        if (!msg.repos || msg.repos.length === 0) {
          list.innerHTML = '<li style="text-align: center; color: var(--muted); border: none;">No recent repositories found</li>';
          return;
        }
        msg.repos.forEach(repo => {
          const li = document.createElement('li');
          const description = repo.description || 'No description';
          
          let deadlineHtml = '';
          if (repo.deadline) {
            li.classList.add('has-deadline');
            const dl = new Date(repo.deadline);
            const diff = dl - new Date();
            let dlText = "";
            if (diff < 0) {
              dlText = "Overdue";
            } else {
              const days = Math.floor(diff / (1000 * 60 * 60 * 24));
              const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              if (days > 0) {
                dlText = \`< \${days} day\${days !== 1 ? 's' : ''}\`;
              } else {
                dlText = \`< \${hours + 1} hr\${hours > 0 ? 's' : ''}\`;
              }
            }
            deadlineHtml = \`<span class="deadline-badge">\${dlText}</span>\`;
          }

          li.innerHTML = \`
            <div class="repo-name"><span>\${repo.name}</span> \${deadlineHtml}</div>
            <div class="repo-desc">\${description}</div>
          \`;
          li.addEventListener('click', () => {
            currentRepo = repo.full_name;
            showView('view-detail');
            document.getElementById('detail-name').innerText = repo.name;
            document.getElementById('commit-list').innerHTML = 'Loading commits...';
            document.getElementById('last-commit-stats').innerHTML = '<span style="color: var(--muted);">Loading stats...</span>';
            document.getElementById('deadline-input').value = '';
            vscode.postMessage({ type: 'getRepoDetail', repoFullName: repo.full_name });
          });
          list.appendChild(li);
        });
      }
      
      if (msg.type === 'renderDetail') {
        document.getElementById('deadline-input').value = msg.deadline || '';
        
        const stats = document.getElementById('last-commit-stats');
        stats.innerHTML = \`
          <span><strong>Total: \${msg.stats.total}</strong></span>
          <span class="add">+\${msg.stats.additions}</span>
          <span class="del">-\${msg.stats.deletions}</span>
        \`;

        const commitListHtml = document.getElementById('commit-list');
        if (!msg.commits || msg.commits.length === 0) {
          commitListHtml.innerHTML = 'No commits found.';
        } else {
          commitListHtml.innerHTML = msg.commits.map(c => {
            const dateStr = new Date(c.commit.author.date).toLocaleDateString();
            const msgLine = c.commit.message.split('\\n')[0];
            return \`
              <div class="commit" data-commit-sha="\${c.sha}">
                <div class="commit-msg">\${msgLine}</div>
                <div class="commit-meta">\${dateStr} &bull; \${c.commit.author.name}</div>
              </div>
            \`;
          }).join('');
          // Attach event listeners to commit elements
          document.querySelectorAll('.commit').forEach(el => {
            el.addEventListener('click', () => {
              const sha = el.dataset.commitSha;
              vscode.postMessage({ type: 'viewCommit', repoFullName: currentRepo, sha: sha });
              showView('view-commit');
            });
          });
        }
      }

      if (msg.type === 'renderCommitDetail') {
        const c = msg.commit;
        document.getElementById('commit-header').innerText = c.message.split('\\n')[0];
        document.getElementById('commit-author').innerText = c.author + (c.email ? \` <\${c.email}>\` : '');
        document.getElementById('commit-date').innerText = new Date(c.date).toLocaleString();
        document.getElementById('commit-sha').innerText = c.sha.substring(0, 7);
        document.getElementById('commit-message').innerText = c.message;
        document.getElementById('commit-files').innerText = c.filesChanged;
        document.getElementById('commit-additions').innerText = c.additions;
        document.getElementById('commit-deletions').innerText = c.deletions;

        const filesList = document.getElementById('commit-files-list');
        if (c.files && c.files.length > 0) {
          filesList.innerHTML = c.files.map(f => {
            const status = f.status === 'added' ? 'added' : f.status === 'removed' ? 'deleted' : 'modified';
            return \`
              <div class="file-change \${status}">
                <div class="file-name">\${f.filename}</div>
                <div class="file-stats">Status: \${f.status} &bull; +\${f.additions} -\${f.deletions}</div>
              </div>
            \`;
          }).join('');
        } else {
          filesList.innerHTML = '<div style="color: var(--muted); font-size: 11px;">No file changes available</div>';
        }
      }
    });

    vscode.postMessage({ type: 'init' });
  </script>
</body>
</html>`;
  }
}
