import { CollectionStore } from "../engine/collection.js";
import { stat } from "node:fs/promises";
import { basename } from "node:path";
import type { Pool } from "pg";
import { listSnapshots, loadSnapshotFile } from "../snapshots/loader.js";
import { UnsupportedSnapshotError } from "../snapshots/reader.js";

/** Durable RAW files are the queue. Database SHA256 transactions make retries
 * idempotent; a DB outage cannot turn an acquired capture into lost data. */
export class SnapshotIngestion {
  private readonly seen = new Map<string, string>();
  private readonly loaded = new Map<string, "LOADED" | "EMPTY">();
  private readonly errors = new Map<string, string>();
  private active?: Promise<void>;
  private closed = false;
  private totalFiles = 0;
  get status(){return {syncing:Boolean(this.active),pending:Math.max(0,this.totalFiles-this.seen.size),errors:this.errors.size};}
  private readonly timer: ReturnType<typeof setInterval>;
  constructor(private readonly pool: Pool, private readonly root: string,
    private readonly log: (line: string, source?: string) => void,
    private readonly onLoaded: (source: string, records: number) => void,
    intervalMs = 5000) {
    this.timer = setInterval(() => { void this.sync(); }, intervalMs); this.timer.unref();
  }
  sync(): Promise<void> {
    if (this.closed) return Promise.resolve();
    return this.active ??= this.scan().catch(error => {
      const reason = error instanceof Error ? error.message : String(error);
      if (this.errors.get("database") !== reason) this.log(`ERROR loading RAW into Data: ${reason}. Automatic retry remains active.`);
      this.errors.set("database", reason);
    }).finally(() => { this.active = undefined; });
  }
  private async scan(): Promise<void> {
    const files = await listSnapshots(this.root).catch(error => { if (error.code === "ENOENT") return []; throw error; });
    this.totalFiles=files.length;
    for (const file of files) {
      if (this.closed) break;
      const metadata = await stat(file);
      const fingerprint = `${metadata.mtimeMs}:${metadata.size}`;
      if (this.seen.get(file) === fingerprint) {
        const status = this.loaded.get(file);
        if (status) {
          const store = new CollectionStore(this.root);
          const receipt = await store.receipt(basename(file, ".json"));
          if (receipt && receipt.ingestion !== status) await store.ingestion(file, undefined, status === "EMPTY");
        }
        continue;
      }
      try {
        const result = await loadSnapshotFile(this.pool, file);
        this.loaded.set(file, result.status === "empty" ? "EMPTY" : "LOADED");
        await new CollectionStore(this.root).ingestion(file, undefined, result.status === "empty");
        this.seen.set(file, fingerprint); this.errors.delete(file); this.errors.delete("database");
        if (result.status === "loaded") {
          this.log(`OK Data: ${result.records} records loaded automatically from ${basename(file)}`, result.source);
          this.onLoaded(result.source, result.records);
        } else if (result.status === "archived") {
          this.log(`OK Archivo: ${basename(file)} guardado íntegro en PostgreSQL con ${result.records} registros validados (sin identificador de evento del proveedor; disponibles en la exportación diaria).`, result.source);
        }
      } catch (error) {
        if (error instanceof UnsupportedSnapshotError) { this.seen.set(file, fingerprint); continue; }
        await new CollectionStore(this.root).ingestion(file, error instanceof Error ? error.message : String(error));
        if (["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "57P01", "57P03", "42P01"].includes(String((error as { code?: string }).code))) throw error;
        const reason = error instanceof Error ? error.message : String(error);
        if (this.errors.get(file) !== reason) this.log(`ERROR Data ${basename(file)}: ${reason}. Retrying automatically.`);
        this.errors.set(file, reason);
      }
    }
  }
  async close(): Promise<void> { this.closed = true; clearInterval(this.timer); await this.active; }
}
