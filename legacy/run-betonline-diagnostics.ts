import { loadConfig } from "./config/index.js";
import { BrowserManager } from "./browser/manager.js";
import { BetOnlineConnector } from "./connectors/betonline/connector.js";

const config = loadConfig();
if (!config.betonlineCdpUrl) throw new Error("BETONLINE_CDP_URL is required; connect an authorized BetOnline Edge session with --remote-debugging-port=9223");

const browsers = new BrowserManager({ headless: false, sessionStoragePath: config.sessionStoragePath, connectOverCdpUrl: config.betonlineCdpUrl });
const connector = new BetOnlineConnector({ browserManager: browsers, accountAlias: process.env.ACCOUNT_ALIAS ?? "personal" });
try {
  const report = await connector.diagnose({ durationMs: Number(process.env.BETONLINE_DIAGNOSTIC_WAIT_MS ?? 10_000), reload: false });
  console.log(JSON.stringify(report, null, 2));
} finally {
  await connector.shutdown();
  await browsers.shutdown();
  // Playwright has no public disconnect() for connectOverCDP. Exiting the
  // short-lived diagnostic process releases the client connection while the
  // remote Edge instance and its persistent profile remain open.
  await new Promise<void>((resolve) => setImmediate(resolve));
  process.exit(0);
}
