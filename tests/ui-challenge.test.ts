import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Page } from "playwright";
import { UiActions } from "../src/ui/actions.js";
import { createUiServer } from "../src/ui/server.js";
import { HttpHandler, NetworkHandler, VisualHandler } from "../src/engine/handlers.js";
import { waitForChallengeClear } from "../src/engine/challenge.js";
import type { AcquisitionContext, HandlerResult } from "../src/engine/types.js";

const source = { type: "qa-challenge", url: "https://sports.example/football" };
const settings = { intervalMinutes: 15, timeoutSeconds: 2, delaySeconds: 0 };
function pageWithBody(body: () => string, close: () => void = () => {}) {
  return { url: () => source.url, isClosed: () => false, frames: () => [],
    locator: (selector: string) => selector === "body" ? { innerText: async () => body() } : { count: async () => 0 }, close: async () => close() } as unknown as Page;
}
async function until<T>(read: () => T | undefined): Promise<T> {
  for (let i = 0; i < 600; i++) { const result = read(); if (result) return result; await new Promise(resolve => setTimeout(resolve, 10)); }
  throw new Error("Fixture did not reach expected state");
}
const data = (ctx: AcquisitionContext): HandlerResult => ({ kind: "data", records: [{ eventName: "QA Alpha vs Beta", market: "Winner", selection: "Alpha", decimalOdds: 1.85 }], evidence: { url: ctx.source.url, transport: "controlled-fixture", capturedAt: new Date().toISOString(), payload: {} } });

test('both Stop endpoints cancel an HTTP verification and all queued sources before any visual handler runs',async t=>{
  const calls:string[]=[];
  t.mock.method(HttpHandler.prototype,'run',async(ctx:AcquisitionContext):Promise<HandlerResult>=>{calls.push(ctx.source.type);return {kind:'challenge',reason:'HTTP verification fixture',url:ctx.source.url};});
  t.mock.method(NetworkHandler.prototype,'run',async()=>{throw Error('Stop must not resume into browser acquisition');});
  for(const endpoint of ['/api/stop','/api/ocr/stop']){
    const root=await mkdtemp(join(tmpdir(),'http-stop-')),server=await createUiServer({dataDir:root});
    try{
      const queue=server.actions.runCountry(['held','queued-a','queued-b'].map(type=>({type,url:`https://${type}.example/`})),false,settings);
      await until(()=>server.actions.challenges[0]);
      const visible=(await server.app.inject('/api/ocr/status')).json();
      assert.equal(visible.length,3,'status includes the paused HTTP source and its complete queue');
      assert.equal(visible.find((run:{state:string})=>run.state==='PAUSED').visualProgress,undefined);
      const stopped=await server.app.inject({method:'POST',url:endpoint,payload:{}});
      assert.equal(stopped.statusCode,202);assert.equal(stopped.json().stopped,3);
      await until(()=>queue.runIds.every(id=>Boolean(server.actions.runs.get(id)?.finishedAt))&&!server.actions.schedulerState.stopping||undefined);
      const status=(await server.app.inject('/api/status')).json();assert.equal(status.busy,false);assert.deepEqual(status.challenges,[]);
      for(const id of queue.runIds)assert.match(server.actions.runs.get(id)?.reason||'',/Detenido por el usuario/);
      assert.equal((await server.app.inject({method:'POST',url:endpoint,payload:{}})).json().stopped,0,'repeated Stop is safe');
    }finally{await server.close();await rm(root,{recursive:true,force:true});}
  }
  assert.deepEqual(calls,['held','held'],'queued sources never started');
});

test("visible challenge returning after a clear reading is reported without reloads or solving", async () => {
  const bodies = ["Verify you are human", "Sports board", "Verify you are human", "Sports board", "Sports board"];
  const progress: Array<{ blockedForMs: number; reappearances: number }> = [];
  await waitForChallengeClear(pageWithBody(() => bodies.shift()!), source.url, new AbortController().signal, 1, p => progress.push(p));
  assert.deepEqual(progress.map(p => p.reappearances), [0, 1]);
});

test("Chrome choice retains the exact source and switches only after closing the test context", async t => {
  const root = await mkdtemp(join(tmpdir(), "collector-chrome-handoff-"));
  let testClosed = false;
  const modes: string[] = [];
  t.mock.method(HttpHandler.prototype, "run", async () => { throw new Error("HTTP should be skipped"); });
  t.mock.method(NetworkHandler.prototype, "run", async (ctx: AcquisitionContext): Promise<HandlerResult> => {
    assert.deepEqual(ctx.source, source); modes.push(ctx.browserMode!);
    if (ctx.browserMode === "renzo") { assert.equal(testClosed, true); assert.equal(ctx.exhaustive, false); return data(ctx); }
    ctx.page = pageWithBody(() => "Verify you are human");
    ctx.closePage = async () => { testClosed = true; };
    return { kind: "challenge", reason: "Cloudflare fixture", url: source.url };
  });
  const actions = new UiActions(() => {}, () => {}, root);
  try {
    const run = actions.run(source, true, settings, undefined, true);
    const challenge = await until(() => actions.challenges[0]);
    assert.equal(challenge.url, source.url);
    actions.chooseChallenge(run.runId, challenge.id, "chrome");
    assert.throws(() => actions.chooseChallenge(run.runId, challenge.id, "chrome"), /ya cambió/);
    const finished = await until(() => run.finishedAt ? run : undefined);
    assert.equal(finished.state, "SUCCEEDED"); assert.equal(finished.records, 1);
    assert.equal(finished.browserMode, "renzo"); assert.deepEqual(modes, ["isolated", "renzo"]);
    assert.deepEqual(actions.challenges, []);
  } finally { await actions.close(); await rm(root, { recursive: true, force: true }); }
});

test("persistent block prompts after 30 seconds, Continue rearms the notice, and Cancel closes only this run", async t => {
  const root = await mkdtemp(join(tmpdir(), "collector-challenge-options-"));
  const now = Date.now; let offset = 0, closed = false;
  t.mock.method(Date, "now", () => now() + offset);
  t.mock.method(NetworkHandler.prototype, "run", async (ctx: AcquisitionContext): Promise<HandlerResult> => {
    ctx.page = pageWithBody(() => "Verify you are human"); ctx.closePage = async () => { closed = true; };
    return { kind: "challenge", reason: "Cloudflare fixture", url: source.url };
  });
  const server = await createUiServer({ dataDir: root });
  try {
    const run = server.actions.run(source, true, { ...settings, timeoutSeconds: 1 });
    const first = await until(() => server.actions.challenges[0]);
    assert.equal(first.prompt, false);
    // Human waiting must not consume the one-second acquisition budget.
    await new Promise(resolve => setTimeout(resolve, 1100)); assert.equal(run.finishedAt, undefined);
    offset = 31_000;
    const prompted = await until(() => server.actions.challenges.find(c => c.prompt));
    const status = (await server.app.inject({ url: "/api/status" })).json();
    assert.equal(status.challenges[0].id, prompted.id);
    assert.equal((await server.app.inject({ method: "POST", url: `/api/run/${run.runId}/challenge`, payload: { id: prompted.id, choice: "invalid" } })).statusCode, 400);
    assert.equal((await server.app.inject({ method: "POST", url: `/api/run/${run.runId}/challenge`, payload: { id: prompted.id, choice: "continue" } })).statusCode, 202);
    const continued = await until(() => server.actions.challenges.find(c => c.id !== first.id));
    assert.equal(continued.prompt, false);
    assert.equal((await server.app.inject({ method: "POST", url: `/api/run/${run.runId}/challenge`, payload: { id: first.id, choice: "cancel" } })).statusCode, 409);
    offset += 31_000;
    await until(() => server.actions.challenges.find(c => c.prompt));
    assert.equal((await server.app.inject({ method: "POST", url: `/api/run/${run.runId}/challenge`, payload: { id: continued.id, choice: "cancel" } })).statusCode, 202);
    await until(() => run.finishedAt); assert.equal(run.state, "FAILED"); assert.match(run.reason!, /cancelada/);
    assert.equal(closed, true); assert.deepEqual(server.actions.challenges, []);
  } finally { await server.close(); await rm(root, { recursive: true, force: true }); }
});

test("Continue on HTTP verification starts the browser cascade without silently choosing personal Chrome", async t => {
  const root = await mkdtemp(join(tmpdir(), "collector-http-choice-"));
  t.mock.method(HttpHandler.prototype, "run", async (): Promise<HandlerResult> => ({ kind: "challenge", reason: "HTTP verification", url: source.url }));
  t.mock.method(NetworkHandler.prototype, "run", async (ctx: AcquisitionContext): Promise<HandlerResult> => { assert.equal(ctx.browserMode, "isolated"); return data(ctx); });
  const actions = new UiActions(() => {}, () => {}, root);
  try {
    const run = actions.run(source, false, settings), challenge = await until(() => actions.challenges[0]);
    assert.equal(challenge.prompt, true); actions.chooseChallenge(run.runId, challenge.id, "continue");
    await until(() => run.finishedAt); assert.equal(run.state, "SUCCEEDED"); assert.equal(run.records, 1);
  } finally { await actions.close(); await rm(root, { recursive: true, force: true }); }
});

test("Cancel this source preserves and completes the remaining country queue", async t => {
  const root = await mkdtemp(join(tmpdir(), "collector-cancel-one-"));
  const next = { type: "qa-next", url: "https://sports.example/next" };
  t.mock.method(HttpHandler.prototype, "run", async (ctx: AcquisitionContext): Promise<HandlerResult> => ctx.source.type === source.type
    ? { kind: "challenge", reason: "HTTP verification", url: source.url } : data(ctx));
  const actions = new UiActions(() => {}, () => {}, root);
  try {
    const queue = actions.runCountry([source, next], false, settings);
    const challenge = await until(() => actions.challenges[0]);
    actions.chooseChallenge(challenge.runId, challenge.id, "cancel");
    await until(() => queue.runIds.every(id => actions.runs.get(id)?.finishedAt) ? true : undefined);
    assert.equal(actions.runs.get(queue.runIds[0]!)?.state, "FAILED");
    assert.equal(actions.runs.get(queue.runIds[1]!)?.state, "SUCCEEDED");
    assert.equal(actions.runs.get(queue.runIds[1]!)?.records, 1);
  } finally { await actions.close(); await rm(root, { recursive: true, force: true }); }
});

test("two manual attempts switch automatically even when Cloudflare text never disappears", async t => {
  const root = await mkdtemp(join(tmpdir(), "collector-auto-renzo-"));
  const now = Date.now; let offset = 0, attempt: (() => void) | undefined;
  t.mock.method(Date, "now", () => now() + offset);
  const modes: string[] = [];
  t.mock.method(NetworkHandler.prototype, "run", async (ctx: AcquisitionContext): Promise<HandlerResult> => {
    modes.push(ctx.browserMode!);
    if (ctx.browserMode === "renzo") return data(ctx);
    const page = pageWithBody(() => "Verify you are human");
    page.exposeBinding = async (_name, callback) => { attempt = () => { void callback({} as never); }; return { dispose: async () => {}, [Symbol.asyncDispose]: async () => {} }; };
    page.addInitScript = async () => ({ dispose: async () => {}, [Symbol.asyncDispose]: async () => {} });
    ctx.page = page;
    return { kind: "challenge", reason: "Cloudflare constant parent text", url: source.url };
  });
  const actions = new UiActions(() => {}, () => {}, root);
  try {
    const run = actions.run(source, true, settings);
    await until(() => attempt); attempt!();
    await new Promise(resolve => setTimeout(resolve, 1050));
    assert.deepEqual(modes, ["isolated"]);
    offset = 1000; attempt!();
    await new Promise(resolve => setTimeout(resolve, 1050));
    assert.deepEqual(modes, ["isolated"]); // Give the second verification time to finish.
    offset += 6000;
    await until(() => run.finishedAt);
    assert.equal(run.state, "SUCCEEDED"); assert.deepEqual(modes, ["isolated", "renzo"]);
  } finally { await actions.close(); await rm(root, { recursive: true, force: true }); }
});

test("Betfair handoff retains the crawl frontier and previously captured records while keeping exhaustive mode", async t => {
  const root = await mkdtemp(join(tmpdir(), "collector-betfair-frontier-"));
  const source = { type: "betfair", url: "https://sports.example/betting/football/ac-1" };
  let frontier: AcquisitionContext["betfairCrawl"];
  t.mock.method(NetworkHandler.prototype, "run", async (ctx: AcquisitionContext) => data(ctx));
  t.mock.method(VisualHandler.prototype, "run", async (ctx: AcquisitionContext): Promise<HandlerResult> => {
    assert.equal(ctx.exhaustive, true);
    if (ctx.browserMode === "renzo") {
      assert.equal(ctx.betfairCrawl, frontier);
      assert.equal(ctx.betfairCrawl?.ready, undefined);
      assert.equal(ctx.betfairCrawl?.pending.length, 1);
      assert.equal(ctx.visualCrawl?.records.length, 1);
      return data(ctx);
    }
    frontier = ctx.betfairCrawl = { pending: [{ url: source.url + "?view=next", path: [] }], queued: new Set(), seen: new Set(["already-read"]),
      competitions: new Set(["small-league"]), events: new Set(), marketViews: new Set(), failures: [], completed: false, ready: "old-browser" };
    ctx.visualCrawl = { visited: [source.url], pending: [], records: [{ eventName: "Already captured v Team", market: "Winner", selection: "Team", decimalOdds: 2 }], rawPaths: ["already-saved.json"], visits: [], tabsOpened: 1, ocrCaptures: 0 };
    ctx.page = pageWithBody(() => "Verify you are human");
    return { kind: "challenge", reason: "Fixture verification", url: source.url };
  });
  const actions = new UiActions(() => {}, () => {}, root);
  try {
    const run = actions.run(source, true, settings);
    const challenge = await until(() => actions.challenges[0]);
    actions.chooseChallenge(run.runId, challenge.id, "chrome");
    await until(() => run.finishedAt);
    assert.equal(run.state, "SUCCEEDED"); assert.equal(run.browserMode, "renzo"); assert.equal(run.exhaustive, true);
  } finally { await actions.close(); await rm(root, { recursive: true, force: true }); }
});
