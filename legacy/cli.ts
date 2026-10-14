import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { loadConfig } from "./config/index.js";
import { BrowserManager } from "./browser/manager.js";
import { SessionEngine } from "./sessions/engine.js";
import { SessionManager } from "./sessions/manager.js";
import { redactSecrets, structuredLog } from "./health/logger.js";

const config = loadConfig();
const sessions = new SessionManager(config.sessionStoragePath);
const browsers = new BrowserManager({
  headless: false,
  sessionStoragePath: config.sessionStoragePath,
  channel: process.env.BROWSER_CHANNEL === "chrome" || process.env.BROWSER_CHANNEL === "msedge" ? process.env.BROWSER_CHANNEL : undefined,
  connectOverCdpUrl: process.env.BETONLINE_CDP_URL ?? process.env.BROWSER_CDP_URL
});
const engine = new SessionEngine(sessions, browsers);
const [command, sportsbook] = process.argv.slice(2);
const accountAlias = process.env.ACCOUNT_ALIAS ?? "personal";

const loginUrl = (id: string): string | undefined => {
  const envName = `SPORTSBOOK_${id.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_LOGIN_URL`;
  return process.env[envName];
};

const waitForEnter = async (message: string): Promise<void> => {
  const terminal = createInterface({ input, output });
  await terminal.question(message);
  terminal.close();
};

const requireSportsbook = (): string => {
  if (!sportsbook) throw new Error("Usage: npm run cli -- <command> <sportsbook>");
  return sportsbook;
};

const run = async (): Promise<void> => {
  switch (command) {
    case "login": {
      const id = requireSportsbook();
      await engine.login({ sportsbook: id, accountAlias, loginUrl: loginUrl(id), waitForUser: () => waitForEnter("Completa el login, 2FA o CAPTCHA en el navegador. Pulsa Enter cuando termine: ") });
      console.log(structuredLog({ level: "info", connector: id, sportsbook: id, run: "login", eventsParsed: 0, marketsParsed: 0, quotesParsed: 0, duration: 0 }));
      break;
    }
    case "logout": {
      const id = requireSportsbook();
      await engine.logout(id, accountAlias);
      console.log(structuredLog({ level: "info", sportsbook: id, run: "logout", duration: 0 }));
      break;
    }
    case "session-status": {
      const id = requireSportsbook();
      console.log(JSON.stringify(redactSecrets(sessions.get(id, accountAlias))));
      break;
    }
    case "start": {
      const id = requireSportsbook();
      const restored = await engine.restoreSession(id, accountAlias);
      if (!restored) throw new Error("Session is not active; run login first");
      await sessions.setProcess(id, accountAlias, process.pid);
      console.log(structuredLog({ level: "info", sportsbook: id, run: "start", duration: 0 }));
      await new Promise<void>((resolve) => {
        const stop = () => { void sessions.clearProcess(id, accountAlias).finally(() => browsers.shutdown()).finally(resolve); };
        process.once("SIGINT", stop);
        process.once("SIGTERM", stop);
      });
      break;
    }
    case "stop": {
      const id = requireSportsbook();
      const pid = sessions.processPid(id, accountAlias);
      if (pid && pid !== process.pid) {
        try { process.kill(pid, "SIGTERM"); } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
        }
      }
      await sessions.clearProcess(id, accountAlias);
      await engine.logout(id, accountAlias);
      console.log(structuredLog({ level: "info", sportsbook: id, run: "stop", duration: 0 }));
      break;
    }
    case "health": {
      const response = await fetch(`http://${config.host}:${config.port}/health`, { headers: config.apiKey ? { "x-api-key": config.apiKey } : undefined });
      console.log(await response.text());
      if (!response.ok) process.exitCode = 1;
      break;
    }
    default:
      throw new Error("Commands: login, logout, session-status, start, stop, health");
  }
};

run().catch((error) => {
  console.error(structuredLog({ level: "error", errors: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
}).finally(() => {
  if (command !== "start") void browsers.shutdown();
});
