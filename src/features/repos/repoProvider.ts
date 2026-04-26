/**
 * features/repos/repoProvider.ts
 *
 * Fetches GitHub repositories and commit data using the authenticated token.
 * Purely a GitHub API client — no local state.
 */

import { GitHubRepo, GitHubCommit } from "../../shared/types";
import { fetchGitHubApi } from "../auth/githubAuth";

const MAX_REPOS = 30;

export async function fetchUserRepos(token: string): Promise<GitHubRepo[]> {
  const data = await fetchGitHubApi<GitHubRepo[]>(
    token,
    `/user/repos?sort=updated&per_page=${MAX_REPOS}&affiliation=owner,collaborator`
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchRepoCommits(token: string, repoFullName: string, count = 5): Promise<GitHubCommit[]> {
  const data = await fetchGitHubApi<GitHubCommit[]>(
    token,
    `/repos/${repoFullName}/commits?per_page=${count}`
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchCommitDetail(token: string, repoFullName: string, sha: string): Promise<GitHubCommit | null> {
  return fetchGitHubApi<GitHubCommit>(token, `/repos/${repoFullName}/commits/${sha}`);
}

export async function fetchLastCommitStats(
  token: string,
  repoFullName: string
): Promise<{ additions: number; deletions: number; total: number }> {
  const commits = await fetchRepoCommits(token, repoFullName, 1);
  if (!commits.length) return { additions: 0, deletions: 0, total: 0 };

  const detail = await fetchCommitDetail(token, repoFullName, commits[0].sha);
  return detail?.stats ?? { additions: 0, deletions: 0, total: 0 };
}
