import * as fs   from "node:fs";
import * as path from "node:path";

export function installPrePushHook(repoRoot: string): { installed: boolean; reason?: string } {
  const gitDir = path.join(repoRoot, ".git");
  if (!fs.existsSync(gitDir)) {
    return { installed: false, reason: "No .git directory found in the current workspace." };
  }

  const pilotDir = path.join(repoRoot, ".gitpilot");
  fs.mkdirSync(pilotDir, { recursive: true });

  const runtimePath = path.join(pilotDir, "prepush-runtime.cjs");
  fs.writeFileSync(runtimePath, runtimeScript(), "utf8");

  const hooksDir = path.join(gitDir, "hooks");
  fs.mkdirSync(hooksDir, { recursive: true });

  const hookPath = path.join(hooksDir, "pre-push");
  fs.writeFileSync(hookPath, "#!/usr/bin/env sh\nnode .gitpilot/prepush-runtime.cjs\n", "utf8");
  fs.chmodSync(hookPath, 0o755);

  return { installed: true };
}

function runtimeScript(): string {
  return `const fs = require("node:fs");
const cp = require("node:child_process");

function run(cmd) {
  return cp.execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function numStats(range) {
  const rows = run(\`git diff --numstat \${range}\`).split(/\\r?\\n/).filter(Boolean);
  let added = 0, removed = 0;
  for (const row of rows) {
    const [a, r] = row.split("\\t");
    const ai = parseInt(a, 10), ri = parseInt(r, 10);
    if (!isNaN(ai)) added   += ai;
    if (!isNaN(ri)) removed += ri;
  }
  return { added, removed };
}

function scanSecrets(range) {
  const patch = run(\`git diff --unified=0 \${range}\`);
  const rules = [
    { name: "OpenAI Key",      regex: /sk-[A-Za-z0-9]{20,}/ },
    { name: "GitHub Token",    regex: /(ghp|github_pat)_[A-Za-z0-9_]{20,}/ },
    { name: "AWS Access Key",  regex: /AKIA[0-9A-Z]{16}/ },
    { name: "Stripe Secret",   regex: /sk_live_[0-9a-zA-Z]{16,}/ },
    { name: "Generic API Key", regex: /(api[_-]?key|secret|token)\\s*[:=]\\s*["'][A-Za-z0-9_\\-]{16,}["']/i },
  ];
  const hits = [];
  const lines = patch.split(/\\r?\\n/);
  let file = "unknown", line = 0;
  for (const l of lines) {
    if (l.startsWith("+++ b/")) { file = l.slice(6); continue; }
    const h = l.match(/^@@\\s+-\\d+(?:,\\d+)?\\s+\\+(\\d+)(?:,\\d+)?\\s+@@/);
    if (h) { line = parseInt(h[1], 10); continue; }
    if (!l.startsWith("+") || l.startsWith("+++")) { if (!l.startsWith("-")) line++; continue; }
    for (const r of rules) {
      if (r.regex.test(l.slice(1))) hits.push({ rule: r.name, file, line });
    }
    line++;
  }
  const seen = new Set();
  return hits.filter(h => { const k = h.rule+":"+h.file+":"+h.line; return seen.has(k) ? false : !!seen.add(k); });
}

try {
  const branch = run("git rev-parse --abbrev-ref HEAD");
  let range = "HEAD~1...HEAD";
  try { range = run("git rev-parse --abbrev-ref --symbolic-full-name @{u}") + "...HEAD"; } catch {}

  const stats   = numStats(range);
  const secrets = scanSecrets(range);

  fs.mkdirSync(".gitpilot", { recursive: true });
  fs.writeFileSync(".gitpilot/last-prepush-report.json", JSON.stringify({ branch, range, stats, secrets }, null, 2));

  console.log(\`[GitPilot] +\${stats.added} / -\${stats.removed}\`);

  if (secrets.length > 0 && process.env.GITPILOT_ALLOW_PUSH !== "1") {
    console.error("\\x1b[31m[GitPilot] Push BLOCKED — potential secrets detected.\\x1b[0m");
    process.exit(1);
  }
  process.exit(0);
} catch (err) {
  console.error("[GitPilot] Pre-push runtime error:", err.message || err);
  process.exit(1);
}
`;
}
