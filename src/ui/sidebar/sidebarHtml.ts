/**
 * ui/sidebar/sidebarHtml.ts — Webview HTML for GitPilot sidebar.
 * 
 * Views:
 *  login   → sign-in screen (unauth)
 *  repos   → repo list with deadline badges        ┐
 *  tasks   → standalone Notion-like todo tracker   ├ bottom-nav visible
 *  detail  → repo commits + deadline + repo todos  │
 *  commit  → single commit diff view               ┘
 */

import * as vscode from "vscode";

export function getSidebarHtml(logoUri: vscode.Uri, cspSource: string): string {
  const nonce = `${Date.now()}${Math.random().toString(36).slice(2)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none'; img-src ${cspSource} https://avatars.githubusercontent.com data:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<title>GitPilot</title>
<style>
/* ── Reset & Base ─────────────────────────────────────────────────────────── */
:root {
  --bg:       var(--vscode-editor-background);
  --text:     var(--vscode-editor-foreground);
  --border:   var(--vscode-panel-border);
  --hover:    var(--vscode-list-hoverBackground);
  --btn-bg:   var(--vscode-button-background);
  --btn-fg:   var(--vscode-button-foreground);
  --muted:    var(--vscode-descriptionForeground);
  --inp-bg:   var(--vscode-input-background);
  --inp-fg:   var(--vscode-input-foreground);
  --inp-bd:   var(--vscode-input-border);
  --green:    #22c55e;
  --red:      #ef4444;
  --orange:   #f59e0b;
  --blue:     #3b82f6;
  --purple:   #8b5cf6;
  --nav-h:    48px;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--vscode-font-family);
  font-size:   13px;
  color:       var(--text);
  background:  transparent;
}

/* ── Views ───────────────────────────────────────────────────────────────── */
.view { display: none; }
.view.active { display: block; }
/* views that sit above the bottom-nav need padding-bottom */
#view-repos, #view-tasks { padding-bottom: calc(var(--nav-h) + 4px); }
.center {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  min-height: 100vh; padding: 32px 24px; text-align: center;
}

/* ── Loader ───────────────────────────────────────────────────────────────── */
#loader {
  position: fixed; inset: 0; background: var(--bg);
  z-index: 200; display: none;
  align-items: center; justify-content: center;
  flex-direction: column; gap: 10px;
  color: var(--muted); font-size: 12px;
}
#loader.on { display: flex; }
.spinner {
  width: 20px; height: 20px;
  border: 2px solid var(--border);
  border-top-color: var(--btn-bg);
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Buttons ─────────────────────────────────────────────────────────────── */
.btn {
  background: var(--btn-bg); color: var(--btn-fg); border: none;
  padding: 6px 14px; cursor: pointer; border-radius: 4px;
  font-size: 12px; font-family: inherit; transition: opacity .15s;
}
.btn:hover { opacity: .85; }
.btn-block { display: block; width: 100%; }
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border); color: var(--text);
}
.btn-danger { background: var(--red); color: #fff; }
.btn-sm { padding: 3px 10px; font-size: 11px; }

/* ── User bar ────────────────────────────────────────────────────────────── */
.user-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-bottom: 1px solid var(--border);
  position: sticky; top: 0; background: var(--bg); z-index: 10;
}
.avatar { width: 22px; height: 22px; border-radius: 50%; }
.user-name { flex: 1; font-size: 12px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.plan-badge {
  font-size: 9px; padding: 2px 6px; border-radius: 10px;
  font-weight: 700; text-transform: uppercase; letter-spacing: .5px; flex-shrink: 0;
}
.plan-free { background: var(--border); color: var(--muted); }
.plan-pro  { background: var(--purple); color: #fff; }

/* ── Section header ─────────────────────────────────────────────────────── */
.section-hd {
  font-size: 10px; text-transform: uppercase;
  letter-spacing: .5px; color: var(--muted); margin-bottom: 8px;
}

/* ── Bottom navigation ──────────────────────────────────────────────────── */
#bottom-nav {
  display: none; position: fixed; bottom: 0; left: 0; right: 0;
  height: var(--nav-h); background: var(--bg);
  border-top: 1px solid var(--border);
  flex-direction: row; z-index: 100; padding: 4px 8px; gap: 4px;
}
#bottom-nav.on { display: flex; }
.nav-btn {
  flex: 1; background: transparent; border: none;
  color: var(--muted); cursor: pointer; border-radius: 6px;
  font-size: 11px; font-family: inherit; padding: 4px 0;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  transition: background .1s, color .1s;
}
.nav-btn:hover { background: var(--hover); }
.nav-btn.active { color: var(--btn-bg); background: rgba(0,0,0,.08); }
.nav-icon { width: 16px; height: 16px; line-height: 1; display: flex; align-items: center; justify-content: center; }

/* ── Repo list ──────────────────────────────────────────────────────────── */
.quota-row {
  display: flex; gap: 12px; padding: 4px 12px;
  font-size: 10px; color: var(--muted);
  border-bottom: 1px solid var(--border);
}
ul.list { list-style: none; }
ul.list li {
  padding: 8px 12px; border-bottom: 1px solid var(--border);
  cursor: pointer; transition: background .1s;
}
ul.list li:hover { background: var(--hover); }
ul.list li.has-dl { border-left: 3px solid var(--green); }
.repo-row { display: flex; justify-content: space-between; align-items: center; }
.repo-name { font-weight: 600; font-size: 13px; }
.repo-desc {
  color: var(--muted); font-size: 11px; margin-top: 2px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.badge { font-size: 10px; padding: 2px 6px; border-radius: 10px; background: var(--hover); white-space: nowrap; }
.badge.overdue { background: var(--red); color: #fff; }
.badge.soon    { background: var(--orange); color: #fff; }

/* ── Detail / Commit shared ─────────────────────────────────────────────── */
.header {
  display: flex; align-items: center; padding: 8px 12px;
  border-bottom: 1px solid var(--border); font-weight: 600;
  background: var(--bg); position: sticky; top: 0; z-index: 10; gap: 8px;
}
.back-btn {
  background: transparent; border: none; color: var(--text);
  cursor: pointer; padding: 3px; border-radius: 3px; display: flex; align-items: center;
}
.back-btn:hover { background: var(--hover); }
.section { padding: 12px; border-bottom: 1px solid var(--border); }
.input-row { display: flex; gap: 6px; align-items: center; }
input[type="datetime-local"],
input[type="text"],
select {
  flex: 1; background: var(--inp-bg); color: var(--inp-fg);
  border: 1px solid var(--inp-bd); padding: 5px 8px;
  border-radius: 4px; font-size: 12px; font-family: inherit;
}
input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter: invert(.8); cursor: pointer; }
.commit {
  padding: 8px; border: 1px solid var(--border); border-radius: 4px;
  cursor: pointer; margin-bottom: 8px; transition: background .1s;
}
.commit:hover { background: var(--hover); }
.commit-msg  { font-size: 12px; font-weight: 500; line-height: 1.4; }
.commit-meta { color: var(--muted); font-size: 11px; margin-top: 3px; }
.stats       { display: flex; gap: 10px; font-size: 12px; }
.add { color: var(--green); }
.del { color: var(--red); }
.file-card { padding: 6px 8px; border-radius: 4px; border-left: 2px solid var(--muted); margin-bottom: 6px; font-size: 11px; }
.file-card.added    { border-left-color: var(--green); }
.file-card.modified { border-left-color: var(--blue); }
.file-card.deleted  { border-left-color: var(--red); }
.file-name  { font-weight: 500; word-break: break-word; }
.file-stats { color: var(--muted); font-size: 10px; margin-top: 3px; }

/* ── Repo-detail inline todos ───────────────────────────────────────────── */
.rd-todo { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--border); }
.rd-todo:last-child { border-bottom: none; }
.rd-todo-check { width: 14px; height: 14px; cursor: pointer; accent-color: var(--btn-bg); }
.rd-todo-title { flex: 1; font-size: 12px; }
.rd-todo-title.done { text-decoration: line-through; color: var(--muted); }
.rd-todo-del { background: transparent; border: none; color: var(--muted); cursor: pointer; font-size: 14px; padding: 0 4px; }
.rd-todo-del:hover { color: var(--red); }

/* ── TASKS VIEW ──────────────────────────────────────────────────────────── */
.tasks-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 12px; border-bottom: 1px solid var(--border);
  position: sticky; top: 0; background: var(--bg); z-index: 10;
}
.tasks-title { font-weight: 700; font-size: 14px; }

/* Add task panel */
#add-task-panel {
  display: none; padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--hover); gap: 6px; flex-direction: column;
}
#add-task-panel.on { display: flex; }
#add-task-panel .row { display: flex; gap: 6px; }
#task-title-input { flex: 1; }
#task-priority-sel { width: 90px; flex: none; }

/* Filter bar */
.filter-bar {
  display: flex; gap: 4px; padding: 8px 12px;
  border-bottom: 1px solid var(--border); overflow-x: auto;
}
.filter-bar::-webkit-scrollbar { display: none; }
.filter-btn {
  background: transparent; border: 1px solid transparent;
  color: var(--muted); cursor: pointer; padding: 3px 10px;
  border-radius: 12px; font-size: 11px; font-family: inherit;
  white-space: nowrap; transition: all .1s;
}
.filter-btn:hover { border-color: var(--border); }
.filter-btn.active { border-color: var(--btn-bg); color: var(--btn-bg); }

/* Task items */
.task-item {
  border-bottom: 1px solid var(--border); transition: background .1s;
}
.task-item:hover { background: var(--hover); }
.task-row {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 12px; cursor: pointer;
}
.status-btn {
  background: transparent; border: none; cursor: pointer;
  font-size: 16px; line-height: 1; padding: 0; min-width: 18px;
  color: var(--muted); transition: color .15s; flex-shrink: 0;
}
.status-btn:hover { color: var(--btn-bg); }
.status-btn.done { color: var(--green); }
.status-btn.in_progress { color: var(--orange); }
.task-body { flex: 1; overflow: hidden; }
.task-title {
  display: block; font-size: 12px; font-weight: 500;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.task-title.done { text-decoration: line-through; color: var(--muted); }
.task-desc {
  display: block; font-size: 11px; color: var(--muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  margin-top: 1px;
}
/* Priority dot next to task-del */
.p-dot {
  width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
}
.p-dot.low      { background: #6b7280; }
.p-dot.medium   { background: var(--blue); }
.p-dot.high     { background: var(--orange); }
.p-dot.critical { background: var(--red); }
.task-del {
  background: transparent; border: none; color: var(--muted);
  cursor: pointer; font-size: 14px; padding: 0 2px; flex-shrink: 0;
}
.task-del:hover { color: var(--red); }
.task-expand-icon {
  font-size: 10px; color: var(--muted); flex-shrink: 0; transition: transform .15s;
}
.task-expand-icon.open { transform: rotate(90deg); }

/* Expandable description panel */
.task-detail {
  display: none; padding: 0 12px 10px 38px; background: var(--hover);
}
.task-detail.open { display: block; }
.task-detail-label {
  font-size: 10px; color: var(--muted); text-transform: uppercase;
  letter-spacing: .4px; margin-bottom: 4px;
}
.task-desc-edit {
  width: 100%; background: var(--inp-bg); color: var(--inp-fg);
  border: 1px solid var(--inp-bd); border-radius: 4px;
  padding: 5px 8px; font-size: 12px; font-family: inherit;
  resize: vertical; min-height: 54px; max-height: 140px;
}
.task-desc-actions {
  display: flex; justify-content: flex-end; gap: 6px; margin-top: 5px;
}

/* Commit delete button */
.commit-del {
  background: transparent; border: none; color: var(--muted);
  cursor: pointer; font-size: 13px; padding: 2px 5px;
  border-radius: 3px; line-height: 1; flex-shrink: 0;
  transition: color .1s, background .1s;
}
.commit-del:hover { color: var(--red); background: rgba(239,68,68,.1); }
.commit-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; }

.empty-state {
  color: var(--muted); font-size: 12px; text-align: center; padding: 24px 12px;
}
.tasks-footer {
  padding: 8px 12px; color: var(--muted); font-size: 11px;
  display: flex; justify-content: space-between; align-items: center;
}
</style>
</head>
<body>

<!-- ── Loader ──────────────────────────────────────────────────────────────── -->
<div id="loader" class="on">
  <div class="spinner"></div>
  <span>Loading…</span>
</div>

<!-- ══════════════════ LOGIN VIEW ══════════════════════════════════════════ -->
<div id="view-login" class="view center">
  <img src="${logoUri}" alt="GitPilot" width="64" height="64"
    style="border-radius:14px;margin-bottom:16px;" onerror="this.style.display='none'">
  <div style="font-size:18px;font-weight:700;margin-bottom:8px;">GitPilot</div>
  <div style="color:var(--muted);font-size:12px;margin-bottom:28px;max-width:210px;line-height:1.6;">
    Track project deadlines, todos, and commit history — right inside VS Code.
  </div>
  <button class="btn btn-block" id="login-btn" style="max-width:210px;padding:9px 0;font-size:13px;">
    Sign in with GitHub
  </button>
</div>

<!-- ════════════ USER BAR (shared) ══════════════════════════════════════════ -->
<div id="user-bar" class="user-bar" style="display:none;">
  <img id="ua-avatar" class="avatar" src="" alt="">
  <span id="ua-name" class="user-name"></span>
  <span id="ua-plan" class="plan-badge plan-free">Free</span>
  <button class="btn btn-ghost btn-sm" id="logout-btn">Sign out</button>
</div>

<!-- ══════════════════ REPOS VIEW ══════════════════════════════════════════ -->
<div id="view-repos" class="view">
  <div class="quota-row">
    <span id="quota-dl" style="display:flex;align-items:center;gap:4px;"><svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4 1a1 1 0 0 1 2 0v1h4V1a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h1V1zm0 3a1 1 0 0 0 0 2h8a1 1 0 1 0 0-2H4z"/></svg> 0/3 deadlines</span>
    <span id="quota-td" style="display:flex;align-items:center;gap:4px;"><svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg> 0/10 todos</span>
  </div>
  <ul class="list" id="repo-list"></ul>
</div>

<!-- ══════════════════ TASKS VIEW ══════════════════════════════════════════ -->
<div id="view-tasks" class="view">
  <div class="tasks-header">
    <span class="tasks-title">My Tasks</span>
    <button class="btn btn-sm" id="new-task-btn">+ New</button>
  </div>

  <!-- Add task input panel -->
  <div id="add-task-panel">
    <div class="row">
      <input type="text" id="task-title-input" placeholder="Task title…" maxlength="120">
      <select id="task-priority-sel">
        <option value="medium">Medium</option>
        <option value="low">Low</option>
        <option value="high">High</option>
        <option value="critical">Critical</option>
      </select>
    </div>
    <div class="row">
      <input type="text" id="task-desc-input" placeholder="Description (optional)…" maxlength="200">
      <button class="btn btn-sm" id="save-task-btn" style="flex:none;">Add</button>
      <button class="btn btn-ghost btn-sm" id="cancel-task-btn" style="flex:none;">✕</button>
    </div>
  </div>

  <!-- Filter tabs -->
  <div class="filter-bar">
    <button class="filter-btn active" data-status="all">All</button>
    <button class="filter-btn" data-status="todo">To Do</button>
    <button class="filter-btn" data-status="in_progress">In Progress</button>
    <button class="filter-btn" data-status="done">Done</button>
  </div>

  <!-- Task list -->
  <div id="task-list"></div>

  <!-- Footer -->
  <div class="tasks-footer" id="tasks-footer" style="display:none;">
    <span id="tasks-remaining"></span>
    <button class="btn btn-ghost btn-sm" id="clear-done-btn">Clear done</button>
  </div>
</div>

<!-- ══════════════════ REPO DETAIL VIEW ════════════════════════════════════ -->
<div id="view-detail" class="view">
  <div class="header">
    <button class="back-btn" id="back-btn">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path fill-rule="evenodd" d="M10.53 2.97a.75.75 0 010 1.06L6.56 8l3.97 3.97a.75.75 0 11-1.06 1.06l-4.5-4.5a.75.75 0 010-1.06l4.5-4.5a.75.75 0 011.06 0z"/>
      </svg>
    </button>
    <span id="detail-name" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>
  </div>

  <!-- Deadline -->
  <div class="section">
    <div class="section-hd" style="display:flex;align-items:center;gap:5px;"><svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M4 1a1 1 0 0 1 2 0v1h4V1a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h1V1zm0 3a1 1 0 0 0 0 2h8a1 1 0 1 0 0-2H4z"/></svg> Project Deadline</div>
    <div class="input-row">
      <input type="datetime-local" id="dl-input">
      <button class="btn btn-sm" id="save-dl">Save</button>
      <button class="btn btn-ghost btn-sm" id="clear-dl" title="Remove">✕</button>
    </div>
    <div id="dl-warn" style="color:var(--red);font-size:11px;margin-top:6px;display:none;"></div>
  </div>

  <!-- Last commit stats -->
  <div class="section">
    <div class="section-hd" style="display:flex;align-items:center;gap:5px;"><svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M1 8a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13A.5.5 0 0 1 1 8zm7-8a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L7.5 4.293V.5A.5.5 0 0 1 8 0zm-.5 11.707-1.146 1.147a.5.5 0 0 1-.708-.708l2-2a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 11.707V15.5a.5.5 0 0 1-1 0v-3.793z"/></svg> Latest Commit</div>
    <div class="stats" id="lc-stats"><span style="color:var(--muted);">Loading…</span></div>
  </div>

  <!-- Repo todos -->
  <div class="section">
    <div class="section-hd" style="display:flex;align-items:center;gap:5px;"><svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z"/><path d="M7 5.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0zM7 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 0 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0z"/></svg> Repo Tasks</div>
    <div class="input-row" style="margin-bottom:10px;">
      <input type="text" id="new-todo-input" placeholder="Add a task…" maxlength="120">
      <button class="btn btn-sm" id="add-todo-btn">Add</button>
    </div>
    <div id="todo-list"><div class="empty-state">No todos yet</div></div>
  </div>

  <!-- Commits -->
  <div class="section" style="border:none;">
    <div class="section-hd" style="display:flex;align-items:center;gap:5px;"><svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg> Recent Commits</div>
    <div id="commit-list"><span style="color:var(--muted);font-size:12px;">Loading…</span></div>
  </div>
</div>

<!-- ══════════════════ COMMIT DETAIL VIEW ══════════════════════════════════ -->
<div id="view-commit" class="view">
  <div class="header">
    <button class="back-btn" id="back-commit-btn">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path fill-rule="evenodd" d="M10.53 2.97a.75.75 0 010 1.06L6.56 8l3.97 3.97a.75.75 0 11-1.06 1.06l-4.5-4.5a.75.75 0 010-1.06l4.5-4.5a.75.75 0 011.06 0z"/>
      </svg>
    </button>
    <span id="commit-hd" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;"></span>
  </div>
  <div class="section">
    <div class="section-hd">Info</div>
    <div style="font-size:11px;color:var(--muted);display:flex;flex-direction:column;gap:4px;">
      <div><strong>Author:</strong> <span id="ci-author"></span></div>
      <div><strong>Date:</strong>   <span id="ci-date"></span></div>
      <div><strong>SHA:</strong>    <span id="ci-sha" style="font-family:monospace;font-size:10px;"></span></div>
    </div>
  </div>
  <div class="section">
    <div class="section-hd">Message</div>
    <div id="ci-message" style="font-size:12px;white-space:pre-wrap;word-break:break-word;"></div>
  </div>
  <div class="section" style="border:none;">
    <div class="section-hd">Changes</div>
    <div class="stats" style="margin-bottom:10px;">
      <span><strong id="ci-files">0</strong> files</span>
      <span class="add">+<span id="ci-adds">0</span></span>
      <span class="del">-<span id="ci-dels">0</span></span>
    </div>
    <div id="ci-file-list"></div>
  </div>
</div>

<!-- ══════════════════ BOTTOM NAV ══════════════════════════════════════════ -->
<div id="bottom-nav">
  <button class="nav-btn active" id="nav-repos">
    <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/></svg></span>
    <span>Repos</span>
  </button>
  <button class="nav-btn" id="nav-tasks">
    <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z"/><path d="M7 5.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0zM7 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 0 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0z"/></svg></span>
    <span>Tasks</span>
  </button>
</div>

<!-- ══════════════════ SCRIPTS ══════════════════════════════════════════════ -->
<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
let currentRepo  = "";
let _plan        = "free";
let _dlLimit     = 3;
let _tdLimit     = 10;
let _dlCount     = 0;
let _allTasks    = [];
let _taskFilter  = "all";
let _authenticated = false;  // guard: once true, never allow setState("login")

// ── View helpers ────────────────────────────────────────────────────────────
function showView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");
}
function setLoading(on) {
  document.getElementById("loader").classList.toggle("on", on);
}
function showNav(on) {
  document.getElementById("bottom-nav").classList.toggle("on", on);
}
function setUserBarVisible(on) {
  document.getElementById("user-bar").style.display = on ? "flex" : "none";
}
function setActiveNav(which) {
  document.getElementById("nav-repos").classList.toggle("active", which === "repos");
  document.getElementById("nav-tasks").classList.toggle("active", which === "tasks");
}

// ── Login ───────────────────────────────────────────────────────────────────
document.getElementById("login-btn").addEventListener("click", () =>
  vscode.postMessage({ type: "login" })
);
document.getElementById("logout-btn").addEventListener("click", () => {
  _authenticated = false;  // allow login page after intentional sign-out
  vscode.postMessage({ type: "logout" });
});

// ── Repo nav ────────────────────────────────────────────────────────────────
document.getElementById("nav-repos").addEventListener("click", () => {
  setActiveNav("repos");
  showView("view-repos");
  showNav(true);
  vscode.postMessage({ type: "getRepos" });
});
document.getElementById("nav-tasks").addEventListener("click", () => {
  setActiveNav("tasks");
  showView("view-tasks");
  showNav(true);
  vscode.postMessage({ type: "getTasks" });
});

// ── Back buttons ────────────────────────────────────────────────────────────
document.getElementById("back-btn").addEventListener("click", () => {
  setActiveNav("repos");
  showView("view-repos");
  showNav(true);
  vscode.postMessage({ type: "getRepos" });
});
document.getElementById("back-commit-btn").addEventListener("click", () => {
  showView("view-detail");
  showNav(false);
  vscode.postMessage({ type: "getRepoDetail", repoFullName: currentRepo });
});

// ── Deadline ────────────────────────────────────────────────────────────────
document.getElementById("dl-input").addEventListener("focus", (e) => {
  e.target.min = tsToLocal(Date.now());
});

document.getElementById("save-dl").addEventListener("click", () => {
  const v = document.getElementById("dl-input").value;
  if (!v) return;
  if (new Date(v).getTime() < Date.now()) {
    const warn = document.getElementById("dl-warn");
    warn.textContent = "Deadline must be in the future.";
    warn.style.display = "block";
    return;
  }
  vscode.postMessage({ type: "setDeadline", repoFullName: currentRepo, date: v });
});
document.getElementById("clear-dl").addEventListener("click", () => {
  document.getElementById("dl-input").value = "";
  document.getElementById("dl-warn").style.display = "none";
  vscode.postMessage({ type: "removeDeadline", repoFullName: currentRepo });
});

// ── Repo todos ───────────────────────────────────────────────────────────────
document.getElementById("add-todo-btn").addEventListener("click", addRepoTodo);
document.getElementById("new-todo-input").addEventListener("keydown", e => {
  if (e.key === "Enter") addRepoTodo();
});
function addRepoTodo() {
  const title = document.getElementById("new-todo-input").value.trim();
  if (!title) return;
  vscode.postMessage({ type: "createTodo", repoFullName: currentRepo, title, priority: "medium" });
  document.getElementById("new-todo-input").value = "";
}

// ── Tasks view: new task panel ───────────────────────────────────────────────
document.getElementById("new-task-btn").addEventListener("click", () => {
  const panel = document.getElementById("add-task-panel");
  const on = panel.classList.toggle("on");
  if (on) document.getElementById("task-title-input").focus();
});
document.getElementById("cancel-task-btn").addEventListener("click", () => {
  document.getElementById("add-task-panel").classList.remove("on");
  document.getElementById("task-title-input").value = "";
  document.getElementById("task-desc-input").value  = "";
});
document.getElementById("save-task-btn").addEventListener("click", saveTask);
document.getElementById("task-title-input").addEventListener("keydown", e => {
  if (e.key === "Enter")  saveTask();
  if (e.key === "Escape") document.getElementById("cancel-task-btn").click();
});
function saveTask() {
  const title = document.getElementById("task-title-input").value.trim();
  if (!title) return;
  vscode.postMessage({
    type:        "createTask",
    title,
    priority:    document.getElementById("task-priority-sel").value,
    description: document.getElementById("task-desc-input").value.trim() || undefined,
  });
  document.getElementById("task-title-input").value = "";
  document.getElementById("task-desc-input").value  = "";
  document.getElementById("add-task-panel").classList.remove("on");
}

// ── Tasks view: filter ───────────────────────────────────────────────────────
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    _taskFilter = btn.dataset.status;
    applyTaskFilter();
  });
});

// ── Tasks view: clear done ───────────────────────────────────────────────────
document.getElementById("clear-done-btn").addEventListener("click", () => {
  vscode.postMessage({ type: "clearDoneTasks" });
});

// ── Message handler ─────────────────────────────────────────────────────────
window.addEventListener("message", ({ data: msg }) => {
  switch (msg.type) {

    case "setLoading":
      setLoading(msg.loading);
      break;

    case "setInitialState":
      // Extension host tells us the user was authenticated last session.
      // Mark authenticated immediately so that if any stale setState("login")
      // arrives while the async session check runs, it is ignored.
      if (msg.authenticated) {
        _authenticated = true;
      }
      break;

    case "setState": {
      const s = msg.state;

      // Safety guard: once authenticated (setUser received), NEVER go back
      // to the login view (prevents race-condition / stale message flicker).
      if (s === "login" && _authenticated) break;

      const isMain   = s === "repos" || s === "tasks";
      const showBar  = s !== "login";   // hide user-bar only on login
      showNav(isMain);
      setUserBarVisible(showBar);
      if (s === "repos") setActiveNav("repos");
      if (s === "tasks") setActiveNav("tasks");
      showView("view-" + s);
      setLoading(false);
      break;
    }

    case "setUser":
      _authenticated = true;   // mark as logged-in — blocks future setState("login")
      _plan = msg.plan; _dlLimit = msg.deadlineLimit;
      _tdLimit = msg.todoLimit; _dlCount = msg.deadlineCount;
      document.getElementById("ua-avatar").src = msg.avatar;
      document.getElementById("ua-name").textContent  = msg.name;
      const pb = document.getElementById("ua-plan");
      pb.textContent = msg.plan === "pro" ? "Pro" : "Free";
      pb.className = "plan-badge " + (msg.plan === "pro" ? "plan-pro" : "plan-free");
      setUserBarVisible(true);
      updateQuota(msg.deadlineCount, null);
      break;

    case "renderRepos":
      renderRepos(msg.repos);
      setLoading(false);
      break;

    case "renderDetail":
      renderDetail(msg);
      setLoading(false);
      break;

    case "renderCommitDetail":
      renderCommitDetail(msg.commit);
      setLoading(false);
      break;

    case "renderTodos":
      renderRepoTodos(msg.todos);
      break;

    case "renderTasks":
      _allTasks = msg.tasks || [];
      applyTaskFilter();
      // Update quota
      updateQuota(null, _allTasks.length);
      break;

    case "deadlineUpdated":
      _dlCount = msg.deadlineCount;
      document.getElementById("dl-input").value = tsToLocal(msg.deadline_ts);
      document.getElementById("dl-warn").style.display = "none";
      updateQuota(_dlCount, null);
      break;

    case "deadlineRemoved":
      _dlCount = msg.deadlineCount;
      document.getElementById("dl-input").value = "";
      updateQuota(_dlCount, null);
      break;
  }
});

// ── Quota ─────────────────────────────────────────────────────────────────────
function updateQuota(dlCount, tdCount) {
  const calSvg = '<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4 1a1 1 0 0 1 2 0v1h4V1a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h1V1zm0 3a1 1 0 0 0 0 2h8a1 1 0 1 0 0-2H4z"/></svg>';
  const chkSvg = '<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>';
  if (dlCount !== null) {
    const lim = _dlLimit === Infinity ? "\u221e" : _dlLimit;
    document.getElementById("quota-dl").innerHTML = calSvg + " " + (dlCount ?? _dlCount) + "/" + lim + " deadlines";
  }
  if (tdCount !== null) {
    const lim = _tdLimit === Infinity ? "\u221e" : _tdLimit;
    document.getElementById("quota-td").innerHTML = chkSvg + " " + tdCount + "/" + lim + " todos";
  }
}

// ── renderRepos ───────────────────────────────────────────────────────────────
function renderRepos(repos) {
  const list = document.getElementById("repo-list");
  list.innerHTML = "";
  if (!repos?.length) {
    list.innerHTML = "<li style='text-align:center;color:var(--muted);border:none;padding:20px;'>No repositories found</li>";
    return;
  }
  // Sort: repos with deadlines first (nearest deadline first, then overdue), then the rest by name
  const now = Date.now();
  repos = [...repos].sort((a, b) => {
    const aHas = !!a.deadline, bHas = !!b.deadline;
    if (aHas && bHas) {
      // Both have deadlines — nearest first (smallest ts first, but overdue go last)
      const aFuture = a.deadline > now, bFuture = b.deadline > now;
      if (aFuture && !bFuture) return -1;  // a is upcoming, b is overdue → a first
      if (!aFuture && bFuture) return 1;
      // Both future or both overdue → sort by closest
      return Math.abs(a.deadline - now) - Math.abs(b.deadline - now);
    }
    if (aHas) return -1;  // only a has deadline → a first
    if (bHas) return 1;
    return a.name.localeCompare(b.name);  // no deadlines → alphabetical
  });
  repos.forEach(repo => {
    const li = document.createElement("li");
    if (repo.deadline) li.classList.add("has-dl");

    let badge = "";
    if (repo.deadline) {
      const diff = repo.deadline - Date.now();
      const over = diff < 0;
      const days = Math.floor(Math.abs(diff) / 86400000);
      const hrs  = Math.floor(Math.abs(diff) / 3600000);
      const label = over ? "Overdue" : (days > 0 ? days + "d left" : hrs + "h left");
      const cls   = over ? "overdue" : (days <= 3 ? "soon" : "");
      badge = \`<span class="badge \${cls}">\${label}</span>\`;
    }

    li.innerHTML =
      \`<div class="repo-row"><span class="repo-name">\${esc(repo.name)}</span>\${badge}</div>\` +
      \`<div class="repo-desc">\${esc(repo.description || "No description")}</div>\`;

    li.addEventListener("click", () => {
      currentRepo = repo.full_name;
      document.getElementById("detail-name").textContent  = repo.name;
      document.getElementById("commit-list").innerHTML    = "<span style='color:var(--muted);font-size:12px;'>Loading…</span>";
      document.getElementById("lc-stats").innerHTML       = "<span style='color:var(--muted);'>Loading…</span>";
      document.getElementById("todo-list").innerHTML      = "<div class='empty-state'>Loading…</div>";
      document.getElementById("dl-input").value           = repo.deadline ? tsToLocal(repo.deadline) : "";
      document.getElementById("dl-warn").style.display    = "none";
      showView("view-detail");
      showNav(false);
      vscode.postMessage({ type: "getRepoDetail", repoFullName: repo.full_name });
    });
    list.appendChild(li);
  });
}

// ── renderDetail ─────────────────────────────────────────────────────────────
function renderDetail(msg) {
  const s = msg.stats || {};
  document.getElementById("lc-stats").innerHTML =
    \`<span>Total: <strong>\${s.total || 0}</strong></span>\` +
    \`<span class="add">+\${s.additions || 0}</span>\` +
    \`<span class="del">-\${s.deletions || 0}</span>\`;

  if (msg.deadline) document.getElementById("dl-input").value = tsToLocal(msg.deadline);

  const cl = document.getElementById("commit-list");
  if (!msg.commits?.length) {
    cl.innerHTML = "<div style='color:var(--muted);font-size:12px;'>No commits found</div>";
  } else {
    cl.innerHTML = msg.commits.map(c => {
      const date  = new Date(c.commit.author.date).toLocaleDateString();
      const first = c.commit.message.split("\\n")[0];
      return \`<div class="commit" data-sha="\${c.sha}" data-msg="\${esc(c.commit.message)}">
        <div class="commit-header">
          <div style="flex:1;min-width:0;">
            <div class="commit-msg">\${esc(first)}</div>
            <div class="commit-meta">\${date} · \${esc(c.commit.author.name)} · <code style="font-size:10px;">\${c.sha.slice(0,7)}</code></div>
          </div>
          <button class="commit-del" data-sha="\${c.sha}" data-msg="\${esc(first)}" title="Delete this commit from history"><svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button>
        </div>
      </div>\`;
    }).join("");

    // Commit click → view detail
    cl.querySelectorAll(".commit").forEach(el =>
      el.addEventListener("click", (e) => {
        // Don't navigate if delete button was clicked
        if (e.target.closest(".commit-del")) return;
        vscode.postMessage({ type: "viewCommit", repoFullName: currentRepo, sha: el.dataset.sha });
        showView("view-commit");
        showNav(false);
      })
    );

    // Delete commit button
    cl.querySelectorAll(".commit-del").forEach(btn =>
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        vscode.postMessage({
          type:        "deleteCommit",
          repoFullName: currentRepo,
          sha:         btn.dataset.sha,
          message:     btn.dataset.msg,
        });
      })
    );
  }
  renderRepoTodos(msg.todos || []);
}

// ── renderRepoTodos ───────────────────────────────────────────────────────────
function renderRepoTodos(todos) {
  const el = document.getElementById("todo-list");
  if (!todos?.length) {
    el.innerHTML = "<div class='empty-state'>No todos yet</div>"; return;
  }
  el.innerHTML = todos.map(t =>
    \`<div class="rd-todo">
      <input type="checkbox" class="rd-todo-check" data-id="\${t._id}" \${t.status === "done" ? "checked" : ""}>
      <span class="rd-todo-title\${t.status === "done" ? " done" : ""}">\${esc(t.title)}</span>
      <button class="rd-todo-del" data-id="\${t._id}" title="Delete">×</button>
    </div>\`
  ).join("");
  el.querySelectorAll(".rd-todo-check").forEach(cb =>
    cb.addEventListener("change", () =>
      vscode.postMessage({ type: "updateTodo", repoFullName: currentRepo, todoId: cb.dataset.id, status: cb.checked ? "done" : "todo" })
    )
  );
  el.querySelectorAll(".rd-todo-del").forEach(btn =>
    btn.addEventListener("click", () =>
      vscode.postMessage({ type: "removeTodo", repoFullName: currentRepo, todoId: btn.dataset.id })
    )
  );
}

// ── Tasks view ────────────────────────────────────────────────────────────────
function applyTaskFilter() {
  const filtered = _taskFilter === "all"
    ? _allTasks
    : _allTasks.filter(t => t.status === _taskFilter);

  const active = _allTasks.filter(t => t.status !== "done").length;
  const footer = document.getElementById("tasks-footer");
  footer.style.display = _allTasks.length ? "flex" : "none";
  document.getElementById("tasks-remaining").textContent = active + " task" + (active !== 1 ? "s" : "") + " remaining";

  const el = document.getElementById("task-list");
  if (!filtered.length) {
    el.innerHTML = \`<div class="empty-state">\${
      _taskFilter === "all"
        ? "No tasks yet — click + New to add one"
        : "No " + _taskFilter.replace("_", " ") + " tasks"
    }</div>\`;
    return;
  }

  const STATUS_ICON = { todo: "○", in_progress: "◑", done: "●" };
  el.innerHTML = filtered.map(t => \`
    <div class="task-item">
      <div class="task-row">
        <button class="status-btn \${t.status}" data-id="\${t._id}" data-status="\${t.status}"
          title="Click to cycle status">\${STATUS_ICON[t.status] || "○"}</button>
        <div class="task-body">
          <span class="task-title\${t.status === "done" ? " done" : ""}">\${esc(t.title)}</span>
          \${t.description ? \`<span class="task-desc">\${esc(t.description)}</span>\` : "<span class='task-desc' style='font-style:italic;'>No description — click ▶ to add</span>"}
        </div>
        <span class="p-dot \${t.priority || "medium"}"></span>
        <span class="task-expand-icon" data-id="\${t._id}" title="Expand">▶</span>
        <button class="task-del" data-id="\${t._id}" title="Delete">×</button>
      </div>
      <div class="task-detail" id="detail-\${t._id}">
        <div class="task-detail-label">Description</div>
        <textarea class="task-desc-edit" data-id="\${t._id}" placeholder="Add a description…" maxlength="500">\${t.description ? esc(t.description) : ""}</textarea>
        <div class="task-desc-actions">
          <button class="btn btn-ghost btn-sm desc-cancel-btn" data-id="\${t._id}">Cancel</button>
          <button class="btn btn-sm desc-save-btn" data-id="\${t._id}">Save</button>
        </div>
      </div>
    </div>
  \`).join("");

  // Status cycle
  el.querySelectorAll(".status-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const cycle = { todo: "in_progress", in_progress: "done", done: "todo" };
      const next  = cycle[btn.dataset.status] || "todo";
      vscode.postMessage({ type: "updateTaskStatus", todoId: btn.dataset.id, status: next });
    });
  });

  // Expand / collapse
  el.querySelectorAll(".task-expand-icon").forEach(icon => {
    icon.addEventListener("click", (e) => {
      e.stopPropagation();
      const id     = icon.dataset.id;
      const panel  = document.getElementById("detail-" + id);
      const isOpen = panel.classList.toggle("open");
      icon.classList.toggle("open", isOpen);
      if (isOpen) {
        // Restore textarea with live description from _allTasks
        const task = _allTasks.find(t => t._id === id);
        const ta   = panel.querySelector(".task-desc-edit");
        ta.value   = task?.description || "";
        ta.focus();
      }
    });
  });

  // Description save
  el.querySelectorAll(".desc-save-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id  = btn.dataset.id;
      const ta  = document.querySelector(\`.task-desc-edit[data-id="\${id}"]\`);
      const val = ta.value.trim();
      vscode.postMessage({ type: "updateTaskDescription", todoId: id, description: val || undefined });
      // Collapse panel
      const panel = document.getElementById("detail-" + id);
      panel.classList.remove("open");
      document.querySelector(\`.task-expand-icon[data-id="\${id}"]\`)?.classList.remove("open");
    });
  });

  // Description cancel
  el.querySelectorAll(".desc-cancel-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id    = btn.dataset.id;
      const panel = document.getElementById("detail-" + id);
      panel.classList.remove("open");
      document.querySelector(\`.task-expand-icon[data-id="\${id}"]\`)?.classList.remove("open");
    });
  });

  // Delete
  el.querySelectorAll(".task-del").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      vscode.postMessage({ type: "deleteTask", todoId: btn.dataset.id });
    });
  });
}

// ── renderCommitDetail ────────────────────────────────────────────────────────
function renderCommitDetail(c) {
  document.getElementById("commit-hd").textContent   = c.message.split("\\n")[0];
  document.getElementById("ci-author").textContent   = c.author + (c.email ? " <" + c.email + ">" : "");
  document.getElementById("ci-date").textContent     = new Date(c.date).toLocaleString();
  document.getElementById("ci-sha").textContent      = c.sha.slice(0, 7);
  document.getElementById("ci-message").textContent  = c.message;
  document.getElementById("ci-files").textContent    = c.filesChanged;
  document.getElementById("ci-adds").textContent     = c.additions;
  document.getElementById("ci-dels").textContent     = c.deletions;

  const fl = document.getElementById("ci-file-list");
  fl.innerHTML = (c.files?.length
    ? c.files.map(f => {
        const cls = f.status === "added" ? "added" : f.status === "removed" ? "deleted" : "modified";
        return \`<div class="file-card \${cls}">
          <div class="file-name">\${esc(f.filename)}</div>
          <div class="file-stats">\${f.status} · +\${f.additions} -\${f.deletions}</div>
        </div>\`;
      }).join("")
    : "<div style='color:var(--muted);font-size:11px;'>No file data available</div>"
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function tsToLocal(ts) {
  const d = new Date(ts), p = n => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth()+1) + "-" + p(d.getDate()) +
         "T" + p(d.getHours()) + ":" + p(d.getMinutes());
}
function esc(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── Boot ──────────────────────────────────────────────────────────────────────
vscode.postMessage({ type: "init" });
</script>
</body>
</html>`;
}
