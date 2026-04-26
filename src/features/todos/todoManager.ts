/**
 * features/todos/todoManager.ts
 *
 * Manages both personal todos (no repo) and per-repo todos.
 * Cache key: "__personal__" for personal tasks, or repoFullName for repo tasks.
 */

import { Todo, TodoStatus, TodoPriority, ConvexUser, PLAN_LIMITS } from "../../shared/types";
import { safeListAllTodos, safeListTodosForRepo, todosApi } from "../../convex/api";
import { isConvexReady } from "../../convex/client";

const PERSONAL_KEY = "__personal__";

// Cache: PERSONAL_KEY or repoFullName → Todo[]
const _cache = new Map<string, Todo[]>();
let _userId: string | null   = null;
let _plan: ConvexUser["plan"] = "free";

// ─────────────────────────────────────────────────────────────────────────────
// Init / Teardown
// ─────────────────────────────────────────────────────────────────────────────

export function initTodos(user: ConvexUser): void {
  _userId = user._id;
  _plan   = user.plan;
  _cache.clear();
}

export function clearTodos(): void {
  _cache.clear();
  _userId = null;
  _plan   = "free";
}

// ─────────────────────────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────────────────────────

/** All personal todos (no repo attached). Fetches from Convex on first call. */
export async function getPersonalTodos(): Promise<Todo[]> {
  if (_cache.has(PERSONAL_KEY)) {
    return _cache.get(PERSONAL_KEY)!;
  }
  if (!_userId) return [];

  // Fetch all and filter for personal (no repo_full_name)
  const all = await safeListAllTodos(_userId);
  const personal = all.filter((t) => !t.repo_full_name);
  _cache.set(PERSONAL_KEY, personal);
  return personal;
}

/** Todos for a specific repo. */
export async function getTodos(repoFullName: string): Promise<Todo[]> {
  if (_cache.has(repoFullName)) return _cache.get(repoFullName)!;
  if (!_userId) return [];

  const todos = await safeListTodosForRepo(_userId, repoFullName);
  _cache.set(repoFullName, todos);
  return todos;
}

export function getTotalTodoCount(): number {
  let n = 0;
  for (const todos of _cache.values()) n += todos.length;
  return n;
}

export function canAddTodo(): { allowed: boolean; reason?: string } {
  const limit = PLAN_LIMITS[_plan].todos;
  const total = getTotalTodoCount();
  if (total < limit) return { allowed: true };
  return {
    allowed: false,
    reason:  `Free plan allows ${limit} todos. Upgrade to Pro for unlimited todos.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Write
// ─────────────────────────────────────────────────────────────────────────────

export type TodoResult = { ok: true; todo: Todo } | { ok: false; reason: string };

/** Create a personal (standalone) todo — not tied to any repo. */
export async function createPersonalTodo(
  title: string,
  priority: TodoPriority = "medium",
  description?: string,
): Promise<TodoResult> {
  if (!_userId) return { ok: false, reason: "Not signed in." };
  if (!title.trim()) return { ok: false, reason: "Title cannot be empty." };

  const check = canAddTodo();
  if (!check.allowed) return { ok: false, reason: check.reason! };

  const now = Date.now();
  let newTodo: Todo;

  if (isConvexReady()) {
    try {
      const id = await todosApi.create(_userId, title.trim(), priority, description);
      newTodo = localTodo(_userId, title, priority, now, description, undefined, id);
    } catch (e) {
      console.error("GitPilot: createPersonalTodo Convex failed", e);
      newTodo = localTodo(_userId, title, priority, now, description);
    }
  } else {
    newTodo = localTodo(_userId, title, priority, now, description);
  }

  const list = _cache.get(PERSONAL_KEY) ?? [];
  list.unshift(newTodo);
  _cache.set(PERSONAL_KEY, list);
  return { ok: true, todo: newTodo };
}

/** Create a repo-linked todo. */
export async function createTodo(
  repoFullName: string,
  title: string,
  priority: TodoPriority = "medium",
): Promise<TodoResult> {
  if (!_userId) return { ok: false, reason: "Not signed in." };
  if (!title.trim()) return { ok: false, reason: "Title cannot be empty." };

  const check = canAddTodo();
  if (!check.allowed) return { ok: false, reason: check.reason! };

  const now = Date.now();
  let newTodo: Todo;

  if (isConvexReady()) {
    try {
      const id = await todosApi.create(_userId, title.trim(), priority, undefined, repoFullName);
      newTodo = localTodo(_userId, title, priority, now, undefined, repoFullName, id);
    } catch (e) {
      console.error("GitPilot: createTodo Convex failed", e);
      newTodo = localTodo(_userId, title, priority, now, undefined, repoFullName);
    }
  } else {
    newTodo = localTodo(_userId, title, priority, now, undefined, repoFullName);
  }

  const list = _cache.get(repoFullName) ?? [];
  list.unshift(newTodo);
  _cache.set(repoFullName, list);
  return { ok: true, todo: newTodo };
}

/** Update status — works for both personal and repo todos. Uses todoId directly. */
export async function updateTodoStatus(
  cacheKey: string,  // PERSONAL_KEY or repoFullName
  todoId: string,
  status: TodoStatus,
): Promise<boolean> {
  const list = _cache.get(cacheKey);
  if (list) {
    const todo = list.find((t) => t._id === todoId);
    if (todo) {
      todo.status = status;
      _cache.set(cacheKey, list);
    }
  }

  if (isConvexReady()) {
    try { await todosApi.updateStatus(todoId, status); } catch (e) {
      console.error("GitPilot: updateTodoStatus Convex failed", e);
    }
  }
  return true;
}

/** Update description — optimistic cache update + Convex sync. */
export async function updateTodoDescription(
  cacheKey: string,
  todoId: string,
  description: string | undefined,
): Promise<boolean> {
  const list = _cache.get(cacheKey);
  if (list) {
    const todo = list.find((t) => t._id === todoId);
    if (todo) {
      todo.description = description;
      _cache.set(cacheKey, list);
    }
  }

  if (isConvexReady()) {
    try { await todosApi.updateDescription(todoId, description); } catch (e) {
      console.error("GitPilot: updateTodoDescription Convex failed", e);
    }
  }
  return true;
}

/** Remove a todo by ID. */
export async function removeTodo(cacheKey: string, todoId: string): Promise<boolean> {
  const list = _cache.get(cacheKey);
  if (list) {
    const idx = list.findIndex((t) => t._id === todoId);
    if (idx !== -1) {
      list.splice(idx, 1);
      _cache.set(cacheKey, list);
    }
  }

  if (isConvexReady()) {
    try { await todosApi.remove(todoId); } catch (e) {
      console.error("GitPilot: removeTodo Convex failed", e);
    }
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function localTodo(
  userId: string,
  title: string,
  priority: TodoPriority,
  now: number,
  description?: string,
  repoFullName?: string,
  id?: string,
): Todo {
  return {
    _id:            id ?? `local_${now}_${Math.random().toString(36).slice(2, 7)}`,
    _creationTime:  now,
    user_id:        userId,
    title:          title.trim(),
    description,
    status:         "todo",
    priority,
    repo_full_name: repoFullName,
  };
}

export { PERSONAL_KEY };
