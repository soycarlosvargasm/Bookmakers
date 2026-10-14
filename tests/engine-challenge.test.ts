import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { BrowserContext, Page } from "playwright";
import { detectHttpChallenge, detectPageChallenge } from "../src/engine/challenge.js";
import { AcquisitionOrchestrator } from "../src/engine/orchestrator.js";
import { EngineStorage } from "../src/engine/storage.js";
import type { AcquisitionMethod, Handler, HandlerResult, InterventionEvent, Source } from "../src/engine/types.js";

const source: Source = { url: "https://sports.example/odds", type: "sportsbook" };
const methods: AcquisitionMethod[] = ["http", "network", "dom", "accessibility", "visual"];

test("HTTP and browser challenge detection covers status, iframe and verification redirects", async () => {
  assert.match(detectHttpChallenge(429, source.url, "Too many requests", source.url)?.reason ?? "", /429/);
  assert.match(detectHttpChallenge(200, "https://sports.example/verify-human", "", source.url)?.reason ?? "", /Redirect/);
  assert.match(detectHttpChallenge(200, source.url, '<iframe src="https://hcaptcha.com/1/api.js"></iframe>', source.url)?.reason ?? "", /iframe/);
  const page = { url: () => source.url, frames: () => [], locator: (selector: string) => selector === "body" ? { innerText: async () => "Odds board" } : { count: async () => 1, nth: () => ({ isVisible: async () => true }) } } as unknown as Page;
  assert.equal((await detectPageChallenge(page, undefined, source.url))?.reason, "Challenge iframe");
});

test("handoff stays paused without retries, then resumes same handler and saves session", async () => {
  const root = await mkdtemp(join(tmpdir(), "engine-handoff-"));
  try {
    let body = "Verify you are human";
    const page = {
      url: () => source.url,
      isClosed: () => false,
      frames: () => [],
      locator: (selector: string) => selector === "body" ? { innerText: async () => body } : { count: async () => 0 }
    } as unknown as Page;
    const browserContext = { storageState: async () => ({ cookies: [{ name: "sid", value: "private", domain: "sports.example", path: "/", expires: Date.now() / 1_000 + 3_600, httpOnly: true, secure: true, sameSite: "Lax" }], origins: [] }) } as unknown as BrowserContext;
    const calls: AcquisitionMethod[] = [];
    const extracted: HandlerResult = { kind: "data", records: [{ eventName: "A vs B", market: "Winner", selection: "A", rawOdds: "1.8" }], evidence: { url: source.url, transport: "dom", payload: { odds: 1.8 }, capturedAt: new Date().toISOString() } };
    const handlers: Handler[] = methods.map((method) => ({ method, async run(context) {
      calls.push(method);
      if (method !== "dom") return { kind: "miss", reason: "No data" };
      context.page = page;
      context.browserContext = browserContext;
      return body.startsWith("Verify") ? { kind: "challenge", reason: "Verify you are human", url: source.url } : extracted;
    } }));
    const notices: InterventionEvent[] = [];
    const storage = new EngineStorage(root);
    const outcome = await new AcquisitionOrchestrator({ storage, handlers, consoleNotifier: false, challengeCheckIntervalMs: 10, onHumanIntervention: (event) => notices.push(event) }).run(source);
    assert.equal(outcome.status, "PAUSED");
    if (outcome.status !== "PAUSED") return;
    assert.equal(notices.length, 1);
    assert.equal(notices[0]?.page, page);
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.deepEqual(calls, ["http", "network", "dom"]);
    body = "Odds board";
    const completed = await outcome.completion;
    assert.equal(completed.status, "SUCCEEDED");
    if (completed.status === "SUCCEEDED") assert.equal(completed.method, "dom");
    const memory = await storage.readMemory(source);
    assert.equal(memory?.session.status, "VALID");
    assert.equal(memory?.requiresHumanIntervention, true);
    assert.ok(memory?.lastHumanInterventionAt);
    assert.deepEqual(calls, ["http", "network", "dom", "dom"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("HTTP challenge does not open a browser or continue before explicit resume", async () => {
  const root = await mkdtemp(join(tmpdir(), "engine-http-handoff-"));
  try {
    const calls: AcquisitionMethod[] = [];
    const handlers: Handler[] = methods.map((method) => ({ method, async run(context) {
      calls.push(method);
      assert.equal(context.page, undefined);
      return method === "http"
        ? { kind: "challenge", reason: "HTTP 403 verification required", url: source.url }
        : { kind: "miss", reason: "No data" };
    } }));
    const outcome = await new AcquisitionOrchestrator({ storage: new EngineStorage(root), handlers, consoleNotifier: false }).run(source);
    assert.equal(outcome.status, "PAUSED");
    if (outcome.status !== "PAUSED") return;
    assert.equal(outcome.event.page, undefined);
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.deepEqual(calls, ["http"]);
    const completed = await outcome.resume();
    assert.equal(completed.status, "FAILED");
    assert.deepEqual(calls, methods);
  } finally { await rm(root, { recursive: true, force: true }); }
});
