import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create or update the deadline for a specific repo.
 * One row per (user_id × repo_full_name) — uses the by_user_and_repo index.
 */
export const upsert = mutation({
  args: {
    userId:       v.id("users"),
    repoFullName: v.string(),
    deadlineTs:   v.number(),
    note:         v.optional(v.string()),
  },
  handler: async (ctx, { userId, repoFullName, deadlineTs, note }) => {
    const existing = await ctx.db
      .query("deadlines")
      .withIndex("by_user_and_repo", (q) =>
        q.eq("user_id", userId).eq("repo_full_name", repoFullName)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        deadline_ts: deadlineTs,
        ...(note !== undefined ? { note } : {}),
      });
      return existing._id;
    }

    return ctx.db.insert("deadlines", {
      user_id:        userId,
      repo_full_name: repoFullName,
      deadline_ts:    deadlineTs,
      ...(note !== undefined ? { note } : {}),
    });
  },
});

/**
 * Delete the deadline for a specific repo.
 */
export const remove = mutation({
  args: {
    userId:       v.id("users"),
    repoFullName: v.string(),
  },
  handler: async (ctx, { userId, repoFullName }) => {
    const existing = await ctx.db
      .query("deadlines")
      .withIndex("by_user_and_repo", (q) =>
        q.eq("user_id", userId).eq("repo_full_name", repoFullName)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All deadlines for a user — bounded to 100 (free tier max is 3, pro is sane).
 */
export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }): Promise<Doc<"deadlines">[]> => {
    return ctx.db
      .query("deadlines")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .take(100);
  },
});

/**
 * Single deadline for a specific repo.
 */
export const getForRepo = query({
  args: {
    userId:       v.id("users"),
    repoFullName: v.string(),
  },
  handler: async (ctx, { userId, repoFullName }): Promise<Doc<"deadlines"> | null> => {
    return ctx.db
      .query("deadlines")
      .withIndex("by_user_and_repo", (q) =>
        q.eq("user_id", userId).eq("repo_full_name", repoFullName)
      )
      .unique();
  },
});

/**
 * Count of active deadlines — used by extension to enforce plan limits.
 */
export const countForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }): Promise<number> => {
    const rows = await ctx.db
      .query("deadlines")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .take(100);
    return rows.length;
  },
});
