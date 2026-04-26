// ─────────────────────────────────────────────────────────────────────────────
// Plan & Feature Limits
// ─────────────────────────────────────────────────────────────────────────────

export type PlanTier = "free" | "pro";

export const PLAN_LIMITS: Record<PlanTier, { deadlines: number; todos: number }> = {
  free: { deadlines: 3,        todos: 10 },
  pro:  { deadlines: Infinity, todos: Infinity },
};

// ─────────────────────────────────────────────────────────────────────────────
// GitHub API Types (raw shapes returned by github.com/api)
// ─────────────────────────────────────────────────────────────────────────────

export type GitHubProfile = {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  html_url: string;
};

export type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  updated_at: string;
  language: string | null;
  stargazers_count: number;
};

export type GitHubCommit = {
  sha: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string };
  };
  stats?: { additions: number; deletions: number; total: number };
  files?: Array<{
    filename: string;
    status: "added" | "removed" | "modified" | "renamed";
    additions: number;
    deletions: number;
  }>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Convex DB Types (shapes returned / sent to Convex backend)
// ─────────────────────────────────────────────────────────────────────────────

export type ConvexUser = {
  _id: string;          // Convex document ID
  github_id: number;
  github_login: string;
  name: string;
  email: string | null;
  avatar_url: string;
  plan: PlanTier;
  created_at: number;   // epoch ms
};

export type Deadline = {
  _id: string;
  user_id: string;          // Convex user _id
  repo_full_name: string;   // e.g. "bhanu/my-repo"
  deadline_ts: number;      // epoch ms
  note?: string;
  created_at: number;
};

export type TodoStatus   = "todo" | "in_progress" | "done";
export type TodoPriority = "low" | "medium" | "high" | "critical";

export type Todo = {
  _id:             string;
  _creationTime:   number;    // Convex auto-field
  user_id:         string;
  title:           string;
  description?:    string;
  status:          TodoStatus;
  priority:        TodoPriority;
  repo_full_name?: string;    // undefined = personal/standalone task
  tags?:           string[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Git / Pre-push Types
// ─────────────────────────────────────────────────────────────────────────────

export type PushStats = {
  added: number;
  removed: number;
};

export type SecretHit = {
  rule: string;
  file: string;
  line: number;
  preview: string;
};

export type PrePushReport = {
  timestamp: string;
  branch: string;
  comparedRange: string;
  stats: PushStats;
  secrets: SecretHit[];
  blocked: boolean;
};
