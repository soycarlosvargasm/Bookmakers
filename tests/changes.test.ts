import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { detectChanges } from "../src/changes/detector.js";
import { ChangesStore, type StoredChanges } from "../src/changes/store.js";
import { readSnapshot } from "../src/changes/cycles.js";
import { sourceKey } from "../src/engine/memory.js";
import { schedule } from "../src/scheduler/scheduler.js";
import type { ProviderRecord } from "../src/normalization/types.js";

const record = (odds = 2, patch: ProviderRecord = {}): ProviderRecord => ({ sportsbook: "book", bookmaker: "book", sourceEventId: "event", sourceMarketId: "market", sourceSelectionId: "selection", eventName: "A vs B", market: "Moneyline", selection: "A", rawOdds: String(odds), decimalOdds: odds, ...patch });

test("changes detects an upward price and preserves the unrounded magnitude", () => {
  const result = detectChanges([record(2)], [record(2.25)]);
  assert.equal(result.changes[0]!.kind, "odds_changed");
  const change = result.changes[0]!;
  if (change.kind !== "odds_changed") return;
  assert.equal(change.direction, "up"); assert.equal(change.magnitude, Math.abs(2.25 - 2));
  assert.equal(change.previousOdds, "2"); assert.equal(change.currentDecimal, 2.25);
  assert.deepEqual(result.stats, { compared: 1, changed: 1, new: 0, removed: 0, unchanged: 0 });
});
test("changes detects a downward price", () => {
  const change = detectChanges([record(2.5)], [record(2)]).changes[0]!;
  assert.equal(change.kind, "odds_changed");
  if (change.kind === "odds_changed") { assert.equal(change.direction, "down"); assert.equal(change.magnitude, 0.5); }
});
test("changes ignores movements smaller than 0.01", () => {
  const result = detectChanges([record(2)], [record(2.009)]);
  assert.deepEqual(result.changes, []); assert.equal(result.stats.unchanged, 1);
});
test("changes includes exactly 0.01 without rounding its magnitude", () => {
  for (const [before, after] of [[2, 2.01], [2.01, 2]]) {
    const change = detectChanges([record(before)], [record(after)]).changes[0]!;
    assert.equal(change.kind, "odds_changed");
    if (change.kind === "odds_changed") assert.equal(change.magnitude, Math.abs(after - before));
  }
});
test("changes detects new selections", () => {
  const result = detectChanges([], [record()]);
  assert.equal(result.changes[0]!.kind, "new_selection"); assert.equal(result.changes[0]!.previousDecimal, null); assert.equal(result.stats.new, 1);
});
test("changes detects removed selections", () => {
  const result = detectChanges([record()], []);
  assert.equal(result.changes[0]!.kind, "removed_selection"); assert.equal(result.changes[0]!.currentDecimal, null); assert.equal(result.stats.removed, 1);
});
test("identical records and raw-format-only changes produce no price changes", () => {
  assert.deepEqual(detectChanges([record()], [record()]).changes, []);
  assert.deepEqual(detectChanges([record()], [record(2, { rawOdds: "+100" })]).changes, []);
});
test("every component of source/event/market/selection participates in the key", () => {
  for (const key of ["sportsbook", "sourceEventId", "sourceMarketId", "sourceSelectionId"] as const) {
    const result = detectChanges([record()], [record(2, { [key]: "different" })]);
    assert.deepEqual(result.stats, { compared: 0, changed: 0, new: 1, removed: 1, unchanged: 0 });
  }
});
test("empty snapshots do not break comparison", () => {
  assert.deepEqual(detectChanges([], []).stats, { compared: 0, changed: 0, new: 0, removed: 0, unchanged: 0 });
  assert.equal(detectChanges([], [record()]).stats.new, 1); assert.equal(detectChanges([record()], []).stats.removed, 1);
});
test("missing IDs and conflicting duplicate prices fail explicitly", () => {
  assert.throws(() => detectChanges([], [record(2, { sourceEventId: null })]), /stable/);
  assert.throws(() => detectChanges([record(2), record(3)], []), /Conflicting duplicate/);
});
test("store logs unchanged snapshots and writes nothing", async () => {
  const root = await mkdtemp(join(tmpdir(), "changes-store-"));
  try {
    const logs: string[] = [];
    const path = await new ChangesStore(root, line => logs.push(line)).save({ cycleId: "cycle", detectedAt: new Date().toISOString(), source: { type: "book", url: "https://book.example/" }, previousSnapshot: "old", currentSnapshot: "current", ...detectChanges([record()], [record()]) });
    assert.equal(path, null); assert.match(logs[0]!, /no changes detected/); assert.deepEqual(await readdir(root), []);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("scheduler persists first-run and changed cycles, skips an unchanged cycle and isolates detector errors", async () => {
  const root = await mkdtemp(join(tmpdir(), "changes-scheduler-"));
  const source = { type: "book", url: "https://book.example/" };
  const signals = new EventEmitter(), logs: string[] = [];
  let cycle = 0;
  try {
    const runner = schedule({ sources: [source], intervalMinutes: 2 / 60_000, delayBetweenSourcesMs: 0,
      onCycleComplete: () => { if (cycle === 4) signals.emit("SIGINT"); } }, {
      dataDir: root, signals, log: line => logs.push(line), runEngine: async () => {
        cycle++;
        await delay(2);
        const records = [record(cycle === 1 ? 2 : 2.25)];
        const path = join(root, "raw", `${sourceKey(source)}-${Date.now()}-dom.json`);
        await mkdir(join(root, "raw"), { recursive: true });
        await writeFile(path, JSON.stringify({ source, recordCount: cycle === 4 ? 2 : 1, evidence: { payload: { records } } }));
        return { status: "SUCCEEDED", source, method: "dom", records, rawPath: path, timestamp: new Date().toISOString() };
      }
    });
    await runner.completion;
    const dates = await readdir(join(root, "changes"));
    const files = await readdir(join(root, "changes", dates[0]!));
    assert.equal(files.length, 2);
    const stored = await Promise.all(files.map(file => readFile(join(root, "changes", dates[0]!, file), "utf8").then(body => JSON.parse(body) as StoredChanges)));
    assert.ok(stored.some(item => "firstRun" in item.stats));
    const changed = stored.find(item => !("firstRun" in item.stats))!;
    assert.equal(changed.changes.length, 1); assert.equal(changed.changes[0]!.kind, "odds_changed");
    assert.notEqual(changed.previousSnapshot, changed.currentSnapshot);
    assert.ok(logs.some(line => line.includes("no changes detected")));
    assert.ok(logs.some(line => line.includes("Change detection failed book: Incomplete snapshot")));
    assert.equal(cycle, 4);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("snapshot reader rejects incomplete saved evidence instead of inventing removed selections", async () => {
  const root = await mkdtemp(join(tmpdir(), "changes-read-"));
  try {
    const path = join(root, "incomplete.json");
    await writeFile(path, JSON.stringify({ recordCount: 2, evidence: { payload: { records: [record()] } } }));
    await assert.rejects(readSnapshot(path), /recordCount=2, readable records=1/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
