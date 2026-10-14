import type { BrowserManager } from "../browser/manager.js";
import type { SportsbookConnector } from "../connectors/types.js";
import { classifyFailure } from "../health/errors.js";
import { SessionManager } from "./manager.js";

export type InteractiveLoginOptions = {
  sportsbook: string;
  accountAlias: string;
  loginUrl?: string;
  waitForUser: () => Promise<void>;
};

export class SessionEngine {
  constructor(private readonly sessions: SessionManager, private readonly browsers: BrowserManager) {}

  async login(options: InteractiveLoginOptions): Promise<void> {
    const { sportsbook, accountAlias } = options;
    await this.sessions.setState(sportsbook, accountAlias, "AUTHENTICATING");
    try {
      const page = await this.browsers.getPage(sportsbook, accountAlias);
      if (options.loginUrl) await page.goto(options.loginUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await options.waitForUser();
      const context = page.context();
      await this.sessions.saveStorageState(sportsbook, accountAlias, await context.storageState());
      await this.sessions.saveSessionStorage(sportsbook, accountAlias, await this.browsers.captureSessionStorage(page));
      await this.sessions.setState(sportsbook, accountAlias, "ACTIVE");
    } catch (cause) {
      const failure = classifyFailure(cause);
      await this.sessions.setState(sportsbook, accountAlias, failure.kind === "auth_required" ? "AUTH_REQUIRED" : "ERROR", failure.message);
      throw cause;
    }
  }

  async restoreSession(sportsbook: string, accountAlias: string, connector?: SportsbookConnector): Promise<boolean> {
    if (!(await this.sessions.hasStoredSession(sportsbook, accountAlias))) {
      await this.sessions.setState(sportsbook, accountAlias, "NOT_CONFIGURED");
      return false;
    }
    try {
      await this.browsers.getContext(sportsbook, accountAlias);
      if (!connector) {
        await this.sessions.setState(sportsbook, accountAlias, "ACTIVE");
        return true;
      }
      const health = await connector.health();
      if (health.status === "AUTH_REQUIRED") {
        await this.sessions.setState(sportsbook, accountAlias, "AUTH_REQUIRED", health.message);
        return false;
      }
      if (health.status === "UNHEALTHY") {
        await this.sessions.setState(sportsbook, accountAlias, "ERROR", health.message);
        return false;
      }
      // DEGRADED access (for example a temporary regional or upstream block)
      // does not invalidate the browser session or discard its private state.
      await this.sessions.setState(sportsbook, accountAlias, "ACTIVE", health.message);
      return true;
    } catch (cause) {
      const failure = classifyFailure(cause);
      await this.sessions.setState(sportsbook, accountAlias, failure.kind === "auth_required" ? "AUTH_REQUIRED" : "ERROR", failure.message);
      return false;
    }
  }

  async logout(sportsbook: string, accountAlias: string): Promise<void> {
    await this.browsers.closeContext(sportsbook, accountAlias);
    await this.sessions.clearStoredSession(sportsbook, accountAlias);
    await this.sessions.setState(sportsbook, accountAlias, "AUTH_REQUIRED");
  }
}
