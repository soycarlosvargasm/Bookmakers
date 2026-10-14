import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { BrowserContext } from "playwright";
import { AcquisitionOrchestrator } from "../src/engine/orchestrator.js";
import { EngineStorage } from "../src/engine/storage.js";
import { sourceKey } from "../src/engine/memory.js";
import type { AcquisitionMethod, Handler, HandlerResult, Source } from "../src/engine/types.js";

const source: Source = { url: "https://sports.example/odds", type: "sportsbook" };
const methods: AcquisitionMethod[] = ["http", "network", "dom", "accessibility", "visual"];
const successful: HandlerResult = { kind: "data", records: [{ eventName: "A vs B", market: "Winner", selection: "A", rawOdds: "1.8" }], evidence: { url: source.url, transport: "http", payload: { odds: 1.8 }, capturedAt: new Date().toISOString() }, configuration: { headers: { accept: "application/json", authorization: "secret" }, endpoints: [source.url], selectors: { event: "[data-event]" } } };
const miss: HandlerResult = { kind: "miss", reason: "No data" };
const fakeContext = (expires: number): BrowserContext => ({ storageState: async () => ({ cookies: [{ name: "sid", value: "private", domain: "sports.example", path: "/", expires, httpOnly: true, secure: true, sameSite: "Lax" }], origins: [] }) }) as unknown as BrowserContext;

test("preferred method runs first; failure falls back and success replaces the method", async () => {
  const root = await mkdtemp(join(tmpdir(), "engine-memory-"));
  try {
    const storage = new EngineStorage(root);
    await storage.memory.recordSuccess(source, "dom", { selectors: { event: "[data-event]" } });
    const calls: Array<{ method: AcquisitionMethod; eventSelector?: string }> = [];
    const handlers: Handler[] = methods.map((method) => ({ method, async run(context) {
      calls.push({ method, eventSelector: context.configuration?.selectors?.event });
      return method === "http" ? successful : miss;
    } }));
    const result = await new AcquisitionOrchestrator({ storage, handlers }).run(source);
    assert.equal(result.status, "SUCCEEDED");
    assert.deepEqual(calls.map((call) => call.method), ["dom", "http"]);
    assert.equal(calls[0]?.eventSelector, "[data-event]");
    const memory = await storage.readMemory(source);
    assert.equal(memory?.method, "http");
    assert.equal(memory?.lastAttemptStatus, "SUCCEEDED");
    assert.ok(memory?.lastSuccessAt);
    assert.equal(memory?.configuration?.headers?.authorization, undefined);
    assert.deepEqual(memory?.configuration?.endpoints, [source.url]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("failed attempts preserve the last successful method and timestamp", async () => {
  const root = await mkdtemp(join(tmpdir(), "engine-memory-"));
  try {
    const storage = new EngineStorage(root);
    const success = await storage.memory.recordSuccess(source, "network", { endpoints: [source.url] });
    await storage.memory.recordAttempt(source, "dom", "MISS", "No data");
    const memory = await storage.readMemory(source);
    assert.equal(memory?.method, "network");
    assert.equal(memory?.lastSuccessAt, success.lastSuccessAt);
    assert.equal(memory?.lastAttemptMethod, "dom");
    assert.equal(memory?.lastAttemptStatus, "MISS");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("session expiration and missing state are detected before reuse", async () => {
  const root = await mkdtemp(join(tmpdir(), "engine-memory-"));
  try {
    const storage = new EngineStorage(root);
    const first = await storage.memory.recordSuccess(source, "http", undefined, fakeContext(Date.now() / 1_000 + 3_600));
    assert.equal(first.session.status, "VALID");
    assert.ok(first.session.path);
    const memoryPath = join(root, "memory", `${sourceKey(source)}.json`);
    const persisted = JSON.parse(await readFile(memoryPath, "utf8")) as Record<string, unknown> & { session: { expiresAt: string } };
    persisted.session.expiresAt = new Date(Date.now() - 1_000).toISOString();
    await writeFile(memoryPath, JSON.stringify(persisted));
    assert.equal((await storage.readMemory(source))?.session.status, "EXPIRED");
    await storage.memory.recordSuccess(source, "http", undefined, fakeContext(Date.now() / 1_000 + 3_600));
    await unlink(first.session.path!);
    assert.equal((await storage.readMemory(source))?.session.status, "INVALID");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("challenge records human intervention and invalidates a reused session", async () => {
  const root = await mkdtemp(join(tmpdir(), "engine-memory-"));
  try {
    const storage = new EngineStorage(root);
    await storage.memory.recordSuccess(source, "http", undefined, fakeContext(Date.now() / 1_000 + 3_600));
    const memory = await storage.memory.recordChallenge(source, "http", "CAPTCHA", true);
    assert.equal(memory.requiresHumanIntervention, true);
    assert.equal(memory.lastAttemptStatus, "CHALLENGE");
    assert.equal(memory.session.status, "INVALID");
    assert.equal(memory.method, "http");
  } finally { await rm(root, { recursive: true, force: true }); }
});
