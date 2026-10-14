import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { schedule, type CycleSummary, type ScheduleOptions, type SchedulerDependencies } from "../src/scheduler/scheduler.js";
import type { AcquisitionOutcome, Source } from "../src/engine/types.js";

const sources: Source[] = ["one", "two", "three", "four"].map(type => ({ type, url: `https://${type}.example/` }));
const success = (source: Source): AcquisitionOutcome => ({ status: "SUCCEEDED", source, method: "dom", records: [{ eventName: "A vs B", market: "Winner", selection: "A", rawOdds: "1.8" }], rawPath: "unused", timestamp: new Date().toISOString() });
const failed = (source: Source): AcquisitionOutcome => ({ status: "FAILED", source, reason: "Feed unavailable", attempts: [{ method: "network", reason: "Feed unavailable" }] });
type Runner = NonNullable<SchedulerDependencies["runEngine"]>;

async function fixture(work: (root: string, signals: EventEmitter, logs: string[]) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "scheduler-"));
  try { await work(root, new EventEmitter(), []); }
  finally { await rm(root, { recursive: true, force: true }); }
}
async function oneCycle(root: string, signals: EventEmitter, logs: string[], runEngine: Runner, options: Partial<ScheduleOptions> = {}): Promise<CycleSummary> {
  let summary!: CycleSummary;
  const runner = schedule({ sources, delayBetweenSourcesMs: 0, ...options, onCycleComplete: cycle => { summary = cycle; signals.emit("SIGINT"); } }, { dataDir: root, signals, log: line => logs.push(line), runEngine });
  await runner.completion;
  return summary;
}

test("scheduler immediately visits every source in order", async () => fixture(async (root, signals, logs) => {
  const visited: string[] = [];
  const summary = await oneCycle(root, signals, logs, async source => { visited.push(source.type); return success(source); });
  assert.deepEqual(visited, sources.map(source => source.type));
  assert.equal(summary.totals.succeeded, 4);
  assert.equal(summary.intervalMinutes, 15);
  assert.equal(logs[0], "Scheduler started. Interval: 15 min. Sources: 4.");
}));

test("FAILED outcomes and thrown errors never interrupt the cycle", async () => fixture(async (root, signals, logs) => {
  const summary = await oneCycle(root, signals, logs, async source => {
    if (source.type === "one") return failed(source);
    if (source.type === "two") throw new Error("Connection lost");
    return success(source);
  });
  assert.deepEqual(summary.results.map(result => result.status), ["FAILED", "FAILED", "SUCCEEDED", "SUCCEEDED"]);
  assert.equal(summary.results[1]!.reason, "Connection lost");
}));

test("PAUSED closes its browser and proceeds without human input", async () => fixture(async (root, signals, logs) => {
  let closed = false;
  const summary = await oneCycle(root, signals, logs, async source => {
    if (source.type !== "one") { assert.equal(closed, true); return success(source); }
    return { status: "PAUSED", source, event: { type: "HUMAN_INTERVENTION_REQUIRED", source, method: "network", reason: "Verify you are human", url: source.url },
      close: async () => { closed = true; }, completion: new Promise(() => {}), resume: async () => success(source) };
  });
  assert.equal(summary.results[0]!.status, "PAUSED");
  assert.equal(summary.totals.paused, 1);
  assert.equal(summary.totals.succeeded, 3);
}));

test("scheduler waits the interval after cycle completion", async () => fixture(async (root, signals, logs) => {
  const starts: number[] = [], finishes: number[] = [];
  const runner = schedule({ sources: [sources[0]!], intervalMinutes: 40 / 60_000, delayBetweenSourcesMs: 0,
    onCycleComplete: () => { finishes.push(Date.now()); if (finishes.length === 2) signals.emit("SIGINT"); } },
    { dataDir: root, signals, log: line => logs.push(line), runEngine: async source => { starts.push(Date.now()); return success(source); } });
  await runner.completion;
  assert.equal(starts.length, 2);
  assert.ok(starts[1]! - finishes[0]! >= 35);
}));

test("cycles never overlap when a source takes longer than the interval", async () => fixture(async (root, signals, logs) => {
  let running = 0, peak = 0, cycles = 0;
  const runner = schedule({ sources, intervalMinutes: 2 / 60_000, delayBetweenSourcesMs: 0,
    onCycleComplete: () => { if (++cycles === 2) signals.emit("SIGINT"); } },
    { dataDir: root, signals, log: line => logs.push(line), runEngine: async source => { peak = Math.max(peak, ++running); await delay(8); running--; return success(source); } });
  await runner.completion;
  assert.equal(peak, 1);
  assert.equal(cycles, 2);
}));

test("SIGINT cancels the current invocation without starting another source", async () => fixture(async (root, signals, logs) => {
  const visited: string[] = [];
  let cycles = 0;
  let cancelled = false;
  const runner = schedule({ sources, delayBetweenSourcesMs: 0, onCycleComplete: () => { cycles++; } },
    { dataDir: root, signals, log: line => logs.push(line), runEngine: async (source, signal) => {
      visited.push(source.type);
      if (visited.length === 1) signals.emit("SIGINT");
      cancelled = signal.aborted;
      await delay(3, undefined, { signal }); return success(source);
    } });
  await runner.completion;
  assert.deepEqual(visited, [sources[0]!.type]);
  assert.equal(cancelled, true);
  assert.equal(cycles, 1);
  assert.equal(signals.listenerCount("SIGINT"), 0);
  assert.equal(logs.filter(line => line === "Stopping scheduler...").length, 1);
}));

test("source timeout cancels that invocation and continues with the next source", async () => fixture(async (root, signals, logs) => {
  let aborted = false;
  const summary = await oneCycle(root, signals, logs, async (source, signal) => {
    if (source.type === "one") {
      await delay(1000, undefined, { signal }).catch(error => { aborted = signal.aborted; throw error; });
    } else assert.equal(aborted, true);
    return success(source);
  }, { perSourceTimeoutMs: 15 });
  assert.equal(summary.results[0]!.status, "FAILED");
  assert.match(summary.results[0]!.reason!, /Global source timeout after 15 ms/);
  assert.equal(summary.totals.succeeded, 3);
}));

test("cycle JSON contains exact metrics without full records", async () => fixture(async (root, signals, logs) => {
  const summary = await oneCycle(root, signals, logs, async source => success(source), { delayBetweenSourcesMs: 5 });
  const folder = join(root, "scheduler", summary.startedAt.slice(0, 10));
  const files = await readdir(folder);
  assert.match(files[0]!, /^\d{2}-\d{2}-\d{2}\.json$/);
  const body = await readFile(join(folder, files[0]!), "utf8");
  assert.deepEqual(JSON.parse(body), summary);
  assert.deepEqual(summary.totals, { attempted: 4, succeeded: 4, failed: 0, paused: 0, totalRecords: 4 });
  assert.ok(summary.durationMs >= 15);
  assert.ok(summary.results.every(result => !("records" in result)));
}));

test("SIGINT wakes the idle scheduler immediately without starting another cycle", async () => fixture(async (root, signals, logs) => {
  let cycles = 0;
  const runner = schedule({ sources: [sources[0]!], intervalMinutes: 15, onCycleComplete: () => { cycles++; setTimeout(() => signals.emit("SIGINT"), 5); } },
    { dataDir: root, signals, log: line => logs.push(line), runEngine: async source => success(source) });
  await runner.completion;
  assert.equal(cycles, 1);
}));
