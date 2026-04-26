import { ConvexHttpClient } from "convex/browser";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local from the extension root (works both in dev and packaged)
dotenv.config({ path: path.join(__dirname, "..", "..", ".env.local") });
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

let _client: ConvexHttpClient | null = null;

/**
 * Initialise the Convex HTTP client.
 * Call once from extension.activate() before any API calls.
 */
export function initConvex(url?: string): void {
  // Priority: explicit arg → CONVEX_DEPLOYMENT_URL → CONVEX_URL (set by Convex CLI)
  const deploymentUrl =
    url ??
    process.env.CONVEX_DEPLOYMENT_URL ??
    process.env.CONVEX_URL;

  if (!deploymentUrl) {
    console.warn("⚠️ GitPilot: CONVEX_DEPLOYMENT_URL is not set — cloud sync disabled.");
    return;
  }
  _client = new ConvexHttpClient(deploymentUrl);
  console.log("✅ GitPilot: Convex client ready →", deploymentUrl);
}

/**
 * Returns the Convex client. Throws if not initialised.
 */
export function getConvex(): ConvexHttpClient {
  if (!_client) {
    throw new Error("Convex client not initialised. Call initConvex() first.");
  }
  return _client;
}

export function isConvexReady(): boolean {
  return _client !== null;
}
