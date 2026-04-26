import { execSync } from "node:child_process";

function runGit(cwd: string, args: string[]): string {
  return execSync(`git ${args.join(" ")}`, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function getCurrentBranch(cwd: string): string {
  return runGit(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);
}

export function isGitRepo(cwd: string): boolean {
  try {
    runGit(cwd, ["rev-parse", "--is-inside-work-tree"]);
    return true;
  } catch {
    return false;
  }
}

export function resolveUpstreamRange(cwd: string): { range: string; label: string } {
  try {
    const upstream = runGit(cwd, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
    return { range: `${upstream}...HEAD`, label: `${upstream}...HEAD` };
  } catch {
    return { range: "HEAD~1...HEAD", label: "HEAD~1...HEAD" };
  }
}

export function getDiffNumStat(cwd: string, range: string): string {
  return runGit(cwd, ["diff", "--numstat", range]);
}

export function getAddedPatch(cwd: string, range: string): string {
  return runGit(cwd, ["diff", "--unified=0", range]);
}
