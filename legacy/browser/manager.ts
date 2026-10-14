import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

export type BrowserAccountKey = `${string}:${string}`;

type BrowserManagerOptions = {
  headless?: boolean;
  sessionStoragePath: string;
  channel?: "chrome" | "msedge" | "chromium";
  connectOverCdpUrl?: string;
};

export type BrowserPageOptions = {
  urlPrefix?: string;
  urlPrefixes?: string[];
  createIfMissing?: boolean;
};

export class BrowserManager {
  private browser?: Browser;
  private connectedOverCdp = false;
  private readonly contexts = new Map<BrowserAccountKey, BrowserContext>();

  constructor(private readonly options: BrowserManagerOptions) {}

  private safeSegment(value: string): string {
    if (!/^[a-zA-Z0-9_.-]+$/.test(value)) throw new Error("Invalid browser account identifier");
    return value;
  }

  async getContext(sportsbook: string, accountAlias: string): Promise<BrowserContext> {
    const safeSportsbook = this.safeSegment(sportsbook);
    const safeAccountAlias = this.safeSegment(accountAlias);
    const key = `${safeSportsbook}:${safeAccountAlias}` as BrowserAccountKey;
    const existing = this.contexts.get(key);
    if (existing) return existing;

    if (this.browser && !this.browser.isConnected()) {
      await Promise.allSettled([...this.contexts.values()].map((context) => context.close()));
      this.contexts.clear();
      this.browser = undefined;
    }
    if (!this.browser) {
      if (this.options.connectOverCdpUrl) {
        this.browser = await chromium.connectOverCDP(this.options.connectOverCdpUrl);
        this.connectedOverCdp = true;
      } else {
        this.browser = await chromium.launch({
          headless: this.options.headless ?? true,
          ...(this.options.channel && this.options.channel !== "chromium" ? { channel: this.options.channel } : {})
        });
      }
    }
    if (this.connectedOverCdp) {
      const context = this.browser.contexts()[0];
      if (!context) throw new Error("Connected Chrome has no browser context");
      this.contexts.set(key, context);
      return context;
    }
    const storageStatePath = join(this.options.sessionStoragePath, safeSportsbook, safeAccountAlias, "state.json");
    const sessionStoragePath = join(this.options.sessionStoragePath, safeSportsbook, safeAccountAlias, "session-storage.json");
    const storageState = await this.readJsonIfPresent(storageStatePath);
    const sessionStorage = await this.readJsonIfPresent(sessionStoragePath);
    const contextOptions: NonNullable<Parameters<Browser["newContext"]>[0]> = storageState
      ? { storageState: storageState as NonNullable<Parameters<Browser["newContext"]>[0]>["storageState"] }
      : {};
    const context = await this.browser.newContext(contextOptions);
    if (sessionStorage && typeof sessionStorage === "object") {
      await context.addInitScript((saved) => {
        const originState = (saved as Record<string, Record<string, string>>)[window.location.origin];
        if (originState) for (const [key, value] of Object.entries(originState)) window.sessionStorage.setItem(key, value);
      }, sessionStorage);
    }
    this.contexts.set(key, context);
    return context;
  }

  isUsingCdp(): boolean { return this.connectedOverCdp; }
  isConfiguredForCdp(): boolean { return Boolean(this.options.connectOverCdpUrl); }

  private async readJsonIfPresent(path: string): Promise<unknown | undefined> {
    try {
      await access(path);
      return JSON.parse(await readFile(path, "utf8")) as unknown;
    } catch {
      return undefined;
    }
  }

  async captureSessionStorage(page: Page): Promise<Record<string, Record<string, string>>> {
    return page.evaluate(() => ({
      [window.location.origin]: Object.fromEntries(Object.entries(window.sessionStorage))
    }));
  }

  async getPage(sportsbook: string, accountAlias: string, options: BrowserPageOptions = {}): Promise<Page> {
    const context = await this.getContext(sportsbook, accountAlias);
    const contexts = this.connectedOverCdp && this.browser ? this.browser.contexts() : [context];
    const pages = contexts.flatMap((candidate) => candidate.pages());
    const prefixes = [...(options.urlPrefixes ?? []), ...(options.urlPrefix ? [options.urlPrefix] : [])];
    const matching = prefixes.length ? pages.find((page) => prefixes.some((prefix) => page.url().startsWith(prefix))) : undefined;
    if (matching) return matching;
    if (prefixes.length && this.connectedOverCdp && options.createIfMissing === false) {
      throw new Error(`No open Chrome page matches ${prefixes.join(" or ")}; open BetOnline in the authorized Chrome session first`);
    }
    if (pages[0]) return pages[0]!;
    if (options.createIfMissing === false) throw new Error("Browser context has no open page");
    return context.newPage();
  }

  async closeContext(sportsbook: string, accountAlias: string): Promise<void> {
    const key = `${this.safeSegment(sportsbook)}:${this.safeSegment(accountAlias)}` as BrowserAccountKey;
    const context = this.contexts.get(key);
    if (context) {
      this.contexts.delete(key);
      if (!this.connectedOverCdp) await context.close();
    }
  }

  async shutdown(): Promise<void> {
    if (!this.connectedOverCdp) await Promise.allSettled([...this.contexts.values()].map((context) => context.close()));
    this.contexts.clear();
    // A CDP connection belongs to the user's Edge; never close that browser
    // from the collector. The diagnostic runner force-exits after cleanup so
    // the protocol connection is released without closing remote pages.
    if (!this.connectedOverCdp) await this.browser?.close();
    this.browser = undefined;
    this.connectedOverCdp = false;
  }
}
