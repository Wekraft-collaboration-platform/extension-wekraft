// ─────────────────────────────────────────────────────────────
//  Wekraft Sidebar — Webview Script
//  Runs in the sandboxed webview browser context.
//  No create allowed — only update and delete.
// ─────────────────────────────────────────────────────────────
// @ts-check

const vscode = acquireVsCodeApi();

// ── App state ─────────────────────────────────────────────────

const state = {
  /** @type {{ isAuthenticated: boolean, user: any|null }} */
  auth: { isAuthenticated: false, user: null },
  /** @type {"tasks"|"issues"} */
  activeView: "tasks",
  /** @type {string} */
  activeStatus: "all",
  /** @type {any[]} */
  tasks: [],
  /** @type {any[]} */
  projects: [],
  /** @type {any[]} */
  issues: [],
  /** @type {any[]} */
  teamMembers: [],
  /** @type {string} */
  projectId: "",
  /** @type {string} */
  sprintId: "",
  /** @type {{ type: "task"|"issue", id: string }|null} */
  editing: null,
  /** @type {boolean} Track whether tasks have loaded at least once for current project */
  tasksLoaded: false,
  /** @type {boolean} Track whether issues have loaded at least once for current project */
  issuesLoaded: false,
  /** @type {boolean} */
  pendingMarkAsIssue: false,
};

// ── Tag colour map — matches web-app named tokens exactly ─────

const TAG_COLOR_MAP = {
  green:  { bg: "rgba(16,185,129,0.15)",  text: "#10b981", border: "rgba(16,185,129,0.35)"  },
  yellow: { bg: "rgba(234,179,8,0.15)",   text: "#eab308", border: "rgba(234,179,8,0.35)"   },
  purple: { bg: "rgba(139,92,246,0.15)",  text: "#a78bfa", border: "rgba(139,92,246,0.35)"  },
  blue:   { bg: "rgba(59,130,246,0.15)",  text: "#60a5fa", border: "rgba(59,130,246,0.35)"  },
  grey:   { bg: "rgba(115,115,115,0.15)", text: "#a3a3a3", border: "rgba(115,115,115,0.35)" },
};

// ── DOM references ────────────────────────────────────────────

const $ = (/** @type {string} */ id) => document.getElementById(id);

const screenLogin   = $("screen-login");
const screenLoading = $("screen-loading");
const screenMain    = $("screen-main");

const btnLogin  = $("btn-login");
const btnLogout = $("btn-logout");
const userAvatar = $("user-avatar");
const userName  = $("user-name");
const userRole  = $("user-role");

const selectProject = /** @type {HTMLSelectElement} */ ($("select-project"));
const selectSprint  = /** @type {HTMLSelectElement} */ ($("select-sprint"));

const teamSection = $("team-section");
const teamAvatars = $("team-avatars");

const mainTabs    = document.querySelectorAll(".main-tab");
const statusTabsEl = $("status-tabs");
const btnNewItem  = $("btn-new-item");

const itemList = $("item-list");

const editPanel      = $("edit-panel");
const repoSearch     = $("repo-search");
const repoTree       = $("repo-tree");
let rawWorkspaceFiles = [];
const editPanelTitle = $("edit-panel-title");
const editTitle      = /** @type {HTMLInputElement} */ ($("edit-title"));
const editStatus     = /** @type {HTMLSelectElement} */ ($("edit-status"));
const editPriority   = /** @type {HTMLSelectElement} */ ($("edit-priority"));
const editAssignee   = /** @type {HTMLSelectElement} */ ($("edit-assignee"));
const btnSaveEdit    = $("btn-save-edit");
const btnCloseEdit   = $("btn-close-edit");

// ── Extension → Webview messages ─────────────────────────────

window.addEventListener("message", ({ data: msg }) => {
  switch (msg.type) {
    case "AUTH_STATE":          onAuthState(msg.payload); break;
    case "PROJECTS_LOADED":     onProjectsLoaded(msg.payload); break;
    case "SPRINTS_LOADED":      onSprintsLoaded(msg.payload); break;
    case "TASKS_LOADED":        onTasksLoaded(msg.payload); break;
    case "ISSUES_LOADED":       onIssuesLoaded(msg.payload); break;
    case "TEAM_MEMBERS_LOADED": onTeamLoaded(msg.payload); break;
    case "TASK_CREATED":        onTaskCreated(msg.payload); break;
    case "TASK_UPDATED":        onTaskUpdated(msg.payload); break;
    case "ISSUE_CREATED":       onIssueCreated(msg.payload); break;
    case "TASK_MARKED_AS_ISSUE":
      loadAll();
      closeEditPanel();
      break;
    case "TASK_DELETED":  onTaskDeleted(msg.payload.taskId); break;
    case "ISSUE_UPDATED": onIssueUpdated(msg.payload); break;
    case "ISSUE_DELETED": onIssueDeleted(msg.payload.issueId); break;
    case "LOADING":
      if (msg.payload.isLoading) showScreen("loading");
      break;
    case "WORKSPACE_FILES":
      rawWorkspaceFiles = msg.payload;
      renderRepoTree(rawWorkspaceFiles, repoTree);
      break;
    case "ERROR":   showError(msg.payload.message); break;
    case "REFRESH": loadAll(); break;
  }
});

// ── Auth ──────────────────────────────────────────────────────

function onAuthState(auth) {
  state.auth = auth;
  if (!auth.isAuthenticated) {
    // Full state reset
    state.tasks         = [];
    state.projects      = [];
    state.issues        = [];
    state.teamMembers   = [];
    state.projectId     = "";
    state.sprintId      = "";
    state.editing       = null;
    state.tasksLoaded   = false;
    state.issuesLoaded  = false;

    // DOM reset
    userName.textContent   = "—";
    userRole.textContent   = "FREE PLAN";
    userRole.className     = "user-role plan-badge plan-free";
    userAvatar.innerHTML   = "";
    selectProject.innerHTML = "";
    selectSprint.innerHTML = '<option value="">All tasks</option>';
    teamSection.classList.add("hidden");
    teamAvatars.innerHTML  = "";
    itemList.innerHTML     = '<div class="empty-state">Select a project to load data.</div>';
    closeEditPanel();

    showScreen("login");
    return;
  }

  const u = auth.user;
  if (u) {
    userName.textContent = u.name || "Member";
    userRole.textContent = "MEMBER";
    userRole.className   = "user-role plan-badge plan-member";

    if (u.avatarUrl) {
      userAvatar.innerHTML = `<img src="${esc(u.avatarUrl)}" alt="Avatar" class="mini-avatar-img" style="width:32px;height:32px;border-radius:50%;" />`;
    } else {
      userAvatar.innerHTML = `<span style="font-size:16px;">${esc((u.name || "?")[0].toUpperCase())}</span>`;
    }
  }
  showScreen("loading");
  post({ type: "FETCH_PROJECTS" });
}

// ── Project / Sprint ──────────────────────────────────────────

function onProjectsLoaded(projects) {
  state.projects = projects;
  selectProject.innerHTML = "";

  if (!projects.length) {
    selectProject.innerHTML = '<option value="">No projects</option>';
    showScreen("main");
    return;
  }

  projects.forEach((p) => {
    const opt = document.createElement("option");
    opt.value       = p.id;
    opt.textContent = p.name;
    selectProject.appendChild(opt);
  });

  state.projectId    = projects[0].id;
  state.tasksLoaded  = false;
  state.issuesLoaded = false;
  updateUserRoleForSelectedProject();
  loadAll();
}

function onSprintsLoaded(sprints) {
  selectSprint.innerHTML = '<option value="">All tasks</option>';
  sprints.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    const icon = s.status === "active" ? "🟢 " : s.status === "planning" ? "🔵 " : "✓ ";
    opt.textContent = icon + s.name;
    selectSprint.appendChild(opt);
  });
}

function updateUserRoleForSelectedProject() {
  if (!state.projectId || !state.auth.user) return;
  const currentProj = state.projects.find((p) => p.id === state.projectId);
  if (!currentProj) return;

  if (currentProj.ownerId === state.auth.user.id) {
    userRole.textContent = "OWNER";
    userRole.className   = "user-role plan-badge plan-owner";
  } else {
    const myMember = state.teamMembers.find(
      (m) => m.userId === state.auth.user.id || m.user?.id === state.auth.user.id
    );
    const role = myMember ? myMember.role || "member" : "member";
    userRole.textContent = role.toUpperCase();
    userRole.className   = `user-role plan-badge plan-${role}`;
  }
}

function loadAll() {
  if (!state.projectId) { return; }
  state.tasksLoaded  = false;
  state.issuesLoaded = false;
  showScreen("loading");
  post({ type: "FETCH_SPRINTS",       payload: { projectId: state.projectId } });
  post({ type: "FETCH_TASKS",         payload: { projectId: state.projectId, sprintId: state.sprintId || undefined } });
  post({ type: "FETCH_ISSUES",        payload: { projectId: state.projectId } });
  post({ type: "FETCH_TEAM_MEMBERS",  payload: { projectId: state.projectId } });
}

function loadAllSilent() {
  if (!state.projectId || !state.auth?.isAuthenticated) { return; }
  post({ type: "FETCH_SPRINTS",      payload: { projectId: state.projectId } });
  post({ type: "FETCH_TASKS",        payload: { projectId: state.projectId, sprintId: state.sprintId || undefined } });
  post({ type: "FETCH_ISSUES",       payload: { projectId: state.projectId } });
  post({ type: "FETCH_TEAM_MEMBERS", payload: { projectId: state.projectId } });
}

// Background polling — real-time sync with Convex
setInterval(() => {
  if (state.auth?.isAuthenticated && state.projectId && !state.editing) {
    loadAllSilent();
  }
}, 5000);

selectProject.addEventListener("change", () => {
  state.projectId    = selectProject.value;
  state.sprintId     = "";
  state.tasksLoaded  = false;
  state.issuesLoaded = false;
  selectSprint.value = "";
  closeEditPanel();
  updateUserRoleForSelectedProject();
  loadAll();
});

selectSprint.addEventListener("change", () => {
  state.sprintId = selectSprint.value;
  post({ type: "FETCH_TASKS", payload: { projectId: state.projectId, sprintId: state.sprintId || undefined } });
});

// ── Data handlers ─────────────────────────────────────────────

function onTasksLoaded(tasks) {
  state.tasks       = tasks;
  state.tasksLoaded = true;
  // Show immediately when viewing tasks, or once both have arrived
  if (state.activeView === "tasks") {
    renderItems();
    showScreen("main");
  } else if (state.issuesLoaded) {
    // The other tab's data is already there — just reveal main without flicker
    showScreen("main");
  }
}

function onIssuesLoaded(issues) {
  state.issues       = issues;
  state.issuesLoaded = true;
  if (state.activeView === "issues") {
    renderItems();
    showScreen("main");
  } else if (state.tasksLoaded) {
    // Tasks are ready; safe to show main
    showScreen("main");
  }
}

function onTeamLoaded(members) {
  state.teamMembers = members;
  buildAvatarAssigneeSelect([]);
  updateUserRoleForSelectedProject();

  if (members.length > 0) {
    teamSection.classList.remove("hidden");
    teamAvatars.innerHTML = members.map((m) => {
      const initial    = (m.user?.name || "?")[0].toUpperCase();
      const roleBadge  = m.role === "admin" || m.role === "owner" ? "👑 " : "";
      const avatarHtml = m.user?.avatarUrl
        ? `<img src="${esc(m.user.avatarUrl)}" class="mini-avatar-img" />`
        : `<span class="mini-avatar">${esc(initial)}</span>`;

      return `<div class="team-avatar-item" title="${esc(m.user?.name || "")} (${m.role})">
                ${avatarHtml}
                <span>${roleBadge}${esc(m.user?.name || "")}</span>
              </div>`;
    }).join("");
  } else {
    teamSection.classList.add("hidden");
  }
}

function onTaskCreated(task) {
  state.tasks = [task, ...state.tasks];
  if (state.activeView === "tasks") { renderItems(); }
  closeEditPanel();

  if (state.pendingMarkAsIssue) {
    state.pendingMarkAsIssue = false;
    post({ type: "MARK_TASK_AS_ISSUE", payload: { taskId: task.id } });
  }
}

function onTaskUpdated(task) {
  state.tasks = state.tasks.map((t) => (t.id === task.id ? task : t));
  renderItems();
  closeEditPanel();
}

function onTaskDeleted(taskId) {
  state.tasks = state.tasks.filter((t) => t.id !== taskId);
  renderItems();
}

function onIssueCreated(issue) {
  state.issues = [issue, ...state.issues];
  if (state.activeView === "issues") { renderItems(); }
  closeEditPanel();
}

function onIssueUpdated(issue) {
  state.issues = state.issues.map((i) => (i.id === issue.id ? issue : i));

  if (issue.taskId && issue.status === "closed") {
    state.tasks = state.tasks.map((t) =>
      t.id === issue.taskId ? { ...t, isBlocked: false } : t
    );
  }

  renderItems();
  closeEditPanel();
}

function onIssueDeleted(issueId) {
  const issue = state.issues.find((i) => i.id === issueId);
  if (issue?.taskId) {
    state.tasks = state.tasks.map((t) =>
      t.id === issue.taskId ? { ...t, isBlocked: false } : t
    );
  }

  state.issues = state.issues.filter((i) => i.id !== issueId);
  renderItems();
}

// ── Render ────────────────────────────────────────────────────

function renderItems() {
  const items    = state.activeView === "tasks" ? state.tasks : state.issues;
  const filtered = state.activeStatus === "all"
    ? items
    : items.filter((i) => i.status === state.activeStatus);

  if (!filtered.length) {
    itemList.innerHTML = `<div class="empty-state">No ${state.activeView} found.</div>`;
    return;
  }

  itemList.innerHTML = filtered.map((item) => itemCardHtml(item)).join("");

  itemList.querySelectorAll(".item-card").forEach((card) => {
    const id   = card.getAttribute("data-id");
    const type = /** @type {"task"|"issue"} */ (card.getAttribute("data-type"));

    card.querySelector(".btn-edit")?.addEventListener("click", (e) => {
      e.stopPropagation();
      openEditPanel(type, id);
    });

    card.querySelector(".btn-delete")?.addEventListener("click", (e) => {
      e.stopPropagation();
      confirmDelete(type, id);
    });
  });
}

// ── Tag rendering helper ──────────────────────────────────────

/**
 * Render a tag badge. Supports both named-token colors (web-app format)
 * and legacy hex values.
 * @param {{ label: string, color: string }|null|undefined} tag
 */
function tagBadgeHtml(tag) {
  if (!tag || !tag.label) return "";
  const c = TAG_COLOR_MAP[tag.color];
  if (c) {
    return `<span style="font-size:9px;padding:2px 5px;border-radius:4px;margin-left:6px;background:${c.bg};color:${c.text};border:1px solid ${c.border};">${esc(tag.label)}</span>`;
  }
  // Fallback: treat color as hex
  const hex = tag.color || "#6366f1";
  return `<span style="font-size:9px;padding:2px 5px;border-radius:4px;margin-left:6px;background:${esc(hex)}22;color:${esc(hex)};border:1px solid ${esc(hex)}44;">${esc(tag.label)}</span>`;
}

// ── Status badge CSS class — safe slugify ─────────────────────

/**
 * Convert a status string to a valid CSS class suffix.
 * e.g. "not started" → "not-started", "inprogress" → "inprogress"
 * @param {string} status
 */
function statusClass(status) {
  return (status || "").replace(/\s+/g, "-").toLowerCase();
}

function itemCardHtml(item) {
  const isIssue = state.activeView === "issues";

  const priorityColors = {
    urgent:      "var(--priority-urgent)",
    critical:    "var(--priority-urgent)",
    high:        "var(--priority-high)",
    medium:      "var(--priority-medium)",
    low:         "var(--priority-low)",
    no_priority: "var(--priority-none)",
  };
  const dotColor   = priorityColors[item.priority] ?? "var(--priority-none)";
  const statusLabel = (item.status || "").replace(/_/g, " ");
  const statusCls   = `badge-${statusClass(item.status)}`;

  const renderAssigneesHtml = (assignees) => {
    if (!assignees || assignees.length === 0) return "";
    let html = `<div style="display:flex;align-items:center;" class="item-assignee">`;
    const maxShow = 3;
    assignees.slice(0, maxShow).forEach((a, idx) => {
      const z = maxShow - idx;
      if (a.avatarUrl) {
        html += `<img src="${esc(a.avatarUrl)}" class="mini-avatar-img" style="width:16px;height:16px;border-radius:50%;border:1px solid var(--vscode-sideBar-background);margin-left:${idx > 0 ? "-6px" : "0"};z-index:${z};position:relative;" />`;
      } else {
        const initial = (a.name || "?")[0].toUpperCase();
        html += `<span class="mini-avatar" style="width:16px;height:16px;font-size:8px;border:1px solid var(--vscode-sideBar-background);margin-left:${idx > 0 ? "-6px" : "0"};z-index:${z};position:relative;flex-shrink:0;">${esc(initial)}</span>`;
      }
    });
    if (assignees.length > maxShow) {
      html += `<span style="font-size:9px;margin-left:4px;opacity:0.8;">+${assignees.length - maxShow}</span>`;
    } else if (assignees.length === 1) {
      html += `<span style="font-size:10px;margin-left:4px;opacity:0.8;max-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(assignees[0].name || "")}</span>`;
    }
    html += `</div>`;
    return html;
  };

  const assigneesList = item.assignees?.length > 0 ? item.assignees : (item.assignee ? [item.assignee] : []);

  return /* html */ `
    <div class="item-card" data-id="${item.id}" data-type="${isIssue ? "issue" : "task"}">
      <div class="item-dot" style="background:${dotColor}"></div>
      <div class="item-body">
        <div class="item-title" title="${esc(item.title)}">
          ${item.isBlocked ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;display:inline-block;"><rect width="8" height="14" x="8" y="5" rx="4"/><path d="M19 7a1 1 0 0 0-1-1h-2M18 11.66A8 8 0 0 0 16 10M20 18a4 4 0 0 0-4-3.5M5 7a1 1 0 0 1 1-1h2M6 11.66A8 8 0 0 1 8 10M4 18a4 4 0 0 1 4-3.5M9 5a3 3 0 0 1 6 0M12 19v3M20 15h2M2 15h2"/></svg>` : ""}${esc(item.title)}
          ${tagBadgeHtml(item.type)}
          ${item.linkWithCodebase ? `<span title="Linked to: ${esc(item.linkWithCodebase)}" style="font-size:10px;margin-left:6px;opacity:0.6;">🔗</span>` : ""}
        </div>
        <div class="item-meta">
          <span class="task-badge ${statusCls}">${statusLabel}</span>
          ${renderAssigneesHtml(assigneesList)}
          ${!isIssue && item.estimation?.endDate
            ? `<span class="item-assignee" style="margin-left:auto;opacity:0.8;">⏱ ${new Date(item.estimation.endDate).toLocaleDateString()}</span>`
            : ""}
        </div>
      </div>
      <div class="item-actions">
        <button class="btn-icon btn-edit" title="Edit">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn-icon btn-delete" title="Delete">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>`;
}

// ── Inline edit panel ─────────────────────────────────────────

const TASK_STATUSES   = ["not started", "inprogress", "reviewing", "testing", "completed"];
const ISSUE_STATUSES  = ["not opened", "opened", "reopened", "closed"];
const TASK_PRIORITIES = ["high", "medium", "low"];
const ISSUE_PRIORITIES = ["critical", "medium", "low"];

// Named colour options — matches web-app exactly
const TAG_COLOR_OPTIONS = [
  { name: "green",  hex: "#10b981" },
  { name: "yellow", hex: "#eab308" },
  { name: "purple", hex: "#a78bfa" },
  { name: "blue",   hex: "#60a5fa" },
  { name: "grey",   hex: "#a3a3a3" },
];

function openEditPanel(type, id) {
  editTitle.disabled   = false;
  btnSaveEdit.disabled = false;

  let item = null;
  if (id) {
    item = type === "task"
      ? state.tasks.find((t) => t.id === id)
      : state.issues.find((i) => i.id === id);
    if (!item) return;
  }

  state.editing = { type, id };
  editPanelTitle.textContent = !id
    ? (type === "task" ? "New Task" : "New Issue")
    : (type === "task" ? "Edit Task" : "Edit Issue");

  // Populate status select
  const statuses = type === "task" ? TASK_STATUSES : ISSUE_STATUSES;
  editStatus.innerHTML = statuses.map((s) =>
    `<option value="${s}" ${item?.status === s ? "selected" : ""}>${s.replace(/_/g, " ")}</option>`
  ).join("");

  // Populate priority select
  const priorities = type === "task" ? TASK_PRIORITIES : ISSUE_PRIORITIES;
  editPriority.innerHTML = priorities.map((p) =>
    `<option value="${p}" ${item?.priority === p ? "selected" : ""}>${p}</option>`
  ).join("");

  // Title & description
  editTitle.value = item?.title ?? "";
  const descEl = $("edit-description");
  if (descEl) descEl.value = item?.description ?? "";

  // Task-specific & Issue-specific fields
  const isTask             = type === "task";
  const taskDates          = $("task-dates");
  const taskTypeRow        = $("task-type-row");
  const taskLinkRow        = $("task-link-row");
  const taskBlocked        = $("task-blocked-row");
  const issueDueDateRow    = $("issue-due-date-row");
  const issueEnvironmentRow = $("issue-environment-row");

  if (taskDates)          taskDates.style.display          = isTask ? "" : "none";
  if (taskTypeRow)        taskTypeRow.style.display        = isTask ? "" : "none";
  if (taskLinkRow)        taskLinkRow.style.display        = "";
  if (taskBlocked)        taskBlocked.style.display        = isTask ? "" : "none";
  if (issueDueDateRow)    issueDueDateRow.style.display    = isTask ? "none" : "";
  if (issueEnvironmentRow) issueEnvironmentRow.style.display = isTask ? "none" : "";

  if (isTask) {
    const startEl = $("edit-start-date");
    const endEl   = $("edit-end-date");
    const todayStr = new Date().toISOString().split("T")[0];

    if (startEl) {
      startEl.min = todayStr;
      startEl.readOnly = false;
      startEl.style.pointerEvents = "";
      startEl.style.opacity = "";

      let startVal = todayStr;
      if (item?.estimation?.startDate) {
        const d = new Date(item.estimation.startDate).toISOString().split("T")[0];
        if (d >= todayStr) startVal = d;
      }
      startEl.value = startVal;
    }

    if (endEl) {
      const startVal  = startEl ? startEl.value : todayStr;
      const nextDay   = new Date(startVal);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split("T")[0];
      endEl.min       = nextDayStr;

      let endVal = item?.estimation?.endDate
        ? new Date(item.estimation.endDate).toISOString().split("T")[0]
        : new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0];

      if (endVal <= startVal) endVal = nextDayStr;
      endEl.value = endVal;
    }

    // Tag — pre-fill label and pick correct named colour dot
    const typeLbl = $("edit-type-label");
    if (typeLbl) typeLbl.value = item?.type?.label ?? "";
    selectTagColor(item?.type?.color ?? "blue");

    const linkEl = $("edit-link-codebase");
    if (linkEl) linkEl.value = item?.linkWithCodebase ?? "";

    const blockedEl = $("edit-is-blocked");
    if (blockedEl) {
      blockedEl.checked  = !!item?.isBlocked;
      blockedEl.disabled = !!item?.isBlocked;
    }
  } else {
    const dueDateEl = $("edit-due-date");
    if (dueDateEl) {
      dueDateEl.value = item?.due_date
        ? new Date(item.due_date).toISOString().split("T")[0]
        : "";
    }

    const envEl = $("edit-environment");
    if (envEl) envEl.value = item?.environment ?? "local";

    const linkEl = $("edit-link-codebase");
    if (linkEl) linkEl.value = item?.fileLinked ?? "";
  }

  buildAvatarAssigneeSelect(
    item?.assigneeIds?.length > 0 ? item.assigneeIds : (item?.assigneeId ? [item.assigneeId] : [])
  );

  if (repoSearch) repoSearch.value = "";

  const activeProj   = state.projects.find((p) => p.id === state.projectId);
  const repoFullName = activeProj?.repoFullName || "";
  post({ type: "FETCH_REPO_STRUCTURE", payload: { repoFullName } });

  editPanel.classList.remove("hidden");
  editTitle.focus();
}

function closeEditPanel() {
  state.editing        = null;
  editPanel.classList.add("hidden");
  editTitle.disabled   = false;
  btnSaveEdit.disabled = false;
}

/**
 * Select a tag colour by its named token (e.g. "blue") or legacy hex.
 * Updates the hidden input and the colour dot UI.
 * @param {string} colorNameOrHex
 */
function selectTagColor(colorNameOrHex) {
  const hiddenInput = $("edit-type-color");
  if (!hiddenInput) return;
  hiddenInput.value = colorNameOrHex;

  const dots = document.querySelectorAll(".tag-color-picker .color-dot");
  dots.forEach((dot) => {
    const dotName = dot.getAttribute("data-color");
    if (dotName === colorNameOrHex) {
      dot.classList.add("active");
      dot.innerHTML = "✓";
    } else {
      dot.classList.remove("active");
      dot.innerHTML = "";
    }
  });
}

function saveEdit() {
  if (!state.editing) { return; }
  const { type, id } = state.editing;

  if (!editTitle.value.trim()) {
    editTitle.focus();
    return;
  }

  const item = id
    ? (type === "task"
        ? state.tasks.find((t) => t.id === id)
        : state.issues.find((i) => i.id === id))
    : null;

  const descEl    = $("edit-description");
  const assigneeEl = $("edit-assignee");

  const payload = {
    title:       editTitle.value.trim(),
    description: descEl?.value?.trim() || undefined,
    status:      editStatus.value || undefined,
  };

  let assigneeIds = [];
  if (assigneeEl?.value) {
    try { assigneeIds = JSON.parse(assigneeEl.value); } catch (e) { assigneeIds = []; }
  }

  if (type === "task") {
    payload.priority    = editPriority.value || undefined;
    payload.assigneeIds = assigneeIds;

    const startEl   = $("edit-start-date");
    const endEl     = $("edit-end-date");
    const typeLbl   = $("edit-type-label");
    const typeClr   = $("edit-type-color");
    const linkEl    = $("edit-link-codebase");
    const blockedEl = $("edit-is-blocked");

    if (startEl?.value && endEl?.value) {
      const todayStr = new Date().toISOString().split("T")[0];
      if (startEl.value < todayStr) {
        alert("Start Date cannot be in the past.");
        startEl.focus();
        return;
      }
      const startT = new Date(startEl.value).getTime();
      const endT   = new Date(endEl.value).getTime();
      if (startT >= endT) {
        alert("End Date must be after the Start Date.");
        endEl.focus();
        return;
      }
      payload.estimation = { startDate: startT, endDate: endT };
    }

    const tagLabel = typeLbl?.value?.trim();
    // Store color as named token — matches web-app format
    payload.type = tagLabel ? { label: tagLabel, color: typeClr?.value ?? "blue" } : null;
    payload.linkWithCodebase = linkEl?.value?.trim() || null;
    payload.isBlocked = blockedEl ? blockedEl.checked : (item?.isBlocked ?? false);
  } else {
    const dueDateEl = $("edit-due-date");
    payload.due_date = dueDateEl?.value ? new Date(dueDateEl.value).getTime() : undefined;

    const envEl = $("edit-environment");
    if (envEl?.value) payload.environment = envEl.value;

    payload.severity = editPriority.value;

    const linkEl = $("edit-link-codebase");
    payload.fileLinked = linkEl?.value?.trim() || null;

    payload.assignees = assigneeIds.map((uid) => {
      const member = state.teamMembers.find((m) => m.userId === uid);
      return {
        userId: uid,
        name:   member?.user?.name || "Unknown",
        avatar: member?.user?.avatarUrl || undefined,
      };
    });
  }

  if (!id) {
    payload.projectId = state.projectId;
    if (type === "task") {
      if (state.sprintId) payload.sprintId = state.sprintId;
      if (!payload.estimation) {
        const now = Date.now();
        payload.estimation = { startDate: now, endDate: now + 86400000 * 7 };
      }
      const blockedEl = $("edit-is-blocked");
      state.pendingMarkAsIssue = blockedEl ? blockedEl.checked : false;
      post({ type: "CREATE_TASK", payload });
    } else {
      payload.type = "manual";
      post({ type: "CREATE_ISSUE", payload });
    }
    editTitle.disabled   = true;
    btnSaveEdit.disabled = true;
  } else {
    if (type === "task") {
      const wasBlocked = item?.isBlocked ?? false;
      const nowBlocked = payload.isBlocked ?? false;
      post({ type: "UPDATE_TASK", payload: { taskId: id, ...payload } });
      if (nowBlocked && !wasBlocked) {
        post({ type: "MARK_TASK_AS_ISSUE", payload: { taskId: id } });
      }
    } else {
      post({ type: "UPDATE_ISSUE", payload: { issueId: id, ...payload } });
    }
  }
}

// ── Rich Avatar Assignee Dropdown ──────────────────────────────

function buildAvatarAssigneeSelect(selectedIds = []) {
  const hiddenInput  = $("edit-assignee");
  const namePreview  = $("assignee-name-preview");
  const avatarPreview = $("assignee-avatar-preview");
  const dropdown     = $("assignee-dropdown");
  const displayBtn   = $("assignee-selected");
  if (!hiddenInput || !dropdown || !displayBtn) { return; }

  let currentSelected = Array.isArray(selectedIds) ? [...selectedIds] : (selectedIds ? [selectedIds] : []);

  const allOptions = state.teamMembers.map((m) => ({
    userId:    m.userId,
    name:      m.user?.name ?? m.userId,
    avatarUrl: m.user?.avatarUrl ?? null,
  }));

  const renderAvatar = (av, nm) => av
    ? `<img src="${esc(av)}" class="mini-avatar-img" style="width:18px;height:18px;border-radius:50%;" />`
    : `<span class="mini-avatar" style="width:18px;height:18px;font-size:9px;flex-shrink:0;">${esc((nm || "?")[0].toUpperCase())}</span>`;

  const renderPreviews = () => {
    hiddenInput.value = JSON.stringify(currentSelected);
    if (currentSelected.length === 0) {
      avatarPreview.innerHTML = `<span style="opacity:0.4;font-size:11px;">?</span>`;
      namePreview.textContent = "Unassigned";
    } else if (currentSelected.length === 1) {
      const m = allOptions.find((o) => o.userId === currentSelected[0]);
      if (m) {
        avatarPreview.innerHTML = renderAvatar(m.avatarUrl, m.name);
        namePreview.textContent = m.name;
      } else {
        avatarPreview.innerHTML = `<span style="opacity:0.4;font-size:11px;">?</span>`;
        namePreview.textContent = "Unknown User";
      }
    } else {
      avatarPreview.innerHTML = currentSelected.slice(0, 2).map((id) => {
        const m = allOptions.find((o) => o.userId === id);
        return m ? renderAvatar(m.avatarUrl, m.name) : "";
      }).join("") + (currentSelected.length > 2 ? `<span style="font-size:9px;margin-left:2px;">+${currentSelected.length - 2}</span>` : "");
      namePreview.textContent = `${currentSelected.length} Assignees`;
    }
  };

  const bindOptions = () => {
    dropdown.innerHTML = allOptions.map((o) => {
      const isSelected = currentSelected.includes(o.userId);
      return `<div class="assignee-option" data-userid="${o.userId}" style="display:flex;align-items:center;justify-content:space-between;width:100%;">
        <div style="display:flex;align-items:center;gap:6px;">
          ${renderAvatar(o.avatarUrl, o.name)}
          <span>${esc(o.name)}</span>
        </div>
        ${isSelected ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ""}
      </div>`;
    }).join("");

    dropdown.querySelectorAll(".assignee-option").forEach((opt) => {
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        const uid = opt.getAttribute("data-userid") ?? "";
        if (currentSelected.includes(uid)) {
          currentSelected = currentSelected.filter((id) => id !== uid);
        } else {
          currentSelected.push(uid);
        }
        renderPreviews();
        bindOptions();
      });
    });
  };

  renderPreviews();
  bindOptions();

  displayBtn.onclick = (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("hidden");
  };

  document.addEventListener("click", (e) => {
    if (dropdown && displayBtn && !dropdown.contains(e.target) && !displayBtn.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });
}

// ── Confirm delete ─────────────────────────────────────────────

function confirmDelete(type, id) {
  const name = type === "task"
    ? (state.tasks.find((t) => t.id === id)?.title ?? "this task")
    : (state.issues.find((i) => i.id === id)?.title ?? "this issue");

  const promptText = window.prompt(`To delete "${name}", please type "delete" below to confirm:`);
  if (promptText === null || promptText.trim().toLowerCase() !== "delete") { return; }

  if (type === "task") {
    post({ type: "DELETE_TASK",  payload: { taskId: id } });
  } else {
    post({ type: "DELETE_ISSUE", payload: { issueId: id } });
  }
}

// ── Tab switching ─────────────────────────────────────────────

function renderStatusTabs() {
  const container = $("status-tabs");
  if (!container) return;

  const statuses = state.activeView === "tasks"
    ? [
        { val: "all",          label: "All" },
        { val: "not started",  label: "Not Started" },
        { val: "inprogress",   label: "In Progress" },
        { val: "reviewing",    label: "Reviewing" },
        { val: "testing",      label: "Testing" },
        { val: "completed",    label: "Completed" },
      ]
    : [
        { val: "all",        label: "All" },
        { val: "not opened", label: "Not Opened" },
        { val: "opened",     label: "Opened" },
        { val: "reopened",   label: "Reopened" },
        { val: "closed",     label: "Closed" },
      ];

  if (!statuses.find((s) => s.val === state.activeStatus)) {
    state.activeStatus = "all";
  }

  container.innerHTML = statuses.map((s) =>
    `<button class="tab ${state.activeStatus === s.val ? "active" : ""}" data-status="${s.val}">${s.label}</button>`
  ).join("");

  container.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      container.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.activeStatus = tab.getAttribute("data-status");
      renderItems();
    });
  });
}

mainTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    mainTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    state.activeView = tab.getAttribute("data-view");
    renderStatusTabs();
    closeEditPanel();
    renderItems();
  });
});

renderStatusTabs();

// ── Screen switching ──────────────────────────────────────────

function showScreen(name) {
  screenLogin.classList.add("hidden");
  screenLoading.classList.add("hidden");
  screenMain.classList.add("hidden");
  ({ login: screenLogin, loading: screenLoading, main: screenMain }[name])
    ?.classList.remove("hidden");
}

function showError(msg) {
  console.error("[Wekraft]", msg);
  if (screenMain.classList.contains("hidden")) { showScreen("main"); }
  itemList.innerHTML = `
    <div class="empty-state" style="color:var(--vscode-errorForeground)">
      ⚠ ${esc(msg)}
    </div>`;
}

// ── Utilities ─────────────────────────────────────────────────

function post(msg) { vscode.postMessage(msg); }

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Wire up buttons ───────────────────────────────────────────

btnLogin.addEventListener("click",   () => post({ type: "LOGIN_REQUEST" }));
btnLogout.addEventListener("click",  () => post({ type: "LOGOUT_REQUEST" }));
btnSaveEdit.addEventListener("click",  saveEdit);
btnCloseEdit.addEventListener("click", closeEditPanel);

const btnClearCodebase  = $("btn-clear-codebase");
const editLinkCodebase  = $("edit-link-codebase");
if (btnClearCodebase && editLinkCodebase) {
  btnClearCodebase.addEventListener("click", () => {
    editLinkCodebase.value = "";
    repoTree?.querySelectorAll(".tree-node.active-file").forEach((n) => n.classList.remove("active-file"));
  });
}

const repoStructureContainer = $("repo-structure-container");
if (editLinkCodebase && repoStructureContainer) {
  editLinkCodebase.addEventListener("click", (e) => {
    e.stopPropagation();
    repoStructureContainer.classList.toggle("hidden");
  });
  repoStructureContainer.addEventListener("click", (e) => e.stopPropagation());
}

document.addEventListener("click", (e) => {
  if (repoStructureContainer && !e.target.closest("#task-link-row")) {
    repoStructureContainer.classList.add("hidden");
  }
});

btnNewItem.addEventListener("click", () => {
  openEditPanel(state.activeView === "issues" ? "issue" : "task", null);
});

editTitle.addEventListener("keydown", (e) => {
  if (e.key === "Enter")  { saveEdit(); }
  if (e.key === "Escape") { closeEditPanel(); }
});

// Date validation
const startDateEl = $("edit-start-date");
const endDateEl   = $("edit-end-date");
if (startDateEl && endDateEl) {
  startDateEl.addEventListener("change", () => {
    if (startDateEl.value) {
      const nextDay = new Date(startDateEl.value);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split("T")[0];
      endDateEl.min = nextDayStr;
      if (endDateEl.value && endDateEl.value <= startDateEl.value) {
        endDateEl.value = nextDayStr;
      }
    }
  });
}

// ── Repository Structure Tree Rendering ──────────────────────

function renderRepoTree(nodes, container, searchQuery = "") {
  if (!container) return;
  container.innerHTML = "";
  if (!nodes || nodes.length === 0) {
    container.innerHTML = `<div class="empty-state" style="font-size:11px;">No files found in repository.</div>`;
    return;
  }

  const query = searchQuery.toLowerCase().trim();
  const linkEl = $("edit-link-codebase");

  function buildNodeHtml(node, depth = 0) {
    const isDir = node.type === "directory";

    if (query) {
      if (isDir) {
        if (!checkHasMatchingChild(node, query)) return null;
      } else {
        if (!node.name.toLowerCase().includes(query) && !node.path.toLowerCase().includes(query)) return null;
      }
    }

    const iconHtml = isDir
      ? `<svg class="folder-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`
      : `<svg class="file-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;

    const isActive   = linkEl && linkEl.value === node.path;
    const activeClass = isActive ? "active-file" : "";

    const itemEl = document.createElement("div");
    itemEl.className   = `tree-node ${activeClass}`;
    itemEl.dataset.path = node.path;
    itemEl.dataset.type = node.type;
    itemEl.innerHTML = `
      <span class="tree-node-icon">${iconHtml}</span>
      <span class="tree-node-label" title="${esc(node.name)}">${esc(node.name)}</span>
    `;

    const wrapper = document.createElement("div");
    wrapper.appendChild(itemEl);

    if (isDir && node.children?.length > 0) {
      const childContainer = document.createElement("div");
      childContainer.className = "tree-children";
      if (!query) childContainer.classList.add("collapsed");

      node.children.forEach((child) => {
        const childNode = buildNodeHtml(child, depth + 1);
        if (childNode) childContainer.appendChild(childNode);
      });

      wrapper.appendChild(childContainer);

      itemEl.addEventListener("click", (e) => {
        e.stopPropagation();
        childContainer.classList.toggle("collapsed");
      });
    } else if (!isDir) {
      itemEl.addEventListener("click", (e) => {
        e.stopPropagation();
        container.querySelectorAll(".tree-node.active-file").forEach((n) => n.classList.remove("active-file"));
        itemEl.classList.add("active-file");
        if (linkEl) linkEl.value = node.path;
        const dropdown = $("repo-structure-container");
        if (dropdown) dropdown.classList.add("hidden");
      });
    }

    return wrapper;
  }

  function checkHasMatchingChild(dirNode, q) {
    if (dirNode.name.toLowerCase().includes(q) || dirNode.path.toLowerCase().includes(q)) return true;
    return dirNode.children?.some((child) => checkHasMatchingChild(child, q)) ?? false;
  }

  nodes.forEach((node) => {
    const nodeEl = buildNodeHtml(node);
    if (nodeEl) container.appendChild(nodeEl);
  });
}

// ── Boot ──────────────────────────────────────────────────────

post({ type: "READY" });
