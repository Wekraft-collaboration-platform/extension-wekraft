import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ── users ──────────────────────────────────────────────────────────────────
  // One row per GitHub user. Created / refreshed on every sign-in.
  users: defineTable({
    github_id:    v.number(),
    github_login: v.string(),
    name:         v.string(),
    email:        v.union(v.string(), v.null()),
    avatar_url:   v.string(),
    plan:         v.union(v.literal("free"), v.literal("pro")),
  }).index("by_github_id", ["github_id"]),

  // ── deadlines ──────────────────────────────────────────────────────────────
  // One row per (user × repo). Upserting replaces the existing deadline.
  deadlines: defineTable({
    user_id:        v.id("users"),
    repo_full_name: v.string(),
    deadline_ts:    v.number(),
    note:           v.optional(v.string()),
  })
    .index("by_user",          ["user_id"])
    .index("by_user_and_repo", ["user_id", "repo_full_name"]),

  // ── todos ──────────────────────────────────────────────────────────────────
  // Standalone Notion-like todo items owned by a user.
  // repo_full_name is optional: null = personal task, set = repo-specific task.
  todos: defineTable({
    user_id:        v.id("users"),
    title:          v.string(),
    description:    v.optional(v.string()),
    status:         v.union(
                      v.literal("todo"),
                      v.literal("in_progress"),
                      v.literal("done"),
                      v.string()   // legacy: old rows may have stored other status strings (e.g. "open")
                    ),
    priority:       v.union(
                      v.literal("low"),
                      v.literal("medium"),
                      v.literal("high"),
                      v.literal("critical"),
                      v.number()   // legacy: old rows stored numeric priority (e.g. 3.0)
                    ),
    repo_full_name: v.optional(v.string()),  // null = personal/standalone todo
    tags:           v.optional(v.array(v.string())),
  })
    .index("by_user",            ["user_id"])
    .index("by_user_and_status", ["user_id", "status"])
    .index("by_user_and_repo",   ["user_id", "repo_full_name"]),
});
