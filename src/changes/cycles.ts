import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { sourceKey } from "../engine/memory.js";
import type { Source } from "../engine/types.js";
import type { ProviderRecord } from "../normalization/types.js";
import { extractPinnacleRecords } from "../network/pinnacle.js";
import { extractBetssonRecords } from "../network/betsson.js";
import type { CycleSummary } from "../scheduler/scheduler.js";
import { detectChanges } from "./detector.js";
import { ChangesStore } from "./store.js";

async function entries(folder: string): Promise<string[]> {
  try { return await readdir(folder); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
}
export async function readSnapshot(path: string): Promise<ProviderRecord[]> {
  const snapshot = JSON.parse(await readFile(path, "utf8"));
  const payload = snapshot.evidence?.payload;
  let records: ProviderRecord[];
  if (Array.isArray(payload?.records)) records = payload.records;
  else if (Array.isArray(payload?.captures) && snapshot.source?.type === "pinnacle") records = extractPinnacleRecords(payload.captures, snapshot.retrievedAt);
  else if (Array.isArray(payload?.captures) && snapshot.source?.type === "betsson") records = extractBetssonRecords(payload.captures, snapshot.retrievedAt);
  else throw new Error(`Snapshot has no supported complete record representation: ${path}`);
  if (records.length !== snapshot.recordCount) throw new Error(`Incomplete snapshot ${path}: recordCount=${snapshot.recordCount}, readable records=${records.length}`);
  return records;
}

export class CycleChanges {
  private readonly previous = new Map<string, string>();
  private readonly store: ChangesStore;
  constructor(private readonly root = ".engine", private readonly log: (line: string) => void = console.log) { this.store = new ChangesStore(root, log); }
  private async snapshot(source: Source, start: number, end: number): Promise<string | null> {
    const prefix = `${sourceKey(source)}-`;
    const files = (await entries(join(this.root, "raw"))).flatMap(file => {
      if (!file.startsWith(prefix)) return [];
      const match = /-(\d+)-(http|network|dom|accessibility|visual)\.json$/.exec(file);
      const timestamp = match ? Number(match[1]) : NaN;
      return timestamp >= start && timestamp <= end ? [{ file, timestamp }] : [];
    }).sort((a, b) => b.timestamp - a.timestamp);
    return files[0] ? join(this.root, "raw", files[0].file) : null;
  }
  private async previousCycle(source: Source, current: CycleSummary): Promise<string | null> {
    const folder = join(this.root, "scheduler");
    const cycles: CycleSummary[] = [];
    for (const date of await entries(folder)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      for (const file of await entries(join(folder, date))) if (file.endsWith(".json")) {
        const cycle = JSON.parse(await readFile(join(folder, date, file), "utf8")) as CycleSummary;
        if (cycle.finishedAt <= current.startedAt && cycle.results.some(result => result.status === "SUCCEEDED" && sourceKey(result.source) === sourceKey(source))) cycles.push(cycle);
      }
    }
    cycles.sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
    return cycles[0] ? this.snapshot(source, Date.parse(cycles[0].startedAt), Date.parse(cycles[0].finishedAt)) : null;
  }
  async processCycle(cycle: CycleSummary): Promise<void> {
    for (const result of cycle.results) {
      if (result.status !== "SUCCEEDED") { this.log(`Changes skipped ${result.source.type}: ${result.status}`); continue; }
      try {
        const key = sourceKey(result.source);
        const currentSnapshot = await this.snapshot(result.source, Date.parse(cycle.startedAt), Date.parse(cycle.finishedAt));
        if (!currentSnapshot) throw new Error("No RAW snapshot generated within this cycle");
        const current = await readSnapshot(currentSnapshot);
        const previousSnapshot = this.previous.get(key) ?? await this.previousCycle(result.source, cycle);
        const detected = previousSnapshot ? detectChanges(await readSnapshot(previousSnapshot), current) : { changes: [], stats: { firstRun: true } as const };
        await this.store.save({ cycleId: cycle.cycleId, detectedAt: new Date().toISOString(), source: result.source, previousSnapshot, currentSnapshot, ...detected });
        this.previous.set(key, currentSnapshot);
      } catch (error) { this.log(`Change detection failed ${result.source.type}: ${error instanceof Error ? error.message : String(error)}`); }
    }
  }
}
