"use node";
/**
 * features/git/commitManager.ts
 *
 * Local git commit management — deletes a commit from local history via
 * `git rebase --onto <sha>^ <sha>`.
 *
 * IMPORTANT: This rewrites local git history. The user must force-push afterward.
 * Only works on the workspace folder that is the local clone of the repo being viewed.
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export type CommitDeleteResult =
  | { ok: true; message: string }
  | { ok: false; reason: string };

/**
 * Detects the `full_name` (owner/repo) of the git repo at `repoPath`
 * by reading the remote.origin.url config.
 *
 * Returns null if we can't determine it (not a git repo, no remote, etc.).
 */
export async function detectLocalRepoFullName(repoPath: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync("git remote get-url origin", { cwd: repoPath });
    const url = stdout.trim();
    // Match SSH: git@github.com:owner/repo.git  or HTTPS: https://github.com/owner/repo.git
    const m =
      url.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/) ||
      url.match(/github\.com\/([^/?#]+\/[^/?#.]+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/**
 * Get the current branch name of the local repo.
 */
async function getCurrentBranch(repoPath: string): Promise<string> {
  const { stdout } = await execAsync("git rev-parse --abbrev-ref HEAD", { cwd: repoPath });
  return stdout.trim();
}

/**
 * Check if the sha exists in local history (user might only have a shallow clone).
 */
async function commitExistsLocally(repoPath: string, sha: string): Promise<boolean> {
  try {
    await execAsync(`git cat-file -e ${sha}^{commit}`, { cwd: repoPath });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if the given sha is a merge commit (has more than one parent).
 */
async function isMergeCommit(repoPath: string, sha: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`git rev-list --merges --count ${sha}~1..${sha}`, {
      cwd: repoPath,
    });
    return parseInt(stdout.trim(), 10) > 0;
  } catch {
    return false;
  }
}

/**
 * Deletes a commit from local history using `git rebase --onto <sha>^ <sha>`.
 *
 * @param repoPath   Absolute path to the local workspace / git repo root
 * @param sha        Full or short SHA of the commit to remove
 * @returns          CommitDeleteResult
 */
export async function deleteLocalCommit(
  repoPath: string,
  sha: string
): Promise<CommitDeleteResult> {
  // 1. Validate commit exists locally
  const exists = await commitExistsLocally(repoPath, sha);
  if (!exists) {
    return {
      ok: false,
      reason: `Commit ${sha.slice(0, 7)} not found in local history. ` +
              `Pull the repo to your workspace first.`,
    };
  }

  // 2. Reject merge commits — rebase --onto doesn't handle them cleanly
  const isMerge = await isMergeCommit(repoPath, sha);
  if (isMerge) {
    return {
      ok: false,
      reason: `Commit ${sha.slice(0, 7)} is a merge commit. ` +
              `Merge commits cannot be removed with this tool.`,
    };
  }

  // 3. Get current branch for the result message
  let branch = "HEAD";
  try { branch = await getCurrentBranch(repoPath); } catch {}

  // 4. Run the rebase
  // `git rebase --onto <sha>^ <sha>` replays everything after <sha> onto <sha>'s parent
  try {
    await execAsync(`git rebase --onto "${sha}^" "${sha}"`, { cwd: repoPath });
    return {
      ok: true,
      message:
        `✅ Commit ${sha.slice(0, 7)} removed from local history on branch '${branch}'.\n` +
        `Run 'git push --force-with-lease' to update the remote.`,
    };
  } catch (err: unknown) {
    // Rebase failed — abort to restore state
    try { await execAsync("git rebase --abort", { cwd: repoPath }); } catch {}
    const errMsg = err instanceof Error ? err.message : String(err);
    // Extract the most relevant part of git's output
    const hint = errMsg.split("\n").find(l => l.startsWith("error:") || l.startsWith("CONFLICT")) ?? errMsg;
    return {
      ok: false,
      reason: `Git rebase failed: ${hint}\n` +
              `The repo has been restored to its previous state.`,
    };
  }
}
