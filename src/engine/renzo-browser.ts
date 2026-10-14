import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import type { Locator, Page } from "playwright";

const executeFile = promisify(execFile);
const moduleRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const root = moduleRoot.endsWith("/dist") ? dirname(moduleRoot) : moduleRoot;
const bridgeSource = join(root, "src/ui/renzo-chrome.m");
const bridgePath = join(root, "dist/ui-macos/Sportsbook Collector.app/Contents/MacOS/RenzoChromeBridge");
export const RENZO_BRIDGE_PATH = bridgePath;
let buildBridge: Promise<void> | undefined;
export async function ensureRenzoBridge() {
  buildBridge ??= (async () => {
    const binary = await stat(bridgePath).catch(() => null);
    if (!binary || binary.mtimeMs < (await stat(bridgeSource)).mtimeMs) {
      await mkdir(dirname(bridgePath), { recursive: true });
      await executeFile("clang", ["-framework", "Foundation", "-framework", "ScriptingBridge", bridgeSource, "-o", bridgePath]);
    }
  })();
  await buildBridge;
}
const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
export type ChromeCommandRunner = (command: string, args: string[]) => Promise<string>;
const runCommand: ChromeCommandRunner = async (command, args) => {
  const { stdout } = await executeFile(command, args, { timeout: 15_000, maxBuffer: 12 * 1024 * 1024 });
  return stdout.trim();
};
export class RenzoBrowserError extends Error {}

export function renzoChromePid(processList: string): number {
  const matches = processList.split("\n").filter(line => /^\s*\d+ \/Applications\/Google Chrome\.app\/Contents\/MacOS\/Google Chrome(?: |$)/.test(line) && !/--user-data-dir(?:=|\s)/.test(line));
  if (matches.length !== 1) throw new RenzoBrowserError("Abre el Chrome personal con Renzo. No se usará ningún proceso Chrome de test.");
  return Number(matches[0]!.trim().split(/\s+/)[0]);
}

/** Read the profile name only, never cookies, credentials or stored tabs. */
export function renzoProfileDirectory(localState: unknown): string {
  const cache = (localState as { profile?: { info_cache?: Record<string, { name?: string }> } })?.profile?.info_cache;
  const matches = Object.entries(cache ?? {}).filter(([, value]) => value.name === "Renzo").map(([directory]) => directory);
  if (matches.length !== 1 || !/^(Default|Profile \d+)$/.test(matches[0]!))
    throw new RenzoBrowserError("No se encontró un único perfil Chrome Renzo. No se abrirá un navegador de test.");
  return matches[0]!;
}

/** A single collector-owned window in the existing Chrome Renzo profile.
 * Apple Events avoid relaunching Chrome with debugging flags or exporting its session.
 * This adapter implements the page operations used by the acquisition handlers.
 */
export class RenzoChromePage {
  private closed = false;
  private currentUrl = "about:blank";
  private closing?: Promise<void>;
  private constructor(private readonly pid: number, private readonly windowId: number, private readonly tabId: number, private readonly command: ChromeCommandRunner, private readonly signal?: AbortSignal) {}

  static async open(options: { command?: ChromeCommandRunner; localState?: unknown; signal?: AbortSignal } = {}): Promise<RenzoChromePage> {
    if (process.platform !== "darwin" && !options.command) throw new RenzoBrowserError("Chrome Renzo requiere la app Mac.");
    options.signal?.throwIfAborted();
    const command = options.command ?? runCommand;
    let page: RenzoChromePage | undefined;
    try {
      const state = options.localState ?? JSON.parse(await readFile(join(homedir(), "Library/Application Support/Google/Chrome/Local State"), "utf8"));
      const directory = renzoProfileDirectory(state);
      const pid = renzoChromePid(await command("ps", ["-axo", "pid=,command="]));
      if (!options.command) await ensureRenzoBridge();
      const marker = `http://127.0.0.1:3000/api/renzo-browser-check?collector=${randomUUID()}`;
      options.signal?.throwIfAborted();
      await command("open", ["-n", "-a", "/Applications/Google Chrome.app", "--args", `--profile-directory=${directory}`, "--new-window", marker]);
      let identity = "";
      const deadline = Date.now() + 10_000;
      do {
        try { identity = await command(bridgePath, [String(pid), "locate", marker]); }
        catch (error) { if ((error as { code?: number }).code !== 2) throw error; }
        if (!identity) await delay(150);
      } while (!identity && Date.now() < deadline);
      if (!/^\d+:\d+$/.test(identity)) throw new Error("No se pudo localizar la ventana del colector en Renzo.");
      const [windowId, tabId] = identity.split(":").map(Number);
      page = new RenzoChromePage(pid, windowId!, tabId!, command, options.signal);
      options.signal?.throwIfAborted();
      await page.evaluate("1");
      await page.native("navigate", "about:blank");
      page.currentUrl = "about:blank";
      return page;
    } catch (error) {
      await page?.close().catch(() => undefined);
      if (options.signal?.aborted) throw options.signal.reason;
      if (error instanceof RenzoBrowserError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      if (/javascript.*apple events|apple events.*javascript|allow javascript/i.test(message))
        throw new RenzoBrowserError("Chrome Renzo: activa View → Developer → Allow JavaScript from Apple Events. No se abrirá un navegador de test.");
      throw new RenzoBrowserError(`No se pudo conectar Chrome Renzo: ${message}. No se abrirá un navegador de test.`);
    }
  }

  private async native(operation: string, argument?: string): Promise<string> {
    if (this.closed) throw new RenzoBrowserError("La ventana de adquisición de Chrome Renzo está cerrada.");
    this.signal?.throwIfAborted();
    return this.command(bridgePath, [String(this.pid), operation, String(this.windowId), String(this.tabId), ...(argument !== undefined ? [argument] : [])]);
  }
  asPage(): Page { return this as unknown as Page; }
  url() { return this.currentUrl; }
  isClosed() { return this.closed; }
  frames() { return []; }
  async waitForTimeout(ms: number) {
    const deadline = Date.now() + ms;
    do { this.signal?.throwIfAborted(); if (this.closed) throw new RenzoBrowserError("Renzo cerrado"); await delay(Math.min(100, Math.max(0, deadline-Date.now()))); } while(Date.now()<deadline);
  }
  async evaluate<R, A = undefined>(expression: string | ((argument: A) => R | Promise<R>), argument?: A): Promise<R> {
    const expressionSource = typeof expression === "string" ? expression : `(${expression.toString()})(${JSON.stringify(argument) ?? "undefined"})`;
    const key = `__collector_evaluation_${randomUUID().replaceAll("-", "")}`;
    // Apple Events returns synchronously. Keep a promise's result in the same
    // Chrome tab until it settles, instead of serializing the Promise as {}.
    const program = `(() => {
      const __name = value => value;
      const value = ${expressionSource};
      if (value && typeof value.then === 'function') {
        window[${JSON.stringify(key)}] = {done:false};
        Promise.resolve(value).then(
          result => { window[${JSON.stringify(key)}] = {done:true,value:result===undefined?null:result}; },
          error => { window[${JSON.stringify(key)}] = {done:true,error:String(error)}; }
        );
        return JSON.stringify({url:location.href,pending:true});
      }
      return JSON.stringify({url:location.href,value:value===undefined?null:value});
    })()`;
    const result = JSON.parse(await this.native("execute", program)) as { url: string; value: R; pending?: boolean };
    this.currentUrl = result.url;
    if (!result.pending) return result.value;
    try {
      const deadline = Date.now() + 20_000;
      while (Date.now() < deadline) {
        const state = JSON.parse(await this.native("execute", `JSON.stringify({url:location.href,state:window[${JSON.stringify(key)}]})`)) as {
          url: string; state?: { done: boolean; value: R; error?: string };
        };
        this.currentUrl = state.url;
        if (!state.state) throw new Error("Chrome Renzo cambió de página durante la evaluación.");
        if (state.state.done) {
          if (state.state.error !== undefined) throw new Error(state.state.error);
          return state.state.value;
        }
        await this.waitForTimeout(100);
      }
      throw new Error("La evaluación en Chrome Renzo excedió 20000 ms.");
    } finally {
      await this.native("execute", `delete window[${JSON.stringify(key)}]`).catch(() => undefined);
    }
  }
  async goto(url: string, options: { timeout?: number } = {}) {
    // Mark the old document: Chrome may acknowledge setURL before navigation commits.
    const marker = `__collector_navigation_${randomUUID().replaceAll("-", "")}`;
    await this.evaluate(`window[${JSON.stringify(marker)}] = true`);
    await this.native("navigate", url);
    const deadline = Date.now() + (options.timeout ?? 20_000);
    while (Date.now() < deadline) {
      if (this.closed) throw new RenzoBrowserError("La navegación en Renzo fue cancelada.");
      try {
        const ready = await this.evaluate(`!window[${JSON.stringify(marker)}] && document.readyState !== 'loading' && !!document.body`);
        if (ready && this.currentUrl !== "about:blank" && !this.currentUrl.startsWith("about:blank#")) return null;
      } catch (error) { if (this.closed || this.signal?.aborted) throw error; }
      await delay(200);
    }
    throw new Error("La página no terminó de cargar en Chrome Renzo dentro del tiempo configurado.");
  }
  async title() { return this.evaluate<string>("document.title"); }
  async content() { return this.evaluate<string>("document.documentElement.outerHTML"); }
  async readSportsFeeds(options: { exhaustive?: boolean } = {}): Promise<Array<{ url: string; status: number; contentType: string; body: string }>> {
    const key = `__sportsbook_read_${randomUUID().replaceAll("-", "")}`;
    // Replay only observed public sports GET URLs. Never guess a GraphQL POST,
    // inspect account endpoints, or copy the profile's credentials to Node.
    await this.evaluate(`(() => {
      const urls = [...new Set(performance.getEntriesByType('resource').filter(e => ['fetch','xmlhttprequest'].includes(e.initiatorType)).map(e => e.name))].filter(value => {
        try { const u=new URL(value); return /^https?:$/.test(u.protocol) && /events?|fixtures?|odds|markets?|sports?|GetGames|GetLive/i.test(u.pathname)
          && !/account|wallet|login|register|betslip|payment|balance|user|profile|tracking|analytics|graphql/i.test(u.pathname)
          && ![...u.searchParams.keys()].some(k => /token|secret|auth|session|password|key|email/i.test(k)); } catch { return false; }
      });
      const selected = ${options.exhaustive ? "urls" : "urls.slice(0,8)"};
      window[${JSON.stringify(key)}] = {done:false,feeds:[]};
      const read = async url => {
        try { const response=await fetch(url,{credentials:'same-origin',signal:AbortSignal.timeout(5000)});
          const contentType=response.headers.get('content-type') || ''; if(!/json/i.test(contentType))return null;
          const body=await response.text(); if(body.length>2097152)return null;
          JSON.parse(body); return {url,status:response.status,contentType,body};
        } catch { return null; }
      };
      (async () => {
        const feeds=[];
        if (${Boolean(options.exhaustive)}) {
          for(let i=0;i<selected.length;i+=2) feeds.push(...await Promise.all(selected.slice(i,i+2).map(read)));
        } else feeds.push(...await Promise.all(selected.map(read)));
        window[${JSON.stringify(key)}]={done:true,feeds:feeds.filter(Boolean)};
      })();
      return null;
    })()`);
    try {
      const deadline = Date.now() + (options.exhaustive ? 60_000 : 7000);
      while (Date.now() < deadline) {
        const state = await this.evaluate<{ done: boolean; feeds: Array<{ url: string; status: number; contentType: string; body: string }> }>(`window[${JSON.stringify(key)}]`);
        if (state?.done) return state.feeds;
        await delay(200);
      }
      if (options.exhaustive) throw new Error("La lectura de las respuestas deportivas observadas excedió 60 segundos; cobertura de red parcial.");
      return [];
    } finally { await this.evaluate(`delete window[${JSON.stringify(key)}]`).catch(() => undefined); }
  }
  locator(selector: string): Locator {
    const make = (index?: number) => {
      const element = index === undefined ? `document.querySelector(${JSON.stringify(selector)})` : `document.querySelectorAll(${JSON.stringify(selector)})[${index}]`;
      const visible = `(() => { const e=${element}; if(!e)return false; const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'; })()`;
      const locator = {
        count: () => this.evaluate<number>(`document.querySelectorAll(${JSON.stringify(selector)}).length`),
        innerText: () => this.evaluate<string>(`${element}?.innerText ?? ''`),
        isVisible: () => this.evaluate<boolean>(visible),
        nth: (i: number) => make(i), first: () => make(0),
        waitFor: async (options: { timeout?: number } = {}) => {
          const deadline = Date.now() + (options.timeout ?? 20_000);
          while (Date.now() < deadline) { if (await this.evaluate<boolean>(visible)) return; await delay(200); }
          throw new Error(`Renzo: no apareció el contenido ${selector}`);
        }
      };
      return locator as unknown as Locator;
    };
    return make();
  }
  async screenshot(): Promise<Buffer> { throw new Error("La conexión Renzo mediante Apple Events no expone capturas de pantalla."); }
  async close(): Promise<void> {
    if (this.closing) return this.closing;
    this.closed = true;
    this.closing = this.command(bridgePath, [String(this.pid), "close", String(this.windowId), String(this.tabId)]).then(() => undefined);
    return this.closing;
  }
}
