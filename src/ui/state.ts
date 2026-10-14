import { readdir, readFile, open } from "node:fs/promises";
import { join, basename } from "node:path";
import type { Source, SourceMemory } from "../engine/types.js";
import { sourceKey } from "../engine/memory.js";
import type { CycleSummary } from "../scheduler/scheduler.js";
import type { StoredChanges } from "../changes/store.js";
import type { RunInfo } from "./actions.js";
import { loadBrands } from "./brands.js";
import { dayInZone } from "../engine/collection.js";
import { COLLECTOR_TIMEZONE } from "./daily-records.js";

export async function readJson<T>(path: string): Promise<T | null> {
  try { return JSON.parse(await readFile(path, "utf8")) as T; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}
async function files(path: string): Promise<string[]> {
  try { return await readdir(path); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
}
// "Today" is the capture day in the collector's timezone, never the machine's local day.
const localDay = (value: string | number | Date): string => dayInZone(value instanceof Date ? value.getTime() : value, COLLECTOR_TIMEZONE);
async function datedFiles(path: string): Promise<string[]> {
  const output: string[] = [];
  for (const day of await files(path)) if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    output.push(...(await files(join(path, day))).filter(file => file.endsWith(".json")).map(file => join(path, day, file)));
  }
  return output;
}
export async function listChangeFiles(dataDir = ".engine") { return datedFiles(join(dataDir, "changes")); }
export type Runtime = { running: boolean; starting?: boolean; stopping?: boolean; nextCycleAt: string | null; intervalMinutes: number | null; schedulerSources?: Source[] };
type Snapshot = { source: Source; method: string; retrievedAt: string; recordCount: number; path: string };
type Observation = { at: string; status: string; records: number | null; method: string | null; reason?: string | null; path?: string; runId?: string; inProgress?: boolean };

// RAW metadata precedes the evidence payload. Read only that header, never the large capture body.
async function snapshotHeader(path: string): Promise<Snapshot> {
  const file = await open(path, "r");
  try {
    const buffer = Buffer.alloc(16384); const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    const text = buffer.subarray(0, bytesRead).toString("utf8"); const index = text.search(/"evidence"\s*:/);
    if (index < 0) throw new Error("Missing RAW evidence metadata");
    const data = JSON.parse(text.slice(0, index).replace(/,\s*$/, "") + "}") as Snapshot;
    if (!data.source?.url || !data.retrievedAt || !Number.isSafeInteger(data.recordCount)) throw new Error("Invalid RAW metadata");
    return { ...data, path };
  } finally { await file.close(); }
}
export async function getState(dataDir = ".engine", runtime: Runtime = { running: false, nextCycleAt: null, intervalMinutes: null }, activeRuns: RunInfo[] = []) {
  const today = localDay(new Date()); const warnings: string[] = [];
  const read = async <T>(path: string): Promise<T | null> => {
    try { return await readJson<T>(path); } catch (error) { warnings.push(`${path}: ${String(error)}`); return null; }
  };
  const brands = await loadBrands();
  const snapshots: Snapshot[] = [];
  for (const name of await files(join(dataDir, "raw"))) {
    if (!/-\d+-(http|network|dom|accessibility|visual)\.json$/.test(name)) continue;
    try { snapshots.push(await snapshotHeader(join(dataDir, "raw", name))); }
    catch (error) { warnings.push(`${name}: ${String(error)}`); }
  }
  const observations = new Map<string, Observation>();
  const put = (source: Source, observation: Observation) => {
    const key = sourceKey(source), old = observations.get(key);
    if (!old || observation.at >= old.at) observations.set(key, observation);
  };
  for (const snapshot of snapshots) put(snapshot.source, { at: snapshot.retrievedAt, status: "SUCCEEDED", method: snapshot.method, records: snapshot.recordCount, path: snapshot.path });
  for (const path of await datedFiles(join(dataDir, "scheduler"))) {
    const cycle = await read<CycleSummary>(path);
    if (cycle?.results) for (const result of cycle.results) put(result.source, { at: cycle.finishedAt, status: result.status, method: result.method, records: result.recordCount, reason: result.reason, path });
  }
  const runs: RunInfo[] = [];
  for (const name of await files(join(dataDir, "ui", "runs"))) if (name.endsWith(".json")) {
    const run = await read<RunInfo>(join(dataDir, "ui", "runs", name)); if (run) runs.push(run);
  }
  for (const run of [...runs, ...activeRuns].filter(run => !run.discovery)) put(run.source, { at: run.finishedAt ?? new Date().toISOString(), status: run.state, method: run.method ?? null, records: run.records ?? null, reason: run.reason, path: run.rawPath, runId: run.runId, inProgress: !run.finishedAt });
  const enriched = await Promise.all(brands.map(async brand => {
    const regions = await Promise.all(brand.regions.map(async region => {
      const source = { type: brand.id, url: region.url };
      const memory = await read<SourceMemory>(join(dataDir, "memory", `${sourceKey(source)}.json`));
      let run = observations.get(sourceKey(source));
      if (memory?.lastAttemptAt && (!run || (!run.inProgress && memory.lastAttemptAt > run.at))) {
        const latestRaw = snapshots.filter(s => sourceKey(s.source) === sourceKey(source)).sort((a,b) => b.retrievedAt.localeCompare(a.retrievedAt))[0];
        run = { at: memory.lastAttemptAt, status: memory.lastAttemptStatus ?? "UNKNOWN", method: memory.lastAttemptMethod ?? memory.method,
          records: memory.lastAttemptStatus === "SUCCEEDED" && latestRaw && Math.abs(Date.parse(memory.lastAttemptAt)-Date.parse(latestRaw.retrievedAt)) < 60000 ? latestRaw.recordCount : null,
          reason: memory.lastFailureReason, path: latestRaw?.path };
      }
      const status = !run ? "unverified" : run.status === "QUEUED" ? "queued" : run.status === "PAUSED" || run.status === "CHALLENGE" ? "challenge" : run.inProgress ? "running" : run.status === "SKIPPED" ? "skipped" : run.status === "SUCCEEDED" ? "ok" : ["FAILED", "ERROR", "MISS"].includes(run.status) ? "failed" : "unverified";
      return { ...region, memory, latest: run?.at ?? null, latestRun: run ?? null, status, inProgress: run?.inProgress ?? false };
    }));
    const states: string[] = regions.map(r => r.status);
    return { ...brand, regions, status: ["running", "failed", "challenge", "ok"].find(s => states.includes(s)) ?? "unverified" };
  }));
  const changes: Array<StoredChanges["changes"][number] & { detectedAt: string; collector: string; sourceUrl: string; fileId: string }> = [];
  const changeFiles: Array<{ id: string; source: Source; detectedAt: string; count: number; firstRun: boolean }> = [];
  for (const path of await listChangeFiles(dataDir)) {
    const file = await read<StoredChanges>(path);
    if (!file?.detectedAt || localDay(file.detectedAt) !== today || !Array.isArray(file.changes)) continue;
    const id = basename(path); changeFiles.push({ id, source: file.source, detectedAt: file.detectedAt, count: file.changes.length, firstRun: "firstRun" in file.stats });
    changes.push(...file.changes.map(change => ({ ...change, detectedAt: file.detectedAt, collector: file.source.type, sourceUrl: file.source.url, fileId: id })));
  }
  const rank = (field: "eventName" | "market", limit: number) => {
    const counts = new Map<string, number>();
    for (const change of changes) if (change.kind === "odds_changed" && change[field]) counts.set(change[field]!, (counts.get(change[field]!) ?? 0) + 1);
    return [...counts].map(([name,count]) => ({name,count})).sort((a,b)=>b.count-a.count).slice(0,limit);
  };
  const busy = activeRuns.some(run => !run.finishedAt);
  return {
    status: { ...runtime, busy, today, timezone: COLLECTOR_TIMEZONE,
      recordsToday: snapshots.filter(s => localDay(s.retrievedAt) === today).reduce((sum,s) => sum+s.recordCount,0),
      changesToday: changes.length, activeSources: enriched.flatMap(b => b.regions).filter(r => r.status === "ok").length, warnings },
    brands: enriched,
    changes: { total: changes.length, changed: changes.filter(c => c.kind === "odds_changed").length, added: changes.filter(c => c.kind === "new_selection").length, removed: changes.filter(c => c.kind === "removed_selection").length,
      events: rank("eventName",10), markets: rank("market",5), rows: changes.sort((a,b)=>b.detectedAt.localeCompare(a.detectedAt)), files: changeFiles, today }
  };
}
