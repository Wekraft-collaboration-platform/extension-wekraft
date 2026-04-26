import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upsert a GitHub user on every sign-in.
 * Returns the full user document (existing or newly created).
 */
export const registerOrGet = mutation({
  args: {
    github_id:    v.number(),
    github_login: v.string(),
    name:         v.string(),
    email:        v.union(v.string(), v.null()),
    avatar_url:   v.string(),
  },
  handler: async (ctx, args): Promise<Doc<"users">> => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_github_id", (q) => q.eq("github_id", args.github_id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        github_login: args.github_login,
        name:         args.name,
        email:        args.email,
        avatar_url:   args.avatar_url,
      });
      // Return updated doc
      return (await ctx.db.get(existing._id))!;
    }

    const id = await ctx.db.insert("users", {
      ...args,
      plan: "free",
    });
    return (await ctx.db.get(id))!;
  },
});

/**
 * Upgrade or downgrade a user's plan.
 */
export const setPlan = mutation({
  args: {
    userId: v.id("users"),
    plan:   v.union(v.literal("free"), v.literal("pro")),
  },
  handler: async (ctx, { userId, plan }) => {
    await ctx.db.patch(userId, { plan });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }): Promise<Doc<"users"> | null> => {
    return ctx.db.get(userId);
  },
});

export const getByGithubId = query({
  args: { github_id: v.number() },
  handler: async (ctx, { github_id }): Promise<Doc<"users"> | null> => {
    return ctx.db
      .query("users")
      .withIndex("by_github_id", (q) => q.eq("github_id", github_id))
      .unique();
  },
});
