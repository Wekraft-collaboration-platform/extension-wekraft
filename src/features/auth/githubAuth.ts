/**
 * features/auth/githubAuth.ts
 *
 * Handles VS Code native GitHub OAuth.
 * This is the ONLY source of the GitHub access token — no custom auth server needed.
 *
 * Flow:
 *  1. getSession()  → check if already signed in (silent)
 *  2. signIn()      → pop the VS Code GitHub auth dialog
 *  3. getProfile()  → fetch github.com/api/user using the token
 *  4. getConvexUser() → register / load the user from Convex
 */

import * as vscode from "vscode";
import { GitHubProfile, ConvexUser } from "../../shared/types";
import { safeRegisterOrGet } from "../../convex/api";

const SCOPES = ["read:user", "user:email", "repo"] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Session helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Silent check — returns null if not authenticated yet. */
export async function getExistingSession(): Promise<vscode.AuthenticationSession | null> {
  try {
    const session = await vscode.authentication.getSession("github", [...SCOPES], {
      createIfNone: false,
    });
    return session ?? null;
  } catch {
    return null;
  }
}

/** Triggers the VS Code GitHub OAuth popup. */
export async function signIn(): Promise<vscode.AuthenticationSession | null> {
  try {
    const session = await vscode.authentication.getSession("github", [...SCOPES], {
      createIfNone: true,
    });
    return session ?? null;
  } catch (e) {
    console.error("GitPilot: GitHub sign-in failed", e);
    return null;
  }
}

/** Sign out by clearing the persisted "force-logout" flag.
 *  (VS Code manages the actual GitHub session — we just stop using it.) */
export async function signOut(context: vscode.ExtensionContext): Promise<void> {
  await context.globalState.update("gitpilot_force_logout", true);
}

export function clearLogoutFlag(context: vscode.ExtensionContext): void {
  context.globalState.update("gitpilot_force_logout", false);
}

export function isForceLoggedOut(context: vscode.ExtensionContext): boolean {
  return context.globalState.get<boolean>("gitpilot_force_logout") === true;
}

// ─────────────────────────────────────────────────────────────────────────────
// GitHub API
// ─────────────────────────────────────────────────────────────────────────────

const GH_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "GitPilot-VSCode/0.2.0",
});

export async function fetchGitHubProfile(token: string): Promise<GitHubProfile> {
  const res = await fetch("https://api.github.com/user", { headers: GH_HEADERS(token) });
  if (!res.ok) throw new Error(`GitHub /user returned ${res.status}`);
  return res.json() as Promise<GitHubProfile>;
}

export async function fetchGitHubApi<T>(token: string, path: string): Promise<T | null> {
  try {
    const res = await fetch(`https://api.github.com${path}`, { headers: GH_HEADERS(token) });
    if (!res.ok) {
      console.warn(`GitHub API ${path} → ${res.status}`);
      return null;
    }
    return res.json() as Promise<T>;
  } catch (e) {
    console.error(`GitHub API fetch failed: ${path}`, e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Combined login helper (used by the sidebar)
// ─────────────────────────────────────────────────────────────────────────────

export type AuthResult = {
  session: vscode.AuthenticationSession;
  profile: GitHubProfile;
  convexUser: ConvexUser | null;
};

/**
 * Full sign-in sequence:
 *  VS Code GitHub OAuth → GitHub profile → Convex user upsert
 * Returns null if anything in the flow fails (never throws).
 */
export async function performSignIn(): Promise<AuthResult | null> {
  const session = await signIn();
  if (!session) return null;

  try {
    const profile    = await fetchGitHubProfile(session.accessToken);
    const convexUser = await safeRegisterOrGet(profile);
    return { session, profile, convexUser };
  } catch (e) {
    console.error("GitPilot: performSignIn failed after OAuth", e);
    return null;
  }
}

/**
 * Checks an existing session and refreshes Convex user.
 * Returns null ONLY if there is no GitHub session (not authenticated).
 * Convex failures are non-fatal — user still gets into the app.
 */
export async function checkExistingAuth(): Promise<AuthResult | null> {
  const session = await getExistingSession();
  if (!session) return null;

  try {
    const profile = await fetchGitHubProfile(session.accessToken);
    // Convex failure is non-fatal – user can still use GitHub features
    const convexUser = await safeRegisterOrGet(profile);
    return { session, profile, convexUser };
  } catch (profileError) {
    // GitHub profile fetch failed (bad token, network issue) – show login
    console.error("GitPilot: GitHub profile fetch failed", profileError);
    return null;
  }
}
