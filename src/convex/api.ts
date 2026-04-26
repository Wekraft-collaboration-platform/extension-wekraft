/**
 * convex/api.ts — Typed wrappers for all Convex queries and mutations.
 * Updated to match new schema: todos with optional repo, new status/priority enums.
 */

import { getConvex, isConvexReady } from "./client";
import { ConvexUser, Deadline, GitHubProfile, Todo, TodoStatus, TodoPriority } from "../shared/types";

// ─────────────────────────────────────────────────────────────────────────────
// Low-level helpers (string-based keys work with ConvexHttpClient v1.x)
// ─────────────────────────────────────────────────────────────────────────────

function q(name: string, args: Record<string, unknown>): Promise<unknown> {
  return (getConvex().query as (name: string, args: Record<string, unknown>) => Promise<unknown>)(name, args);
}

function m(name: string, args: Record<string, unknown>): Promise<unknown> {
  return (getConvex().mutation as (name: string, args: Record<string, unknown>) => Promise<unknown>)(name, args);
}

// ─────────────────────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────────────────────

export const usersApi = {
  async registerOrGet(profile: GitHubProfile): Promise<ConvexUser> {
    return (await m("users:registerOrGet", {
      github_id:    profile.id,
      github_login: profile.login,
      name:         profile.name ?? profile.login,
      email:        profile.email ?? null,
      avatar_url:   profile.avatar_url,
    })) as ConvexUser;
  },

  async getById(userId: string): Promise<ConvexUser | null> {
    return (await q("users:getById", { userId })) as ConvexUser | null;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Deadlines
// ─────────────────────────────────────────────────────────────────────────────

export const deadlinesApi = {
  async list(userId: string): Promise<Deadline[]> {
    return (await q("deadlines:list", { userId })) as Deadline[];
  },

  async upsert(userId: string, repoFullName: string, deadlineTs: number): Promise<void> {
    await m("deadlines:upsert", { userId, repoFullName, deadlineTs });
  },

  async remove(userId: string, repoFullName: string): Promise<void> {
    await m("deadlines:remove", { userId, repoFullName });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Todos
// ─────────────────────────────────────────────────────────────────────────────

export const todosApi = {
  /** All todos for a user (personal + repo-linked). */
  async listAll(userId: string): Promise<Todo[]> {
    return (await q("todos:listAll", { userId })) as Todo[];
  },

  /** Todos for a specific repo. */
  async listForRepo(userId: string, repoFullName: string): Promise<Todo[]> {
    return (await q("todos:listForRepo", { userId, repoFullName })) as Todo[];
  },

  /** Create a new todo — repoFullName is optional (omit for personal tasks). */
  async create(
    userId: string,
    title: string,
    priority: TodoPriority = "medium",
    description?: string,
    repoFullName?: string,
  ): Promise<string> {
    return (await m("todos:create", {
      userId,
      title,
      ...(priority     ? { priority }     : {}),
      ...(description  ? { description }  : {}),
      ...(repoFullName ? { repoFullName } : {}),
    })) as string;
  },

  async updateStatus(todoId: string, status: TodoStatus): Promise<void> {
    await m("todos:updateStatus", { todoId, status });
  },

  async updateTitle(todoId: string, title: string): Promise<void> {
    await m("todos:updateTitle", { todoId, title });
  },

  async updateDescription(todoId: string, description: string | undefined): Promise<void> {
    await m("todos:updateDescription", { todoId, description });
  },

  async remove(todoId: string): Promise<void> {
    await m("todos:remove", { todoId });
  },

  async clearDone(userId: string): Promise<number> {
    return (await m("todos:clearDone", { userId })) as number;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Safe wrappers — return empty/null instead of throwing when Convex is offline
// ─────────────────────────────────────────────────────────────────────────────

export async function safeRegisterOrGet(profile: GitHubProfile): Promise<ConvexUser | null> {
  if (!isConvexReady()) return null;
  try { return await usersApi.registerOrGet(profile); }
  catch (e) { console.error("GitPilot Convex: registerOrGet failed", e); return null; }
}

export async function safeListDeadlines(userId: string): Promise<Deadline[]> {
  if (!isConvexReady()) return [];
  try { return await deadlinesApi.list(userId); }
  catch (e) { console.error("GitPilot Convex: deadlines.list failed", e); return []; }
}

export async function safeUpsertDeadline(userId: string, repoFullName: string, deadlineTs: number): Promise<boolean> {
  if (!isConvexReady()) return false;
  try { await deadlinesApi.upsert(userId, repoFullName, deadlineTs); return true; }
  catch (e) { console.error("GitPilot Convex: deadlines.upsert failed", e); return false; }
}

export async function safeRemoveDeadline(userId: string, repoFullName: string): Promise<boolean> {
  if (!isConvexReady()) return false;
  try { await deadlinesApi.remove(userId, repoFullName); return true; }
  catch (e) { console.error("GitPilot Convex: deadlines.remove failed", e); return false; }
}

export async function safeListAllTodos(userId: string): Promise<Todo[]> {
  if (!isConvexReady()) return [];
  try { return await todosApi.listAll(userId); }
  catch (e) { console.error("GitPilot Convex: todos.listAll failed", e); return []; }
}

export async function safeListTodosForRepo(userId: string, repoFullName: string): Promise<Todo[]> {
  if (!isConvexReady()) return [];
  try { return await todosApi.listForRepo(userId, repoFullName); }
  catch (e) { console.error("GitPilot Convex: todos.listForRepo failed", e); return []; }
}

// Keep old name for backward compat with deadlineManager
export const safeListTodos = safeListTodosForRepo;
