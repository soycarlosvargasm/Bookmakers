import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createContext, runInContext } from "node:vm";
import { chromium } from "playwright";
import { RenzoChromePage, RenzoBrowserError, renzoProfileDirectory, renzoChromePid } from "../src/engine/renzo-browser.js";
import { ensurePage, HttpHandler, NetworkHandler, DomHandler, AccessibilityHandler, VisualHandler } from "../src/engine/handlers.js";
import { AcquisitionOrchestrator } from "../src/engine/orchestrator.js";
import { EngineStorage } from "../src/engine/storage.js";
import type { AcquisitionContext, AcquisitionMethod, Handler } from "../src/engine/types.js";
import { BET9JA_ENDPOINTS } from "../src/network/bet9ja.js";
import { TENCRIC_GRAPHQL_URL, TENCRIC_REQUEST } from "../src/network/tencric.js";

const localState = { profile: { info_cache: { Default: { name: "Test" }, "Profile 1": { name: "Renzo" } } } };
const processes = "11 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --user-data-dir=/tmp/test\n22 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome\n";

async function simulatedRenzo(fetch: typeof globalThis.fetch, signal?: AbortSignal) {
  let realm = createContext({ window: {}, location: { href: "about:blank" }, document: { readyState: "complete", body: {} }, fetch });
  const page = await RenzoChromePage.open({ localState, signal, command: async (command, args) => {
    if (command === "ps") return processes;
    if (args[1] === "locate") return "123:456";
    if (args[1] === "execute") return String(runInContext(args[4]!, realm));
    if (args[1] === "navigate") realm = createContext({ window: {}, location: { href: args[4] }, document: { readyState: "complete", body: {} }, fetch });
    return "";
  } });
  return { page, pending: () => runInContext("Object.keys(window).filter(key => key.startsWith('__collector_evaluation_'))", realm) as string[] };
}

test("Renzo evaluate awaits concurrent promises, propagates rejections and cleans up browser state", async () => {
  const { page, pending } = await simulatedRenzo(async () => new Response("{}"));
  try {
    assert.deepEqual(await Promise.all([
      page.evaluate(async value => ({ value: await Promise.resolve(value) }), 42),
      page.evaluate(async () => "second"),
    ]), [{ value: 42 }, "second"]);
    await assert.rejects(page.evaluate(async () => { throw new Error("fetch failed"); }), /fetch failed/);
    assert.equal(await page.evaluate(async () => undefined), null);
    assert.equal(await page.evaluate(() => 7), 7);
    assert.equal(pending().length, 0);
  } finally { await page.close(); }
});

test("Renzo async evaluate responds to run cancellation", async () => {
  const controller = new AbortController();
  const { page } = await simulatedRenzo(async () => new Response("{}"), controller.signal);
  try {
    const evaluation = page.evaluate(() => new Promise(() => {}));
    controller.abort(new Error("Run cancelled"));
    await assert.rejects(evaluation, /Run cancelled/);
  } finally { await page.close(); }
});

test("Group A uses its provider adapters inside Renzo without Node fetch or test Chromium", async t => {
  const requests: Array<{ url: string; options?: RequestInit }> = [];
  const { page } = await simulatedRenzo(async (input, options) => {
    const url = String(input);
    requests.push({ url, options });
    const response = new Response(url === TENCRIC_GRAPHQL_URL ? JSON.stringify({ data: { listContentCards: { contentCards: [{ card: {
      selections: [{ id: "selection-1", eventId: "event-1", marketId: "market-1", eventName: "A vs B", marketName: "Winner", name: "A", odds: 2 }],
    } }] } } }) : "{}", { status: 200, headers: { "content-type": "application/json" } });
    Object.defineProperty(response, "url", { value: url });
    return response;
  });
  t.mock.method(page, "waitForTimeout", async () => {});
  t.mock.method(globalThis, "fetch", async () => { assert.fail("must fetch inside Renzo"); });
  t.mock.method(chromium, "launch", async () => { assert.fail("must not launch test Chromium"); });
  t.mock.method(chromium, "launchPersistentContext", async () => { assert.fail("must not launch an isolated Chrome profile"); });
  t.mock.method(RenzoChromePage, "open", async () => page);
  t.mock.method(page, "readSportsFeeds", async () => { assert.fail("Group A must use its provider adapters"); });
  try {
    for (const [type, url] of [["retabet-pe", "https://www.retabet.pe/"], ["bet9ja", "https://sports.bet9ja.com/"], ["10cric", "https://www.10cric2026.com/"]]) {
      const context: AcquisitionContext = { source: { type: type!, url: url! }, memory: null, configuration: null, timeoutMs: 1000, observeMs: 0, browserMode: "renzo" };
      const result = await new NetworkHandler().run(context);
      assert.equal(context.page, page.asPage());
      assert.ok(context.networkCaptures?.length);
      if (type === "10cric") {
        assert.equal(result.kind, "data");
        if (result.kind === "data") assert.equal(result.records.length, 1);
      }
    }
    assert.deepEqual(requests.map(request => request.url), ["https://www.retabet.pe/", ...Object.values(BET9JA_ENDPOINTS), TENCRIC_GRAPHQL_URL]);
    const graphql = requests.at(-1)!;
    assert.equal(graphql.options?.method, "POST");
    assert.deepEqual(JSON.parse(String(graphql.options?.body)), TENCRIC_REQUEST);
  } finally { await page.close(); }
});

test("Renzo connection selects the exact existing profile, retains its session and closes only its own tab", async () => {
  const calls: Array<{ command: string; args: string[] }> = [];
  const page = await RenzoChromePage.open({ localState, command: async (command, args) => {
    calls.push({ command, args });
    if (command === "ps") return processes;
    if (args[1] === "locate") return "123:456";
    if (args[1] === "execute") return JSON.stringify({ url: "about:blank", value: 1 });
    return "";
  } });
  assert.deepEqual(calls.find(call => call.command === "open")?.args.slice(0, 6), ["-n", "-a", "/Applications/Google Chrome.app", "--args", "--profile-directory=Profile 1", "--new-window"]);
  assert.ok(calls.find(call => call.command === "open")?.args[6]?.startsWith("http://127.0.0.1:3000/api/renzo-browser-check?collector="));
  assert.doesNotMatch(JSON.stringify(calls), /user-data-dir|remote-debugging|storageState|Cookies|Chromium/);
  await Promise.all([page.close(), page.close()]);
  const closures = calls.filter(call => call.args[1] === "close");
  assert.equal(closures.length, 1);
  assert.deepEqual(closures[0]!.args, ["22", "close", "123", "456"]);
  assert.equal(renzoChromePid(processes), 22);
  assert.throws(() => renzoChromePid("11 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --user-data-dir=/tmp/test"), RenzoBrowserError);
});

test("missing or ambiguous Renzo profile refuses to launch any replacement", async () => {
  assert.throws(() => renzoProfileDirectory({ profile: { info_cache: { Default: { name: "Test" } } } }), RenzoBrowserError);
  assert.throws(() => renzoProfileDirectory({ profile: { info_cache: { Default: { name: "Renzo" }, "Profile 1": { name: "Renzo" } } } }), RenzoBrowserError);
  let launched = false;
  await assert.rejects(RenzoChromePage.open({ localState: {}, command: async () => { launched = true; return ""; } }), /perfil Chrome Renzo/);
  assert.equal(launched, false);
});

test("a failed Renzo attachment never falls back to Chromium or retries a new profile", async t => {
  let attachments = 0;
  t.mock.method(RenzoChromePage, "open", async () => { attachments++; throw new RenzoBrowserError("Renzo unavailable"); });
  t.mock.method(chromium, "launch", async () => { assert.fail("must not launch test Chromium"); });
  t.mock.method(chromium, "launchPersistentContext", async () => { assert.fail("must not launch an isolated Chrome profile"); });
  const context: AcquisitionContext = { source: { type: "stake", url: "https://sports.example/" }, memory: null, configuration: null, timeoutMs: 1000, observeMs: 0, browserMode: "renzo" };
  await assert.rejects(ensurePage(context), /Renzo unavailable/);
  await assert.rejects(ensurePage(context), /Renzo unavailable/);
  assert.equal(attachments, 1);
});

test("Renzo permission errors close the collector tab and explain the required Chrome setting", async () => {
  let closed = false;
  await assert.rejects(RenzoChromePage.open({ localState, command: async (command, args) => {
    if (command === "ps") return processes;
    if (args[1] === "locate") return "123:456";
    if (args[1] === "execute") throw new Error("Executing JavaScript through Apple Events is turned off");
    if (args[1] === "close") closed = true;
    return "";
  } }), /Allow JavaScript from Apple Events/);
  assert.equal(closed, true);
});

test("Renzo runs skip remembered HTTP, reuse the attached page and release only the owned page", async t => {
  const root = await mkdtemp(join(tmpdir(), "renzo-orchestrator-"));
  let released = 0;
  const page = { isClosed: () => false } as unknown as import("playwright").Page;
  t.mock.method(RenzoChromePage, "open", async () => ({ asPage: () => page, close: async () => { released++; } }) as RenzoChromePage);
  t.mock.method(chromium, "launch", async () => { assert.fail("must not launch Chromium"); });
  const methods: AcquisitionMethod[] = ["http", "network", "dom", "accessibility", "visual"];
  const calls: string[] = [];
  const handlers: Handler[] = methods.map(method => ({ method, async run(context) {
    calls.push(method);
    assert.equal(context.browserMode, "renzo");
    assert.equal(context.sessionState, undefined);
    assert.equal(await ensurePage(context), page);
    assert.equal(await ensurePage(context), page);
    if (method !== "dom") return { kind: "miss", reason: "fixture" };
    return { kind: "data", records: [{ eventName: "A vs B", market: "Winner", selection: "A", rawOdds: "2.0" }],
      evidence: { url: context.source.url, transport: "dom", payload: {}, capturedAt: new Date().toISOString() } };
  } }));
  try {
    const storage = new EngineStorage(root);
    const source = { type: "fixture", url: "https://sports.example/" };
    await storage.memory.recordSuccess(source, "http");
    const outcome = await new AcquisitionOrchestrator({ storage, handlers, browserMode: "renzo", consoleNotifier: false }).run(source);
    assert.equal(outcome.status, "SUCCEEDED");
    assert.deepEqual(calls, ["network", "dom"]);
    assert.equal(released, 1);
    assert.equal((await storage.readMemory(source))?.session.status, "NONE");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("default handlers fail immediately and visibly if Renzo is unavailable", async t => {
  const root = await mkdtemp(join(tmpdir(), "renzo-unavailable-"));
  t.mock.method(RenzoChromePage, "open", async () => { throw new RenzoBrowserError("Abre Chrome Renzo."); });
  t.mock.method(HttpHandler.prototype, "run", async () => { assert.fail("HTTP must be skipped"); });
  for (const handler of [DomHandler, AccessibilityHandler, VisualHandler]) t.mock.method(handler.prototype, "run", async () => { assert.fail("cannot continue without Renzo"); });
  try {
    const result = await new AcquisitionOrchestrator({ storage: new EngineStorage(root), browserMode: "renzo", consoleNotifier: false }).run({ type: "fixture", url: "https://sports.example/" });
    assert.equal(result.status, "FAILED");
    if (result.status === "FAILED") assert.equal(result.reason, "Abre Chrome Renzo.");
  } finally { await rm(root, { recursive: true, force: true }); }
});
