import { getAddedPatch, getCurrentBranch, getDiffNumStat, resolveUpstreamRange } from "./gitUtils";
import { scanAddedLines } from "./secretScanner";
import { PrePushReport } from "../../shared/types";

export function runPrePushCheck(cwd: string): PrePushReport {
  const branch    = getCurrentBranch(cwd);
  const rangeInfo = resolveUpstreamRange(cwd);
  const numStat   = getDiffNumStat(cwd, rangeInfo.range);
  const stats     = parseNumStat(numStat);
  const patch     = getAddedPatch(cwd, rangeInfo.range);
  const secrets   = scanAddedLines(patch);

  return {
    timestamp:     new Date().toISOString(),
    branch,
    comparedRange: rangeInfo.label,
    stats,
    secrets,
    blocked:       secrets.length > 0,
  };
}

function parseNumStat(input: string): { added: number; removed: number } {
  let added = 0, removed = 0;
  for (const line of input.split(/\r?\n/).filter(Boolean)) {
    const [a, r] = line.split("\t");
    const av = Number.parseInt(a, 10);
    const rv = Number.parseInt(r, 10);
    if (!Number.isNaN(av)) added   += av;
    if (!Number.isNaN(rv)) removed += rv;
  }
  return { added, removed };
}
