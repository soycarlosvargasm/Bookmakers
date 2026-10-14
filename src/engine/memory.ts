import { createHash } from "node:crypto";
import { mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { BrowserContext } from "playwright";
import type { AcquisitionMethod, ExtractionProfile, HandlerConfiguration, Source, SourceMemory, SessionMemory } from "./types.js";

export const sourceKey = (source: Source): string => createHash("sha256").update(`${source.type}\0${source.url}`).digest("hex");
type StorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;
const now = (): string => new Date().toISOString();
const sameHost = (source: Source, domain: string): boolean => { const host = new URL(source.url).hostname; const clean = domain.replace(/^\./, ""); return host === clean || host.endsWith(`.${clean}`); };
const relevantState = (source: Source, state: StorageState): StorageState => ({
  cookies: state.cookies.filter((cookie) => sameHost(source, cookie.domain)),
  origins: state.origins.filter((origin) => { try { return new URL(origin.origin).hostname === new URL(source.url).hostname && origin.localStorage.length > 0; } catch { return false; } })
});
const emptySession = (): SessionMemory => ({ path: null, expiresAt: null, status: "NONE", updatedAt: null });
const emptyMemory = (source: Source): SourceMemory => ({ version: 2, source, method: null, configuration: null, extractionProfile: null, lastSuccessAt: null, lastAttemptAt: null, lastAttemptMethod: null, lastAttemptStatus: null, lastFailureReason: null, session: emptySession(), requiresHumanIntervention: false, lastHumanInterventionAt: null });

const safeConfiguration = (config?: HandlerConfiguration): HandlerConfiguration | null => {
  if (!config) return null;
  const headers = Object.fromEntries(Object.entries(config.headers ?? {}).filter(([name]) => /^(accept|accept-language|content-type|user-agent|x-requested-with)$/i.test(name)).slice(0, 12).map(([name, value]) => [name, value.slice(0, 500)]));
  const endpoints = (config.endpoints ?? []).slice(0, 30).flatMap((value) => {
    try {
      const url = new URL(value);
      if (!["http:", "https:", "ws:", "wss:"].includes(url.protocol)) return [];
      url.username = ""; url.password = ""; url.hash = "";
      for (const name of [...url.searchParams.keys()]) if (/token|secret|key|auth|session|password|email/i.test(name)) url.searchParams.set(name, "[REDACTED]");
      return [url.toString()];
    } catch { return []; }
  });
  const strings = (value: Record<string, string> | undefined) => Object.fromEntries(Object.entries(value ?? {}).slice(0, 30).filter(([name]) => !/token|secret|auth|cookie|password/i.test(name)).map(([name, item]) => [name.slice(0, 80), item.slice(0, 500)]));
  return { ...(Object.keys(headers).length ? { headers } : {}), ...(endpoints.length ? { endpoints } : {}), ...(Object.keys(config.selectors ?? {}).length ? { selectors: strings(config.selectors) } : {}), ...(Object.keys(config.patterns ?? {}).length ? { patterns: strings(config.patterns) } : {}), ...(config.transport ? { transport: config.transport.slice(0, 40) } : {}) };
};

const migrate = (source: Source, value: unknown): SourceMemory => {
  if (!value || typeof value !== "object") return emptyMemory(source);
  const old = value as Record<string, unknown>;
  if (old.version === 2) return { ...emptyMemory(source), ...old, source, session: { ...emptySession(), ...(old.session as object ?? {}) } } as SourceMemory;
  const timestamp = typeof old.timestamp === "string" ? old.timestamp : null;
  return { ...emptyMemory(source), method: old.method as AcquisitionMethod | null ?? null, lastSuccessAt: old.status === "SUCCEEDED" ? timestamp : null, lastAttemptAt: timestamp, lastAttemptStatus: old.status === "SUCCEEDED" ? "SUCCEEDED" : old.status === "PAUSED" ? "CHALLENGE" : "ERROR", session: typeof old.sessionPath === "string" ? { path: old.sessionPath, expiresAt: null, status: "VALID", updatedAt: timestamp } : emptySession() };
};

async function atomicJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2), { mode: 0o600 });
  await rename(temporary, path);
}

export class SourceMemoryStore {
  constructor(readonly root = ".engine") {}
  private path(source: Source): string { return join(this.root, "memory", `${sourceKey(source)}.json`); }
  private sessionPath(source: Source): string { return join(this.root, "sessions", `${sourceKey(source)}.json`); }

  private async locked<T>(source: Source, action: () => Promise<T>): Promise<T> {
    const lockPath = `${this.path(source)}.lock`;
    await mkdir(dirname(lockPath), { recursive: true });
    const deadline = Date.now() + 5_000;
    while (true) {
      try {
        const handle = await open(lockPath, "wx", 0o600);
        try { return await action(); }
        finally { await handle.close(); await unlink(lockPath).catch(() => undefined); }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        if ((await stat(lockPath).catch(() => null))?.mtimeMs! < Date.now() - 30_000) await unlink(lockPath).catch(() => undefined);
        if (Date.now() > deadline) throw new Error("Source memory lock timed out");
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }
  }

  private async readFile(source: Source): Promise<SourceMemory | null> {
    try { return migrate(source, JSON.parse(await readFile(this.path(source), "utf8"))); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
  }

  async read(source: Source): Promise<SourceMemory | null> {
    return this.locked(source, async () => {
      const memory = await this.readFile(source);
      if (!memory || memory.session.status !== "VALID") return memory;
      let status: SessionMemory["status"] = "VALID";
      if (memory.session.expiresAt && Date.parse(memory.session.expiresAt) <= Date.now()) status = "EXPIRED";
      else if (!memory.session.path) status = "INVALID";
      else {
        try {
          const state = JSON.parse(await readFile(memory.session.path, "utf8")) as StorageState;
          if (!Array.isArray(state.cookies) || !Array.isArray(state.origins)) status = "INVALID";
          else {
            const relevant = relevantState(source, state);
            const liveCookies = relevant.cookies.filter((cookie) => cookie.expires < 0 || cookie.expires > Date.now() / 1_000);
            if (!liveCookies.length && !relevant.origins.length) status = relevant.cookies.length ? "EXPIRED" : "INVALID";
          }
        } catch { status = "INVALID"; }
      }
      if (status !== "VALID") { memory.session.status = status; memory.session.updatedAt = now(); await atomicJson(this.path(source), memory); }
      return memory;
    });
  }

  private async update(source: Source, change: (memory: SourceMemory) => Promise<void> | void): Promise<SourceMemory> {
    return this.locked(source, async () => {
      const memory = await this.readFile(source) ?? emptyMemory(source);
      await change(memory);
      await atomicJson(this.path(source), memory);
      return memory;
    });
  }

  async recordAttempt(source: Source, method: AcquisitionMethod, status: "MISS" | "ERROR", reason: string): Promise<SourceMemory> {
    return this.update(source, (memory) => { memory.lastAttemptAt = now(); memory.lastAttemptMethod = method; memory.lastAttemptStatus = status; memory.lastFailureReason = reason.slice(0, 1_000); });
  }

  async recordChallenge(source: Source, method: AcquisitionMethod, reason: string, sessionWasUsed: boolean): Promise<SourceMemory> {
    return this.update(source, (memory) => {
      memory.lastAttemptAt = now(); memory.lastAttemptMethod = method; memory.lastAttemptStatus = "CHALLENGE"; memory.lastFailureReason = reason.slice(0, 1_000);
      memory.requiresHumanIntervention = true;
      if (sessionWasUsed && memory.session.status === "VALID") { memory.session.status = "INVALID"; memory.session.updatedAt = now(); }
    });
  }

  async recordHumanResolution(source: Source): Promise<SourceMemory> {
    return this.update(source, (memory) => { memory.lastHumanInterventionAt = now(); });
  }

  async invalidateSession(source: Source): Promise<SourceMemory> {
    return this.update(source, (memory) => { if (memory.session.path) { memory.session.status = "INVALID"; memory.session.updatedAt = now(); } });
  }

  async recordSuccess(source: Source, method: AcquisitionMethod, configuration?: HandlerConfiguration, context?: BrowserContext, extractionProfile?: ExtractionProfile): Promise<SourceMemory> {
    const state = context ? await context.storageState() : null;
    return this.update(source, async (memory) => {
      const timestamp = now();
      memory.method = method; memory.configuration = safeConfiguration(configuration); memory.lastSuccessAt = timestamp;
      if (extractionProfile) memory.extractionProfile = extractionProfile;
      memory.lastAttemptAt = timestamp; memory.lastAttemptMethod = method; memory.lastAttemptStatus = "SUCCEEDED"; memory.lastFailureReason = null;
      if (state) {
        const relevant = relevantState(source, state);
        const relevantCookies = relevant.cookies.filter((cookie) => cookie.expires < 0 || cookie.expires > Date.now() / 1_000);
        const relevantOrigins = relevant.origins;
        if (relevantCookies.length || relevantOrigins.length) {
          const path = this.sessionPath(source);
          await atomicJson(path, { cookies: relevantCookies, origins: relevantOrigins });
          const persistent = relevantCookies.map((cookie) => cookie.expires).filter((expires) => expires > Date.now() / 1_000);
          const estimate = persistent.length ? Math.min(...persistent.map((expires) => expires * 1_000), Date.now() + 7 * 86_400_000) : Date.now() + 86_400_000;
          memory.session = { path, expiresAt: new Date(estimate).toISOString(), status: "VALID", updatedAt: timestamp };
        } else memory.session = emptySession();
      }
    });
  }
}
