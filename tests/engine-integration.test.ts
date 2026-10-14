import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import type { BrowserContext, Page } from "playwright";
import { AcquisitionOrchestrator } from "../src/engine/orchestrator.js";
import { EngineStorage } from "../src/engine/storage.js";
import type { AcquisitionMethod, Handler, HandlerResult, Source, StageEvent } from "../src/engine/types.js";

const exec = promisify(execFile);
const source: Source = { url: "https://sports.example/odds", type: "sportsbook" };
const methods: AcquisitionMethod[] = ["http", "network", "dom", "accessibility", "visual"];
const extracted: HandlerResult = { kind: "data", records: [{ eventName: "A vs B", market: "Winner", selection: "A", rawOdds: "1.8" }], evidence: { url: source.url, transport: "dom", payload: { odds: 1.8 }, capturedAt: new Date().toISOString() } };

test("one engine cascades, remembers, pauses, resumes and persists the session", async () => {
  const root = await mkdtemp(join(tmpdir(), "engine-integrated-"));
  try {
    let challenge = false;
    let body = "Odds board";
    const page = { url: () => source.url, isClosed: () => false, frames: () => [], locator: (selector: string) => selector === "body" ? { innerText: async () => body } : { count: async () => 0 } } as unknown as Page;
    const browserContext = { storageState: async () => ({ cookies: [{ name: "sid", value: "private", domain: "sports.example", path: "/", expires: Date.now() / 1_000 + 3_600, httpOnly: true, secure: true, sameSite: "Lax" }], origins: [] }) } as unknown as BrowserContext;
    const calls: AcquisitionMethod[] = [];
    const stageEvents: StageEvent[] = [];
    const handlers: Handler[] = methods.map((method) => ({ method, async run(context) {
      calls.push(method);
      if (method !== "dom") return { kind: "miss", reason: "No data" };
      if (challenge) { context.page = page; context.browserContext = browserContext; }
      return body.startsWith("Verify") ? { kind: "challenge", reason: "Verify you are human", url: source.url } : extracted;
    } }));
    const storage = new EngineStorage(root);
    const engine = new AcquisitionOrchestrator({ storage, handlers, consoleNotifier: false, challengeCheckIntervalMs: 10, onStage: (event) => stageEvents.push(event) });

    assert.equal((await engine.run(source)).status, "SUCCEEDED");
    assert.deepEqual(calls, ["http", "network", "dom"]);
    assert.equal((await storage.readMemory(source))?.method, "dom");

    calls.length = 0;
    assert.equal((await engine.run(source)).status, "SUCCEEDED");
    assert.deepEqual(calls, ["dom"]);

    calls.length = 0;
    challenge = true;
    body = "Verify you are human";
    const paused = await engine.run(source);
    assert.equal(paused.status, "PAUSED");
    if (paused.status !== "PAUSED") return;
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.deepEqual(calls, ["dom"]);
    body = "Odds board";
    const completed = await paused.completion;
    assert.equal(completed.status, "SUCCEEDED");
    assert.deepEqual(calls, ["dom", "dom"]);
    assert.equal((await storage.readMemory(source))?.session.status, "VALID");
    assert.equal(stageEvents.some((event) => event.status === "CHALLENGE"), true);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("executable accepts a source and reuses its persisted memory on the second invocation", async () => {
  const root = await mkdtemp(join(tmpdir(), "engine-cli-"));
  const server = createServer((_request, response) => {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ events: [{ id: "event-1", name: "A vs B", markets: [{ id: "market-1", name: "Winner", selections: [{ id: "selection-1", name: "A", odds: 1.8 }] }] }] }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const url = `http://127.0.0.1:${address.port}/odds`;
    const command = ["--import", "tsx", "src/engine/main.ts", url, "sportsbook", "--data-dir", root];
    const first = await exec(process.execPath, command, { timeout: 15_000 });
    const second = await exec(process.execPath, command, { timeout: 15_000 });
    assert.equal(JSON.parse(first.stdout).status, "SUCCEEDED");
    assert.match(first.stderr, /\[MEMORY\] preferred=none/);
    assert.equal(JSON.parse(second.stdout).method, "http");
    assert.match(second.stderr, /\[MEMORY\] preferred=http/);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(root, { recursive: true, force: true });
  }
});
