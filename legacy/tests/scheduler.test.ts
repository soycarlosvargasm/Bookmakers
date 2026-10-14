import test from "node:test";
import assert from "node:assert/strict";
import { RequestGovernor, DEFAULT_REQUEST_POLICY, HttpRequestError, retryAfterMs } from "../src/scheduler/requests.js";
import { CollectorScheduler, DEFAULT_SCHEDULER_CONFIG } from "../src/scheduler/scheduler.js";
import { CollectorService, type CollectorRunSink } from "../src/collectors/service.js";
import type { SportsbookConnector } from "../src/connectors/types.js";
const policy = { ...DEFAULT_REQUEST_POLICY, maxRequestsPerMinute: 2, maxConcurrency: 1, maxRetries: 2 };

test("request budget counts each actual attempt, including retries, in sliding minute", async () => {
  let now = 0; const starts: number[] = []; const sleeps: number[] = [];
  const governor = new RequestGovernor(policy, { now: () => now, random: () => 0.5, sleep: async (ms) => { sleeps.push(ms); now += ms; } });
  let calls = 0;
  const result = await governor.run(async () => { starts.push(now); if (++calls < 3) throw new HttpRequestError("busy", 503); return "ok"; });
  assert.equal(result, "ok"); assert.deepEqual(starts, [0, 250, 60_000]); assert.deepEqual(sleeps, [250, 500, 59_250]);
});

test("Retry-After seconds and HTTP dates respected; 403 is not retried", async () => {
  assert.equal(retryAfterMs("2"), 2_000);
  assert.equal(retryAfterMs("Thu, 01 Jan 1970 00:00:10 GMT", 1_000), 9_000);
  let now = 0; let calls = 0;
  const governor = new RequestGovernor({ ...policy, maxRequestsPerMinute: 100 }, { now: () => now, random: () => 0, sleep: async (ms) => { now += ms; } });
  await governor.run(async () => { if (++calls === 1) throw new HttpRequestError("limited", 429, 3_000); assert.equal(now, 3_000); });
  calls = 0;
  await assert.rejects(governor.run(async () => { calls++; throw new HttpRequestError("blocked", 403); }), /blocked/);
  assert.equal(calls, 1);
});

test("request governor bounds actual network concurrency", async () => {
  const governor = new RequestGovernor({ ...policy, maxRequestsPerMinute: 100, maxConcurrency: 3 });
  let active = 0; let maximum = 0;
  const gates: Array<() => void> = [];
  const requests = Array.from({ length: 12 }, () => governor.run(async () => { active++; maximum = Math.max(maximum, active); await new Promise<void>((resolve) => gates.push(resolve)); active--; }));
  for (let completed = 0; completed < 12;) { await new Promise((resolve) => setImmediate(resolve)); for (const release of gates.splice(0)) { completed++; release(); } }
  await Promise.all(requests); assert.equal(maximum, 3);
});

test("scheduler isolates sources, prevents overlap, and cancellation cannot resurrect timers", async () => {
  const scheduler = new CollectorScheduler(); const config = { ...DEFAULT_SCHEDULER_CONFIG, liveIntervalMs: 2, errorBackoffMs: 2 };
  let release!: () => void; const held = new Promise<void>((resolve) => { release = resolve; });
  let sourceActive = 0; let overlaps = 0; let otherCalls = 0; let heldCalls = 0;
  scheduler.schedule("one:events", "live", config, async () => { heldCalls++; if (sourceActive++) overlaps++; await held; sourceActive--; });
  scheduler.schedule("one:live", "live", config, async () => { if (sourceActive) overlaps++; });
  scheduler.schedule("failure:live", "live", config, async () => { throw new Error("failure"); }, () => { throw new Error("logger failure"); });
  scheduler.schedule("other:live", "live", config, async () => { otherCalls++; });
  await new Promise((resolve) => setTimeout(resolve, 25));
  scheduler.shutdown(); release(); await scheduler.drain();
  const stoppedCalls = otherCalls; await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(overlaps, 0); assert.equal(heldCalls, 1); assert.ok(otherCalls > 0); assert.equal(otherCalls, stoppedCalls);
});

test("collector reconciles orphan runs, renews owner lease and refuses persistence after lease loss", async () => {
  const calls: string[] = []; let saved = false;
  const sink: CollectorRunSink = {
    async reconcileOrphanCollectorRuns() { calls.push("reconcile"); return 1; },
    async startCollectorRun(input) { calls.push("start"); assert.ok(input.leaseOwner); assert.equal(input.leaseDurationMs, 60_000); return 1; },
    async heartbeatCollectorRun(_id, owner) { calls.push("heartbeat"); assert.ok(owner); return false; },
    async finishCollectorRun(_id, input) { calls.push(input.status); assert.ok(input.leaseOwner); }
  };
  const connector = { context: { sportsbook: "test", accountAlias: "public" }, async collectEvents() { return { normalizedRecords: [] }; } } as unknown as SportsbookConnector;
  const collector = new CollectorService(undefined, undefined, undefined, { async saveNormalizedRecords() { saved = true; } }, undefined, sink);
  await assert.rejects(collector.collect(connector, "events"), /lease lost/);
  assert.equal(saved, false); assert.deepEqual(calls, ["reconcile", "start", "heartbeat", "FAILED"]);
});
