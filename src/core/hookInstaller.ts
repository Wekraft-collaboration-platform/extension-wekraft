import * as fs from "node:fs";
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
  fs.writeFileSync(
    hookPath,
    "#!/usr/bin/env sh\nnode .gitpilot/prepush-runtime.cjs\n",
    "utf8"
  );
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
  let added = 0;
  let removed = 0;
  for (const row of rows) {
    const [a, r] = row.split("\\t");
    const ai = Number.parseInt(a, 10);
    const ri = Number.parseInt(r, 10);
    if (!Number.isNaN(ai)) added += ai;
    if (!Number.isNaN(ri)) removed += ri;
  }
  return { added, removed };
}

function scanSecrets(range) {
  const patch = run(\`git diff --unified=0 \${range}\`);
  const rules = [
    { name: "OpenAI Key", regex: /sk-[A-Za-z0-9]{20,}/ },
    { name: "GitHub Token", regex: /(ghp|github_pat)_[A-Za-z0-9_]{20,}/ },
    { name: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/ },
    { name: "Stripe Secret", regex: /sk_live_[0-9a-zA-Z]{16,}/ },
    { name: "Generic API Key Assignment", regex: /(api[_-]?key|secret|token)\\s*[:=]\\s*[\"'][A-Za-z0-9_\\-]{16,}[\"']/i }
  ];

  const hits = [];
  const lines = patch.split(/\\r?\\n/);
  let currentFile = "unknown";
  let currentLine = 0;

  for (const line of lines) {
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6);
      continue;
    }
    const hunk = line.match(/^@@\\s+-\\d+(?:,\\d+)?\\s+\\+(\\d+)(?:,\\d+)?\\s+@@/);
    if (hunk) {
      currentLine = Number.parseInt(hunk[1], 10);
      continue;
    }
    if (!line.startsWith("+") || line.startsWith("+++")) {
      if (!line.startsWith("-")) {
        currentLine += 1;
      }
      continue;
    }

    const content = line.slice(1);
    for (const rule of rules) {
      if (rule.regex.test(content)) {
        hits.push({ rule: rule.name, file: currentFile, line: currentLine });
      }
    }
    currentLine += 1;
  }

  const deduped = [];
  const seen = new Set();
  for (const hit of hits) {
    const key = \`${"${hit.rule}"}:${"${hit.file}"}:${"${hit.line}"}\`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(hit);
    }
  }
  return deduped;
}

function emergency(message) {
  const red = "\\x1b[31m";
  const yellow = "\\x1b[33m";
  const reset = "\\x1b[0m";
  console.error(\`\\n\${red}=================== GITPILOT EMERGENCY ===================\${reset}\`);
  console.error(\`\${yellow}\${message}\${reset}\`);
  console.error(\`\${red}Push blocked by GitPilot. Set GITPILOT_ALLOW_PUSH=1 to override.\${reset}\\n\`);
}

try {
  const branch = run("git rev-parse --abbrev-ref HEAD");
  let range = "HEAD~1...HEAD";
  try {
    const upstream = run("git rev-parse --abbrev-ref --symbolic-full-name @{u}");
    range = \`${"${upstream}"}...HEAD\`;
  } catch {}

  const stats = numStats(range);
  const secrets = scanSecrets(range);
  const report = {
    timestamp: new Date().toISOString(),
    branch,
    comparedRange: range,
    stats,
    secrets,
    blocked: secrets.length > 0
  };

  fs.mkdirSync(".gitpilot", { recursive: true });
  fs.writeFileSync(".gitpilot/last-prepush-report.json", JSON.stringify(report, null, 2));

  console.log(\`[GitPilot] Push stats => +\${stats.added} / -\${stats.removed} (range: \${range})\`);

  if (secrets.length > 0 && process.env.GITPILOT_ALLOW_PUSH !== "1") {
    emergency(\`Potential secrets detected in \${secrets.length} location(s).\`);
    process.exit(1);
  }

  process.exit(0);
} catch (err) {
  console.error("[GitPilot] Pre-push runtime failed:", err.message || String(err));
  process.exit(1);
}
`;
}
