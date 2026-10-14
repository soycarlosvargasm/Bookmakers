import { mkdir, chmod, writeFile, readFile, access, unlink } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SessionRecord, SessionState } from "./types.js";
import { redactSecrets } from "../health/logger.js";

export class SessionManager {
  private readonly records = new Map<string, SessionRecord>();

  constructor(private readonly storagePath: string) {}

  private key(sportsbook: string, accountAlias: string): string {
    return `${this.safeSegment(sportsbook)}:${this.safeSegment(accountAlias)}`;
  }

  private safeSegment(value: string): string {
    if (!/^[a-zA-Z0-9_.-]+$/.test(value)) throw new Error("Invalid session identifier");
    return value;
  }

  get(sportsbook: string, accountAlias: string): SessionRecord {
    const key = this.key(sportsbook, accountAlias);
    const inMemory = this.records.get(key);
    if (inMemory) return inMemory;
    try {
      const saved = JSON.parse(readFileSync(this.metadataPath(sportsbook, accountAlias), "utf8")) as SessionRecord;
      if (saved && saved.sportsbook === sportsbook && saved.accountAlias === accountAlias) {
        this.records.set(key, saved);
        return saved;
      }
    } catch {
      // A missing metadata file means this account has not been configured.
    }
    return {
      sportsbook,
      accountAlias,
      state: "NOT_CONFIGURED",
      updatedAt: new Date(0).toISOString()
    };
  }

  async setState(sportsbook: string, accountAlias: string, state: SessionState, errorMessage?: string): Promise<SessionRecord> {
    const previous = this.get(sportsbook, accountAlias);
    const record: SessionRecord = {
      ...previous,
      state,
      updatedAt: new Date().toISOString(),
      ...(state === "ACTIVE" ? { lastValidatedAt: new Date().toISOString(), errorMessage: undefined } : {}),
      ...(errorMessage ? { errorMessage: String(redactSecrets(errorMessage)) } : {})
    };
    this.records.set(this.key(sportsbook, accountAlias), record);
    const accountPath = await this.preparePrivateStorage(sportsbook, accountAlias);
    await writeFile(join(accountPath, "metadata.json"), JSON.stringify(record), { mode: 0o600 });
    return record;
  }

  async preparePrivateStorage(sportsbook: string, accountAlias: string): Promise<string> {
    const accountPath = join(this.storagePath, this.safeSegment(sportsbook), this.safeSegment(accountAlias));
    await mkdir(accountPath, { recursive: true, mode: 0o700 });
    await chmod(accountPath, 0o700);
    return accountPath;
  }

  async saveStorageState(sportsbook: string, accountAlias: string, state: unknown): Promise<void> {
    const accountPath = await this.preparePrivateStorage(sportsbook, accountAlias);
    const statePath = join(accountPath, "state.json");
    await writeFile(statePath, JSON.stringify(state), { mode: 0o600 });
    await chmod(statePath, 0o600);
  }

  async saveSessionStorage(sportsbook: string, accountAlias: string, state: unknown): Promise<void> {
    const accountPath = await this.preparePrivateStorage(sportsbook, accountAlias);
    const statePath = join(accountPath, "session-storage.json");
    await writeFile(statePath, JSON.stringify(state), { mode: 0o600 });
    await chmod(statePath, 0o600);
  }

  async hasStoredSession(sportsbook: string, accountAlias: string): Promise<boolean> {
    try {
      await access(this.storageStatePath(sportsbook, accountAlias));
      return true;
    } catch {
      return false;
    }
  }

  async setProcess(sportsbook: string, accountAlias: string, pid: number): Promise<void> {
    const accountPath = await this.preparePrivateStorage(sportsbook, accountAlias);
    await writeFile(join(accountPath, "process.json"), JSON.stringify({ pid }), { mode: 0o600 });
  }

  processPid(sportsbook: string, accountAlias: string): number | undefined {
    try {
      const value = JSON.parse(readFileSync(join(this.privateAccountPath(sportsbook, accountAlias), "process.json"), "utf8")) as { pid?: unknown };
      return typeof value.pid === "number" && Number.isInteger(value.pid) && value.pid > 0 ? value.pid : undefined;
    } catch {
      return undefined;
    }
  }

  async clearProcess(sportsbook: string, accountAlias: string): Promise<void> {
    const processPath = join(this.privateAccountPath(sportsbook, accountAlias), "process.json");
    try { await writeFile(processPath, JSON.stringify({}), { mode: 0o600 }); } catch { /* account may not exist yet */ }
  }

  async clearStoredSession(sportsbook: string, accountAlias: string): Promise<void> {
    for (const filename of ["state.json", "session-storage.json"]) {
      try { await unlink(join(this.privateAccountPath(sportsbook, accountAlias), filename)); } catch { /* already cleared */ }
    }
  }

  async readSessionStorage(sportsbook: string, accountAlias: string): Promise<Record<string, Record<string, string>>> {
    try {
      const value = JSON.parse(await readFile(join(this.privateAccountPath(sportsbook, accountAlias), "session-storage.json"), "utf8")) as unknown;
      return value && typeof value === "object" ? value as Record<string, Record<string, string>> : {};
    } catch {
      return {};
    }
  }

  private privateAccountPath(sportsbook: string, accountAlias: string): string {
    return join(this.storagePath, this.safeSegment(sportsbook), this.safeSegment(accountAlias));
  }

  private metadataPath(sportsbook: string, accountAlias: string): string {
    return join(this.privateAccountPath(sportsbook, accountAlias), "metadata.json");
  }

  storageStatePath(sportsbook: string, accountAlias: string): string {
    return join(this.privateAccountPath(sportsbook, accountAlias), "state.json");
  }
}
