import { SecretHit } from "../../shared/types";

const RULES: Array<{ name: string; regex: RegExp }> = [
  { name: "OpenAI Key",               regex: /sk-[A-Za-z0-9]{20,}/ },
  { name: "GitHub Token",             regex: /(ghp|github_pat)_[A-Za-z0-9_]{20,}/ },
  { name: "AWS Access Key",           regex: /AKIA[0-9A-Z]{16}/ },
  { name: "Stripe Secret",            regex: /sk_live_[0-9a-zA-Z]{16,}/ },
  { name: "Generic API Key",          regex: /(api[_-]?key|secret|token)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/i },
];

export function scanAddedLines(patch: string): SecretHit[] {
  const hits: SecretHit[] = [];
  const lines = patch.split(/\r?\n/);
  let currentFile = "unknown";
  let currentLine  = 0;

  for (const line of lines) {
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6);
      continue;
    }
    const hunk = line.match(/^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
    if (hunk) { currentLine = Number.parseInt(hunk[1], 10); continue; }
    if (!line.startsWith("+") || line.startsWith("+++")) {
      if (!line.startsWith("-")) currentLine += 1;
      continue;
    }
    const content = line.slice(1);
    for (const rule of RULES) {
      if (rule.regex.test(content)) {
        hits.push({ rule: rule.name, file: currentFile, line: currentLine, preview: redact(content) });
      }
    }
    currentLine += 1;
  }
  return dedupe(hits);
}

function redact(v: string): string {
  return v.replace(/[A-Za-z0-9]{8,}/g, "***");
}

function dedupe(hits: SecretHit[]): SecretHit[] {
  const seen = new Set<string>();
  return hits.filter((h) => {
    const k = `${h.rule}:${h.file}:${h.line}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
