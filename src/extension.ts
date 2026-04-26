/**
 * extension.ts — GitPilot entry point
 *
 * Responsibilities:
 *  1. Initialise the Convex client (cloud storage)
 *  2. Register the sidebar webview
 *  3. Register git-related commands (pre-push hook, secret scan)
 *  4. Wire up the activity-bar icon
 *
 * Auth, deadlines, todos, and repo fetching are handled inside their
 * respective feature modules — this file stays intentionally lean.
 */

import * as fs   from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import * as dotenv from "dotenv";

import { initConvex }           from "./convex/client";
import { isGitRepo }            from "./features/git/gitUtils";
import { installPrePushHook }   from "./features/git/hookInstaller";
import { runPrePushCheck }      from "./features/git/prePushCheck";
import { GitPilotSidebarProvider } from "./ui/sidebar/sidebarProvider";
import { PrePushReport }        from "./shared/types";

// Load .env.local (dev) or .env (production bundle)
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

let sidebarProvider: GitPilotSidebarProvider | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  // ── 1. Convex  ────────────────────────────────────────────────────────────
  initConvex(process.env.CONVEX_DEPLOYMENT_URL);

  // ── 2. Sidebar (right side) ──────────────────────────────────────────────
  sidebarProvider = new GitPilotSidebarProvider(context.extensionUri, context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      GitPilotSidebarProvider.viewType,
      sidebarProvider,
      {
        // CRITICAL: prevents the webview from being destroyed when the sidebar
        // loses focus (e.g. during GitHub OAuth popup). Without this, the
        // webview reloads to the login page after every OAuth redirect.
        webviewOptions: { retainContextWhenHidden: true },
      }
    )
  );

  // On first install: move the panel to the secondary sidebar (right side).
  // VS Code stores view locations persistently after the first move.
  const hasMovedToRight = context.globalState.get<boolean>("gitpilot_moved_to_right");
  if (!hasMovedToRight) {
    // Small delay ensures the view is registered before the move command runs
    setTimeout(async () => {
      try {
        await vscode.commands.executeCommand(
          "workbench.action.moveView",
          { viewId: "gitpilot.sidebar" }
        );
        // Open the secondary sidebar so the user sees GitPilot on the right
        await vscode.commands.executeCommand("workbench.action.toggleAuxiliaryBar");
      } catch {
        // Non-fatal — user can always drag the panel manually
      }
      await context.globalState.update("gitpilot_moved_to_right", true);
    }, 1500);
  }

  // ── 3. Commands ──────────────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand("gitpilot.loginWithGitHub", async () => {
      // The sidebar handles auth — this command just opens the sidebar panel
      await vscode.commands.executeCommand("workbench.view.extension.gitpilot");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("gitpilot.refreshSidebar", () => {
      sidebarProvider?.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("gitpilot.installPrePushHook", async () => {
      if (!workspaceRoot) {
        vscode.window.showErrorMessage("Open a workspace folder to install the GitPilot pre-push hook.");
        return;
      }
      if (!isGitRepo(workspaceRoot)) {
        vscode.window.showErrorMessage("Current workspace is not a Git repository.");
        return;
      }
      const result = installPrePushHook(workspaceRoot);
      if (!result.installed) {
        vscode.window.showErrorMessage(result.reason ?? "Could not install pre-push hook.");
        return;
      }
      vscode.window.showInformationMessage("✅ GitPilot pre-push hook installed.");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("gitpilot.runPrePushCheck", async () => {
      if (!workspaceRoot) {
        vscode.window.showErrorMessage("Open a workspace folder before running GitPilot checks.");
        return;
      }
      if (!isGitRepo(workspaceRoot)) {
        vscode.window.showErrorMessage("Current workspace is not a Git repository.");
        return;
      }
      try {
        const report = runPrePushCheck(workspaceRoot);
        writeReport(workspaceRoot, report);
        sidebarProvider?.refresh();

        const summary = `GitPilot: +${report.stats.added} / -${report.stats.removed}`;
        if (report.blocked) {
          const pick = await vscode.window.showErrorMessage(
            `${summary} — ⚠️ ${report.secrets.length} potential secret(s) detected.`,
            "View in Sidebar"
          );
          if (pick === "View in Sidebar") {
            void vscode.commands.executeCommand("workbench.view.extension.gitpilot");
          }
          return;
        }
        vscode.window.showInformationMessage(summary);
      } catch (error: unknown) {
        vscode.window.showErrorMessage(`GitPilot pre-push check failed: ${errorMsg(error)}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("gitpilot.syncNow", async () => {
      sidebarProvider?.refresh();
      vscode.window.showInformationMessage("✅ GitPilot refreshed.");
    })
  );

  console.log("✅ GitPilot activated");
}

export function deactivate(): void {
  console.log("GitPilot deactivated");
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function writeReport(workspaceRoot: string, report: PrePushReport): void {
  const outputDir = path.join(workspaceRoot, ".gitpilot");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, "last-prepush-report.json"),
    JSON.stringify(report, null, 2),
    "utf8"
  );
}

function errorMsg(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
