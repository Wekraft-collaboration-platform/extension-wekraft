import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

type PriorityStr = "low" | "medium" | "high" | "critical";
type StatusStr   = "todo" | "in_progress" | "done";

/**
 * Legacy rows may have stored a numeric priority (e.g. 3.0).
 * Coerce to the nearest string label so clients always see a valid value.
 */
function coercePriority(raw: unknown): PriorityStr {
  if (raw === "low" || raw === "medium" || raw === "high" || raw === "critical") return raw;
  const map: Record<number, PriorityStr> = { 1: "low", 2: "medium", 3: "high", 4: "critical" };
  if (typeof raw === "number" && map[Math.round(raw)]) return map[Math.round(raw)];
  return "medium";
}

/**
 * Legacy rows may have stored status strings like "open".
 * Map any unknown string to "todo" so clients always see a valid value.
 */
function coerceStatus(raw: unknown): StatusStr {
  if (raw === "todo" || raw === "in_progress" || raw === "done") return raw;
  if (raw === "open" || raw === "pending") return "todo";
  if (raw === "completed" || raw === "closed") return "done";
  return "todo";
}

function normaliseTodo(t: Doc<"todos">): Doc<"todos"> & { priority: PriorityStr; status: StatusStr } {
  return { ...t, priority: coercePriority(t.priority), status: coerceStatus(t.status) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new personal todo (no repo association).
 */
export const create = mutation({
  args: {
    userId:      v.id("users"),
    title:       v.string(),
    description: v.optional(v.string()),
    priority:    v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical"))
    ),
    repoFullName: v.optional(v.string()),
    tags:         v.optional(v.array(v.string())),
  },
  handler: async (ctx, { userId, title, description, priority, repoFullName, tags }) => {
    return ctx.db.insert("todos", {
      user_id:        userId,
      title:          title.trim(),
      description,
      status:         "todo",
      priority:       priority ?? "medium",
      repo_full_name: repoFullName,
      tags,
    });
  },
});

/**
 * Cycle the status of a todo: todo → in_progress → done → todo
 */
export const updateStatus = mutation({
  args: {
    todoId: v.id("todos"),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
  },
  handler: async (ctx, { todoId, status }) => {
    await ctx.db.patch(todoId, { status });
  },
});

/**
 * Update the title of a todo.
 */
export const updateTitle = mutation({
  args: {
    todoId: v.id("todos"),
    title:  v.string(),
  },
  handler: async (ctx, { todoId, title }) => {
    await ctx.db.patch(todoId, { title: title.trim() });
  },
});

/**
 * Update the description of a todo.
 */
export const updateDescription = mutation({
  args: {
    todoId:      v.id("todos"),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { todoId, description }) => {
    await ctx.db.patch(todoId, { description });
  },
});

/**
 * Update the priority of a todo.
 */
export const updatePriority = mutation({
  args: {
    todoId:   v.id("todos"),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
  },
  handler: async (ctx, { todoId, priority }) => {
    await ctx.db.patch(todoId, { priority });
  },
});

/**
 * Delete a todo permanently.
 */
export const remove = mutation({
  args: { todoId: v.id("todos") },
  handler: async (ctx, { todoId }) => {
    await ctx.db.delete(todoId);
  },
});

/**
 * Delete all done todos for a user (bulk cleanup).
 */
export const clearDone = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }): Promise<number> => {
    const done = await ctx.db
      .query("todos")
      .withIndex("by_user_and_status", (q) =>
        q.eq("user_id", userId).eq("status", "done")
      )
      .take(200);

    for (const t of done) {
      await ctx.db.delete(t._id);
    }
    return done.length;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All todos for a user (personal + repo-linked), sorted newest first.
 * Bounded to 200 for safety.
 */
export const listAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("todos")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .order("desc")
      .take(200);
    return rows.map(normaliseTodo);
  },
});

/**
 * Todos for a specific repo (repo-linked tasks).
 */
export const listForRepo = query({
  args: {
    userId:       v.id("users"),
    repoFullName: v.string(),
  },
  handler: async (ctx, { userId, repoFullName }) => {
    const rows = await ctx.db
      .query("todos")
      .withIndex("by_user_and_repo", (q) =>
        q.eq("user_id", userId).eq("repo_full_name", repoFullName)
      )
      .order("desc")
      .take(50);
    return rows.map(normaliseTodo);
  },
});

/**
 * Count of all todos for a user. Used to enforce plan limits.
 */
export const countForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }): Promise<number> => {
    const rows = await ctx.db
      .query("todos")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .take(50);
    return rows.length;
  },
});
