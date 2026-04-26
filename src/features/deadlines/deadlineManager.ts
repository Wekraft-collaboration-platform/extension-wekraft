/**
 * features/deadlines/deadlineManager.ts
 *
 * Manages repo deadlines:
 *  - In-memory cache for instant UI rendering
 *  - Writes through to Convex on every change
 *  - Enforces plan limits (free = 3 deadlines)
 */

import { Deadline, ConvexUser, PLAN_LIMITS } from "../../shared/types";
import { safeListDeadlines, safeUpsertDeadline, safeRemoveDeadline } from "../../convex/api";

// In-memory store: repoFullName → Deadline
const _cache = new Map<string, Deadline>();
let _userId: string | null = null;
let _plan: ConvexUser["plan"] = "free";

// ─────────────────────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────────────────────

/** Called after login. Loads deadlines from Convex and populates cache. */
export async function initDeadlines(user: ConvexUser): Promise<void> {
  _userId = user._id;
  _plan = user.plan;
  _cache.clear();

  const deadlines = await safeListDeadlines(user._id);
  for (const d of deadlines) {
    _cache.set(d.repo_full_name, d);
  }
  console.log(`✅ GitPilot: loaded ${deadlines.length} deadlines for ${user.github_login}`);
}

/** Resets state on logout. */
export function clearDeadlines(): void {
  _cache.clear();
  _userId = null;
  _plan = "free";
}

// ─────────────────────────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────────────────────────

export function getDeadline(repoFullName: string): Deadline | null {
  return _cache.get(repoFullName) ?? null;
}

export function getAllDeadlines(): Map<string, Deadline> {
  return _cache;
}

export function getDeadlineCount(): number {
  return _cache.size;
}

export function canAddDeadline(): { allowed: boolean; reason?: string } {
  const limit = PLAN_LIMITS[_plan].deadlines;
  if (_cache.size < limit) return { allowed: true };
  return {
    allowed: false,
    reason: `Free plan allows ${limit} deadline${limit === 1 ? "" : "s"}. Upgrade to Pro for unlimited tracking.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Write
// ─────────────────────────────────────────────────────────────────────────────

export type SetDeadlineResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function setDeadline(
  repoFullName: string,
  deadlineTs: number
): Promise<SetDeadlineResult> {
  if (!_userId) return { ok: false, reason: "Not signed in." };

  // Check plan limit — only if this is a NEW repo (not updating existing)
  const isNew = !_cache.has(repoFullName);
  if (isNew) {
    const check = canAddDeadline();
    if (!check.allowed) return { ok: false, reason: check.reason! };
  }

  // Write to Convex
  const saved = await safeUpsertDeadline(_userId, repoFullName, deadlineTs);

  // Update cache immediately so UI reflects instantly
  _cache.set(repoFullName, {
    _id:            `local_${repoFullName}`,   // will be overwritten on next sync
    user_id:        _userId,
    repo_full_name: repoFullName,
    deadline_ts:    deadlineTs,
    created_at:     Date.now(),
  });

  if (!saved) {
    console.warn("GitPilot: Convex unavailable — deadline saved to local cache only");
  }

  return { ok: true };
}

export async function removeDeadline(repoFullName: string): Promise<void> {
  if (!_userId) return;
  _cache.delete(repoFullName);
  await safeRemoveDeadline(_userId, repoFullName);
}
