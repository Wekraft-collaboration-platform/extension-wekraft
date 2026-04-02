import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { installPrePushHook } from "./core/hookInstaller";
import { isGitRepo } from "./core/gitUtils";
import { runPrePushCheck } from "./core/prePushCheck";
import { PrePushReport } from "./core/types";
import { GitPilotSidebarProvider } from "./ui/sidebarProvider";

let sidebarProvider: GitPilotSidebarProvider | undefined;

// Detect if running in Cursor editor
const isRunningInCursor = (): boolean => {
  const appName = vscode.env.appName || "";
  return appName.toLowerCase().includes("cursor");
};

export function activate(context: vscode.ExtensionContext): void {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const inCursor = isRunningInCursor();
  
  if (inCursor) {
    console.log("GitPilot: Running in Cursor editor. AI-enhanced features enabled.");
  }

  sidebarProvider = new GitPilotSidebarProvider(context.extensionUri, context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(GitPilotSidebarProvider.viewType, sidebarProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("gitpilot.loginWithGitHub", async () => {
      try {
        const session = await vscode.authentication.getSession("github", ["read:user", "user:email"], {
          createIfNone: true
        });

        if (!session) {
          vscode.window.showErrorMessage("GitPilot could not create a GitHub session.");
          return;
        }

        vscode.window.showInformationMessage(`GitPilot connected to GitHub as ${session.account.label}.`);
      } catch (error) {
        vscode.window.showErrorMessage(`GitPilot GitHub auth failed: ${errorMessage(error)}`);
      }
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

      vscode.window.showInformationMessage("GitPilot pre-push hook installed.");
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
        // Refresh isn't taking a report anymore since the new UI is GitHub focused
        sidebarProvider?.refresh();

        const summary = `GitPilot push stats: +${report.stats.added} / -${report.stats.removed}`;
        if (report.blocked) {
          const pick = await vscode.window.showErrorMessage(
            `${summary}. Emergency: ${report.secrets.length} potential secret(s) detected.`,
            "View in Sidebar"
          );
          if (pick === "View in Sidebar") {
            void vscode.commands.executeCommand("workbench.view.extension.gitpilot");
          }
          return;
        }

        vscode.window.showInformationMessage(summary);
      } catch (error) {
        vscode.window.showErrorMessage(`GitPilot pre-push check failed: ${errorMessage(error)}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("gitpilot.refreshSidebar", () => {
      sidebarProvider?.refresh();
    })
  );
}

export function deactivate(): void {
  // No-op for now.
}

function writeReport(workspaceRoot: string, report: PrePushReport): void {
  const outputDir = path.join(workspaceRoot, ".gitpilot");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "last-prepush-report.json"), JSON.stringify(report, null, 2), "utf8");
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
