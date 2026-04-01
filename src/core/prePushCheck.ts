import { getAddedPatch, getCurrentBranch, getDiffNumStat, resolveUpstreamRange } from "./gitUtils";
import { scanAddedLines } from "./secretScanner";
import { PrePushReport } from "./types";

export function runPrePushCheck(cwd: string): PrePushReport {
  const branch = getCurrentBranch(cwd);
  const rangeInfo = resolveUpstreamRange(cwd);

  const numStat = getDiffNumStat(cwd, rangeInfo.range);
  const stats = parseNumStat(numStat);

  const patch = getAddedPatch(cwd, rangeInfo.range);
  const secrets = scanAddedLines(patch);

  return {
    timestamp: new Date().toISOString(),
    branch,
    comparedRange: rangeInfo.label,
    stats,
    secrets,
    blocked: secrets.length > 0
  };
}

function parseNumStat(input: string): { added: number; removed: number } {
  const lines = input.split(/\r?\n/).filter(Boolean);
  let added = 0;
  let removed = 0;

  for (const line of lines) {
    const [a, r] = line.split("\t");
    const aValue = Number.parseInt(a, 10);
    const rValue = Number.parseInt(r, 10);

    if (!Number.isNaN(aValue)) {
      added += aValue;
    }
    if (!Number.isNaN(rValue)) {
      removed += rValue;
    }
  }

  return { added, removed };
}
