/**
 * features/auth/authManager.ts
 *
 * Centralised authentication state manager for GitPilot.
 *
 * Responsibilities:
 *  - Persist a lightweight "is authenticated" flag in globalState so the
 *    sidebar never flashes the login page on re-open after a successful sign-in.
 *  - Cache the GitHub profile & Convex user so the sidebar never needs to
 *    re-fetch them from scratch (only from Convex).
 *  - Expose clean async helpers used by SidebarProvider.
 *
 * Separation of concerns:
 *  - Raw GitHub OAuth  →  githubAuth.ts   (getSession, signIn, signOut …)
 *  - Auth state logic  →  authManager.ts  (this file)
 *  - UI / webview      →  sidebarProvider.ts
 */

import * as vscode from "vscode";
import {
  getExistingSession,
  signIn,
  signOut as rawSignOut,
  isForceLoggedOut,
  clearLogoutFlag,
  fetchGitHubProfile,
} from "./githubAuth";
import { safeRegisterOrGet } from "../../convex/api";
import { ConvexUser, GitHubProfile } from "../../shared/types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AuthState = {
  session: vscode.AuthenticationSession;
  profile: GitHubProfile;
  convexUser: ConvexUser | null;
};

// Key used to persist "already authenticated" flag across extension reloads.
const AUTH_FLAG_KEY = "gitpilot_auth_ok";

// ─────────────────────────────────────────────────────────────────────────────
// Public helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Called on sidebar init.
 *
 * Strategy:
 *  1. If force-logout flag is set → return null (show login).
 *  2. Ask VS Code for an existing GitHub session (silent, no popup).
 *  3. If a session exists → fetch the profile & Convex user.
 *  4. Convex failure is NON-FATAL — the user is still considered logged in.
 *
 * Returns null only when there is truly no active GitHub session.
 */
export async function checkExistingAuthState(
  context: vscode.ExtensionContext
): Promise<AuthState | null> {
  // Step 1 – respect explicit logout
  if (isForceLoggedOut(context)) {
    context.globalState.update(AUTH_FLAG_KEY, false);
    return null;
  }

  // Step 2 – get the VS Code session silently
  const session = await getExistingSession();
  if (!session) {
    context.globalState.update(AUTH_FLAG_KEY, false);
    return null;
  }

  // Step 3 – fetch GitHub profile (network call, can fail)
  let profile: GitHubProfile;
  try {
    profile = await fetchGitHubProfile(session.accessToken);
  } catch (e) {
    console.error("GitPilot AuthManager: profile fetch failed", e);
    // Session exists but profile failed — keep the auth flag as-is and return
    // null so the UI falls back to the login page rather than crashing.
    context.globalState.update(AUTH_FLAG_KEY, false);
    return null;
  }

  // Step 4 – register / get Convex user (non-fatal)
  let convexUser: ConvexUser | null = null;
  try {
    convexUser = await safeRegisterOrGet(profile);
  } catch (e) {
    console.warn("GitPilot AuthManager: Convex registerOrGet failed (non-fatal)", e);
  }

  // Persist "authenticated" flag so fast re-open doesn't flicker to login
  context.globalState.update(AUTH_FLAG_KEY, true);
  return { session, profile, convexUser };
}

/**
 * Full sign-in sequence triggered by the user clicking "Sign in with GitHub".
 *
 * Returns the AuthState on success, or null if the user cancelled or an
 * unrecoverable error occurred.  Never throws.
 */
export async function performLogin(
  context: vscode.ExtensionContext
): Promise<AuthState | null> {
  // Trigger VS Code OAuth popup
  let session: vscode.AuthenticationSession | null;
  try {
    session = await signIn();
  } catch (e) {
    console.error("GitPilot AuthManager: signIn threw", e);
    return null;
  }

  if (!session) {
    // User cancelled the OAuth dialog — stay on login page
    return null;
  }

  // Fetch GitHub profile — required for the UI and Convex registration
  let profile: GitHubProfile;
  try {
    profile = await fetchGitHubProfile(session.accessToken);
  } catch (e) {
    console.error("GitPilot AuthManager: profile fetch failed after OAuth", e);
    vscode.window.showErrorMessage(
      "GitPilot: Signed in successfully but could not fetch your GitHub profile. " +
        "Please check your network connection and try again."
    );
    return null;
  }

  // Register / get Convex user (non-fatal)
  let convexUser: ConvexUser | null = null;
  try {
    convexUser = await safeRegisterOrGet(profile);
  } catch (e) {
    console.warn("GitPilot AuthManager: Convex registration failed (non-fatal)", e);
  }

  // Clear force-logout flag and persist authenticated state
  clearLogoutFlag(context);
  context.globalState.update(AUTH_FLAG_KEY, true);

  return { session, profile, convexUser };
}

/**
 * Sign out — clears the persisted flag and the force-logout sentinel.
 */
export async function performLogout(context: vscode.ExtensionContext): Promise<void> {
  await rawSignOut(context);
  context.globalState.update(AUTH_FLAG_KEY, false);
}

/**
 * Quick synchronous check — was the user authenticated the last time the
 * extension ran?  Useful for deciding whether to show a loading spinner
 * rather than the login page immediately on first paint.
 */
export function wasAuthenticatedLastSession(context: vscode.ExtensionContext): boolean {
  return (
    context.globalState.get<boolean>(AUTH_FLAG_KEY) === true &&
    !isForceLoggedOut(context)
  );
}
