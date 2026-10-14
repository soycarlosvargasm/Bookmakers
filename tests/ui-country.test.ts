import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { UiActions, defaultSettings } from "../src/ui/actions.js";
import { createUiServer } from "../src/ui/server.js";
import { findCountry, groupCountries } from "../src/ui/countries.js";
import { loadBrands } from "../src/ui/brands.js";
import { HttpHandler, NetworkHandler, DomHandler, AccessibilityHandler, VisualHandler } from "../src/engine/handlers.js";
import type { AcquisitionContext, HandlerResult, Source } from "../src/engine/types.js";
import { getState } from "../src/ui/state.js";

const settings = { ...defaultSettings, delaySeconds: 0 };

test("Detener cancels a running country immediately, clears its queue and permits another run", async t => {
  const dataDir = await mkdtemp(join(tmpdir(), "ui-country-stop-"));
  const actions = new UiActions(() => {}, () => {}, dataDir);
  const calls: string[] = [];
  let entered!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  t.mock.method(NetworkHandler.prototype, "run", async (context: AcquisitionContext): Promise<HandlerResult> => {
    calls.push(context.source.type);
    if (context.source.type === "held") { entered(); await held; }
    return { kind: "miss", reason: "No data fixture" };
  });
  for (const handler of [HttpHandler, DomHandler, AccessibilityHandler, VisualHandler]) {
    t.mock.method(handler.prototype, "run", async (): Promise<HandlerResult> => ({ kind: "miss", reason: "fixture" }));
  }
  try {
    const result = actions.runCountry(["held", "queued-a", "queued-b"].map(type => ({ type, url: `https://${type}.example/` })), false, settings);
    await started;
    assert.deepEqual(await actions.stopRuns(), { stopped: 3 });
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => { clearInterval(timer); reject(new Error("Stopped country did not finish promptly")); }, 1000);
      const timer = setInterval(() => { if (result.runIds.every(id => actions.runs.get(id)?.finishedAt) && !actions.schedulerState.stopping) { clearInterval(timer); clearTimeout(timeout); resolve(); } }, 5);
    });
    assert.deepEqual(calls, ["held"]);
    for (const id of result.runIds) { assert.equal(actions.runs.get(id)?.state, "FAILED"); assert.match(actions.runs.get(id)?.reason ?? "", /Detenido por el usuario/); }
    assert.equal(actions.run({ type: "next", url: "https://next.example/" }, false, settings).state, "RUNNING");
  } finally { release(); await actions.close(); await rm(dataDir, { recursive: true, force: true }); }
});

test("country runs wait for each brand, continue after a failure and retain overlapping RAW and memory", async t => {
  const dataDir = await mkdtemp(join(tmpdir(), "ui-country-"));
  const actions = new UiActions(() => {}, () => {}, dataDir);
  const calls: string[] = [];
  let entered!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  let release!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; });
  t.mock.method(HttpHandler.prototype, "run", async (): Promise<HandlerResult> => ({ kind: "miss", reason: "No HTTP fixture" }));
  t.mock.method(NetworkHandler.prototype, "run", async (context: AcquisitionContext): Promise<HandlerResult> => {
    assert.equal(context.browserMode, "isolated");
    calls.push(context.source.type);
    if (context.source.type === "brand-a") { entered(); await hold; }
    if (context.source.type === "broken") return { kind: "miss", reason: "Source failed" };
    return { kind: "data", records: [{ eventName: "Arsenal vs Chelsea", market: "Moneyline", selection: "Arsenal", rawOdds: "1.8", decimalOdds: 1.8 }],
      evidence: { url: context.source.url, transport: "chromium-fetch", capturedAt: new Date().toISOString(), payload: { event: "Arsenal vs Chelsea", odds: 1.8 } } };
  });
  for (const handler of [DomHandler, AccessibilityHandler, VisualHandler]) {
    t.mock.method(handler.prototype, "run", async (): Promise<HandlerResult> => ({ kind: "miss", reason: "Source failed" }));
  }
  try {
    const sources = ["brand-a", "broken", "brand-b"].map(type => ({ type, url: `https://${type}.example/` }));
    const result = actions.runCountry(sources, false, settings);
    assert.equal(result.started, 3);
    assert.equal(new Set(result.runIds).size, 3);
    await started;
    assert.deepEqual(calls, ["brand-a"]);
    assert.equal(actions.runs.get(result.runIds[1]!)?.state, "QUEUED");
    assert.throws(() => actions.run(sources[2]!, false, settings), /Another source/);
    assert.throws(() => actions.runCountry(sources, false, settings), /current run/);
    await assert.rejects(actions.startScheduler(settings), /manual run/);
    release();
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => { clearInterval(timer); reject(new Error("Country did not finish")); }, 5000);
      const timer = setInterval(() => { if (result.runIds.every(id => actions.runs.get(id)?.finishedAt)) { clearInterval(timer); clearTimeout(timeout); resolve(); } }, 10);
    });
    assert.deepEqual(calls, ["brand-a", "broken", "brand-b"]);
    assert.deepEqual(result.runIds.map(id => actions.runs.get(id)?.state), ["SUCCEEDED", "FAILED", "SUCCEEDED"]);
    const files = await readdir(join(dataDir, "raw"));
    const rawFiles = files.filter(file => file.endsWith("-network.json"));
    assert.equal(rawFiles.length, 2);
    const captures = await Promise.all(rawFiles.map(async file => JSON.parse(await readFile(join(dataDir, "raw", file), "utf8"))));
    assert.deepEqual(captures.map(raw => raw.recordCount), [1, 1]);
    assert.deepEqual(new Set(captures.map(raw => raw.source.type)), new Set(["brand-a", "brand-b"]));
    assert.equal((await readdir(join(dataDir, "memory"))).filter(file => file.endsWith(".json")).length, 3);
    assert.equal((await readdir(join(dataDir, "ui", "runs"))).length, 3);
  } finally { release(); await actions.close(); await rm(dataDir, { recursive: true, force: true }); }
});

test("country endpoint validates requests, queues every configured region and preserves individual run route", async t => {
  const dataDir = await mkdtemp(join(tmpdir(), "ui-country-api-"));
  const server = await createUiServer({ dataDir });
  const calls: Array<{ sources: unknown; force: boolean }> = [];
  t.mock.method(server.actions, "runCountry", (sources: Source[], force: boolean) => { calls.push({ sources, force }); return { started: sources.length, runIds: sources.map((_: unknown, i: number) => `run-${i}`) }; });
  t.mock.method(server.actions, "run", () => ({ runId: "individual" }));
  try {
    const catalog = await loadBrands();
    const expected = groupCountries(catalog).find(country => country.code === "mx")!.brands.map(brand => ({ type: brand.id, url: brand.region.url }));
    const response = await server.app.inject({ method: "POST", url: "/api/run-country", payload: { country: "México", forceBrowser: true } });
    assert.equal(response.statusCode, 202);
    assert.equal(response.json().started, expected.length);
    assert.deepEqual(calls, [{ sources: expected, force: true }]);
    const uk = groupCountries(catalog).find(country => country.code === "uk")!;
    assert.deepEqual(uk.brands.map(brand => brand.id), ["betfair", "paddypower", "skybet", "williamhill", "ladbrokes", "coral", "betfred", "betvictor"]);
    assert.ok(uk.brands.every(brand => brand.region.vpn === "uk" && !brand.region.verified));
    const ukResponse = await server.app.inject({ method: "POST", url: "/api/run-country", payload: { country: "Reino Unido", forceBrowser: true } });
    assert.equal(ukResponse.statusCode, 202);
    assert.equal(ukResponse.json().started, 8);
    assert.equal(ukResponse.json().runIds.length, 8);
    assert.deepEqual(calls[1], { sources: uk.brands.map(brand => ({ type: brand.id, url: brand.region.url })), force: true });
    const india = groupCountries(catalog).find(country => country.code === "in")!;
    assert.deepEqual(india.brands.map(brand => brand.id), ["10cric", "1xbet-in", "dafabet", "fun88", "4rabet"]);
    assert.ok(india.brands.every(brand => brand.region.vpn === "in"));
    assert.ok(india.brands.filter(brand => brand.id !== "10cric").every(brand => !brand.region.verified));
    const indiaResponse = await server.app.inject({ method: "POST", url: "/api/run-country", payload: { country: "India", forceBrowser: false } });
    assert.equal(indiaResponse.statusCode, 202);
    assert.equal(indiaResponse.json().started, 5);
    assert.equal(indiaResponse.json().runIds.length, 5);
    assert.deepEqual(calls[2], { sources: india.brands.map(brand => ({ type: brand.id, url: brand.region.url })), force: false });
    assert.equal((await server.app.inject({ method: "POST", url: "/api/run-country", payload: { country: "unknown" } })).statusCode, 400);
    assert.equal((await server.app.inject({ method: "POST", url: "/api/run-country", payload: { country: "mx", forceBrowser: "true" } })).statusCode, 400);
    const countries = (await server.app.inject({ url: "/api/countries" })).json();
    assert.deepEqual(countries.map((country: { code: string }) => country.code), ["mx", "co", "pe", "br", "ke", "ng", "in", "uk", "global"]);
    const stop = t.mock.method(server.actions, "stopRuns", async () => ({ stopped: 5 }));
    const stopResponse = await server.app.inject({ method: "POST", url: "/api/stop" });
    assert.equal(stopResponse.statusCode, 202);
    assert.deepEqual(stopResponse.json(), { stopped: 5 });
    assert.equal(stop.mock.callCount(), 1);
    const brand = catalog[0]!;
    assert.equal((await server.app.inject({ method: "POST", url: "/api/run", payload: { type: brand.id, url: brand.regions[0]!.url } })).statusCode, 202);
    t.mock.method(server.actions, "runCountry", () => { throw new Error("Country busy"); });
    assert.equal((await server.app.inject({ method: "POST", url: "/api/run-country", payload: { country: "mx" } })).statusCode, 409);
  } finally { await server.close(); await rm(dataDir, { recursive: true, force: true }); }
});

test("country grouping follows catalog region codes and retains unverified sources", async () => {
  assert.equal(findCountry("MX")?.name, "México");
  assert.equal(findCountry("GL")?.code, "global");
  assert.equal(findCountry("UK")?.name, "Reino Unido");
  const regions = [{ code: "mx", name: "Mexico", url: "https://brand.example/", vpn: "mx", verified: false }];
  const groups = groupCountries([{ id: "brand", name: "Brand", sport: "multi", regions }]);
  assert.equal(groups[0]!.brands.length, 1);
  assert.equal(groups[0]!.brands[0]!.region.verified, false);
  const state = await getState("/tmp/no-country-data", undefined, [{ runId: "queued", source: { type: "betsson", url: "https://www.betsson.mx/apuestas-deportivas" }, state: "QUEUED", origin: "manual", startedAt: new Date().toISOString() }]);
  assert.equal(state.status.busy, true);
  assert.equal(state.brands.find(brand => brand.id === "betsson")?.regions.find(region => region.code === "mx")?.status, "queued");
});

test("Force browser applies to every brand and skips HTTP for the entire country", async t => {
  const dataDir = await mkdtemp(join(tmpdir(), "ui-country-browser-"));
  const actions = new UiActions(() => {}, () => {}, dataDir);
  let httpCalls = 0;
  const networkCalls: string[] = [];
  t.mock.method(HttpHandler.prototype, "run", async () => { httpCalls++; throw new Error("HTTP must be skipped"); });
  t.mock.method(NetworkHandler.prototype, "run", async (context: AcquisitionContext): Promise<HandlerResult> => {
    networkCalls.push(context.source.type);
    return { kind: "data", records: [{ eventName: "A vs B", market: "Moneyline", selection: "A", rawOdds: "2", decimalOdds: 2 }],
      evidence: { url: context.source.url, transport: "network", capturedAt: new Date().toISOString(), payload: { odds: 2 } } };
  });
  try {
    const result = actions.runCountry(["one", "two"].map(type => ({ type, url: `https://${type}.example/` })), true, settings);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => { clearInterval(timer); reject(new Error("Force browser country did not finish")); }, 5000);
      const timer = setInterval(() => { if (result.runIds.every(id => actions.runs.get(id)?.finishedAt)) { clearInterval(timer); clearTimeout(timeout); resolve(); } }, 10);
    });
    assert.equal(httpCalls, 0);
    assert.deepEqual(networkCalls, ["one", "two"]);
    assert.deepEqual(result.runIds.map(id => actions.runs.get(id)?.method), ["network", "network"]);
    assert.equal((await readdir(join(dataDir, "raw"))).filter(file => file.endsWith("-network.json")).length, 2);
  } finally { await actions.close(); await rm(dataDir, { recursive: true, force: true }); }
});
