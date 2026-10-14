import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import type { Browser, Page } from "playwright";
import { AcquisitionOrchestrator } from "../src/engine/orchestrator.js";
import { EngineStorage } from "../src/engine/storage.js";
import { waitForChallengeClear } from "../src/engine/challenge.js";
import type { AcquisitionMethod, Handler, Source } from "../src/engine/types.js";

const source: Source = { url: "https://sports.example/odds", type: "sportsbook" };
const methods: AcquisitionMethod[] = ["http", "network", "dom", "accessibility", "visual"];

test("force-browser starts at network despite HTTP memory, preserves the paused browser and resumes network", async () => {
  const root = await mkdtemp(join(tmpdir(), "engine-force-"));
  let outcome: Awaited<ReturnType<AcquisitionOrchestrator["run"]>> | undefined;
  try {
    let body = "Verify you are human", closed = 0;
    const calls: AcquisitionMethod[] = [];
    const page = { url: () => source.url, isClosed: () => false, frames: () => [], locator: (selector: string) => selector === "body" ? { innerText: async () => body } : { count: async () => 0 } } as unknown as Page;
    const browser = { close: async () => { closed++; } } as unknown as Browser;
    const handlers: Handler[] = methods.map(method => ({ method, async run(context) {
      calls.push(method);
      assert.equal(method, "network");
      context.page = page; context.browser = browser;
      return body.startsWith("Verify") ? { kind: "challenge", reason: body, url: source.url }
        : { kind: "data", records: [{ eventName: "A vs B", market: "Winner", selection: "A", rawOdds: "1.8" }], evidence: { url: source.url, transport: "fetch", payload: {}, capturedAt: new Date().toISOString() } };
    } }));
    const storage = new EngineStorage(root);
    await storage.memory.recordSuccess(source, "http");
    outcome = await new AcquisitionOrchestrator({ storage, handlers, forceBrowser: true, consoleNotifier: false, challengeCheckIntervalMs: 10 }).run(source);
    assert.equal(outcome.status, "PAUSED");
    if (outcome.status !== "PAUSED") return;
    await new Promise(resolve => setTimeout(resolve, 40));
    assert.equal(closed, 0); assert.deepEqual(calls, ["network"]);
    body = "Odds board";
    assert.equal((await outcome.completion).status, "SUCCEEDED");
    assert.deepEqual(calls, ["network", "network"]);
    assert.equal(closed, 1);
    assert.equal((await storage.readMemory(source))?.method, "network");
  } finally {
    if (outcome?.status === "PAUSED") await outcome.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("challenge clearance requires two consecutive clean checks", async () => {
  const bodies = ["Odds board", "Verify you are human", "Odds board", "Odds board"];
  let checks = 0;
  const page = { url: () => source.url, isClosed: () => false, frames: () => [], locator: (selector: string) => selector === "body" ? { innerText: async () => { checks++; return bodies.shift() ?? "Odds board"; } } : { count: async () => 0 } } as unknown as Page;
  await waitForChallengeClear(page, source.url, new AbortController().signal, 1);
  assert.equal(checks, 4);
});

test("CLI returns HTTP PAUSED without browser navigation or a terminal input wait", async () => {
  const root = await mkdtemp(join(tmpdir(), "engine-http-paused-cli-"));
  const server = createServer((_request, response) => { response.statusCode = 403; response.end("Security verification required"); });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address(); assert.ok(address && typeof address !== "string");
    const url = `http://127.0.0.1:${address.port}/odds`;
    const result = await promisify(execFile)(process.execPath, ["--import", "tsx", "src/engine/main.ts", url, "sportsbook", "--data-dir", root], { timeout: 10_000 })
      .catch(error => ({ stdout: String(error.stdout), stderr: String(error.stderr) }));
    assert.equal(JSON.parse(result.stdout).status, "PAUSED");
    assert.match(result.stderr, /HTTP 403 desde Node fetch/);
    assert.match(result.stderr, /--force-browser/);
    assert.doesNotMatch(result.stderr, /\[network\]|unsettled top-level await/);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await rm(root, { recursive: true, force: true });
  }
});
