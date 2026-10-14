import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { chromium, type Page } from "playwright";
import { crawlBetfair, discoverBetfairView, betfairNavigationUrl } from "../src/engine/betfair-crawler.js";
import { betfairRecords, captureBetfairDom, extractBetfairFeed } from "../src/profiles/betfair.js";
import { AcquisitionOrchestrator } from "../src/engine/orchestrator.js";
import type { AcquisitionContext, Handler, HandlerResult, VisualProgress } from "../src/engine/types.js";
import { RenzoChromePage } from "../src/engine/renzo-browser.js";

const base = "https://www.betfair.com/betting/football/ac-1";
const priceCard = (id: string, market = "Match Odds", price = "2.15") => `<article data-event-id="${id}" data-event-name="Alpha v Beta" data-competition-name="Regional Division">
  <section data-market-id="${id}-${market}" data-market-name="${market}">
    <button data-selection-id="${id}-1" data-selection-name="Alpha"><span class="odds">${price}</span></button>
    <button data-selection-id="${id}-2" data-selection-name="Beta"><span class="odds">3.25</span></button>
  </section></article>`;
function context(page: Page): AcquisitionContext {
  // Exercise the capabilities available in Renzo: evaluate/goto/DOM only.
  return { source: { type: "betfair", url: base }, page, browserMode: "renzo", memory: null, configuration: null, timeoutMs: 3000, observeMs: 1, exhaustive: true };
}

test("all 245 observed competitions are discovered, including regional and reserve leagues", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route("https://www.betfair.com/**", route => route.fulfill({ contentType: "text/html", body: "<body></body>" }));
    await page.goto(base);
    await page.setContent(await readFile(new URL("./fixtures/betfair-competition-links.html", import.meta.url), "utf8"));
    const view = await discoverBetfairView(page);
    assert.equal(view.links.length, 245);
    for (const label of ["Bangalore Super Division League", "Botswana Premier League", "English Isthmian Premier League", "Argentinian Primera B Metro Reserves"]) {
      assert.ok(view.links.some(link => link.label === label), label);
    }
    assert.equal(betfairNavigationUrl("/betting/football/unknown-small-league/c-999", base), "https://www.betfair.com/betting/football/unknown-small-league/c-999");
    for (const url of ["https://evil.test/betting/football/c-1", "/exchange/football", "/betting/mybets", "/betting/football/c-1?token=private"]) assert.equal(betfairNavigationUrl(url, base), null);
  } finally { await browser.close(); }
});

test("recursive leagues, event links, sibling and nested market tabs, and load-more work with Renzo capabilities", { timeout: 30_000 }, async t => {
  const browser = await chromium.launch({ headless: true });
  const requested = new Set<string>();
  try {
    const page = await browser.newPage();
    t.mock.method(page, "waitForTimeout", async () => {});
    await page.route("https://www.betfair.com/**", route => {
      const path = new URL(route.request().url()).pathname; requested.add(path);
      const body = path.endsWith("ac-1") ? `<h1>All Competitions</h1><a href="/betting/football/tiny/c-99">Tiny Regional League</a>`
        : path.endsWith("c-99") ? `<h1>Tiny Regional League</h1><a href="/betting/football/alpha-beta/e-100">Alpha v Beta</a><button id="more" onclick="this.disabled=true;const a=document.createElement('a');a.href='/betting/football/gamma-delta/e-101';a.textContent='Gamma v Delta';this.after(a)">Load more</button>`
        : path.endsWith("e-101") ? priceCard("101", "Correct Score", "5/2")
        : `<h1>Alpha v Beta</h1><div role="tablist"><button role="tab" onclick="show('Match Odds')">Match Odds</button><button role="tab" onclick="show('Goals')">Goals</button><button role="tab" onclick="show('Player Shots')">Player Shots</button></div><main>${priceCard("100")}</main><div id="nested"></div><script>
          function show(market){document.querySelector('main section').setAttribute('data-market-name',market);document.querySelector('main section').setAttribute('data-market-id','100-'+market);const nested=document.querySelector('#nested');nested.replaceChildren();if(market==='Goals'){const box=document.createElement('div');box.setAttribute('role','tablist');const tab=document.createElement('button');tab.setAttribute('role','tab');tab.textContent='First Half Goals';tab.onclick=()=>show('First Half Goals');box.append(tab);nested.append(box);}}
        </script>`;
      return route.fulfill({ contentType: "text/html", body: `${body}<button data-selection-id="never" onclick="throw Error('wager')">Place bet</button><a href="/betting/mybets">My Bets</a><a href="/casino">Casino</a>` });
    });
    await page.goto(base);
    const ctx = context(page), reports: VisualProgress[] = [];
    ctx.visualProgress = value => reports.push(value);
    const saved: string[] = [];
    ctx.savePageCapture = async (_method, result) => { saved.push(result.evidence.url); return { records: result.records, rawPath: `fixture-${saved.length}.json` }; };
    const result = await crawlBetfair(page, ctx);
    assert.equal(result.kind, "data");
    if (result.kind !== "data") return;
    assert.deepEqual(new Set(result.records.map(row => row.market)), new Set(["Match Odds", "Goals", "Player Shots", "First Half Goals", "Correct Score"]), JSON.stringify(result.evidence.payload));
    assert.equal(result.records.find(row => row.market === "Correct Score" && row.selection === "Alpha")?.decimalOdds, 3.5);
    assert.ok(requested.has("/betting/football/gamma-delta/e-101"));
    assert.ok(!requested.has("/betting/mybets") && !requested.has("/casino"));
    assert.equal(reports.at(-1)?.complete, true, JSON.stringify(ctx.betfairCrawl?.failures));
    assert.equal(reports.at(-1)?.pending, 0);
    assert.equal(reports.at(-1)?.competitionsDiscovered, 1);
    assert.equal(reports.at(-1)?.eventsDiscovered, 2);
    assert.equal(result.validatedPages?.length, saved.length);
    assert.equal((await page.context().pages()).length, 1);
  } finally { await browser.close(); }
});

test("ten sibling market tabs require one traversal each rather than all permutations", { timeout: 15_000 }, async t => {
  const browser = await chromium.launch({ headless: true });
  let loads = 0;
  try {
    const page = await browser.newPage(); t.mock.method(page, "waitForTimeout", async () => {});
    await page.route("https://www.betfair.com/**", route => {
      loads++;
      return route.fulfill({ contentType: "text/html", body: `<div role="tablist">${Array.from({ length: 10 }, (_, i) => `<button role="tab" onclick="const m=document.querySelector('section');m.setAttribute('data-market-name','Market ${i}');m.setAttribute('data-market-id','m-${i}')">Market ${i}</button>`).join("")}</div>${priceCard("100")}` });
    });
    await page.goto(base);
    const result = await crawlBetfair(page, context(page));
    assert.equal(result.kind, "data");
    if (result.kind === "data") assert.equal(new Set(result.records.map(row => row.market)).size, 11);
    assert.ok(loads <= 12, `Unexpected repeated market navigation: ${loads} loads`);
  } finally { await browser.close(); }
});

test("challenge pause retains the pending frontier and resumes without losing captured prices", { timeout: 15_000 }, async t => {
  const browser = await chromium.launch({ headless: true });
  let blocked = true;
  try {
    const page = await browser.newPage();
    t.mock.method(page, "waitForTimeout", async () => {});
    await page.route("https://www.betfair.com/**", route => route.fulfill({ contentType: "text/html", body:
      route.request().url() === base ? `${priceCard("first")}<a href="/betting/football/other/e-2">Other v Team</a>`
        : blocked ? "<h1>Verify you are human</h1>" : priceCard("second", "Total Goals") }));
    await page.goto(base);
    const ctx = context(page);
    const paused = await crawlBetfair(page, ctx);
    assert.equal(paused.kind, "challenge");
    assert.equal(ctx.visualCrawl?.records.length, 2);
    assert.ok(ctx.betfairCrawl?.active);
    blocked = false;
    // A browser handoff invalidates the old tab's navigation state only.
    ctx.betfairCrawl!.ready = undefined;
    const resumed = await crawlBetfair(page, ctx);
    assert.equal(resumed.kind, "data");
    if (resumed.kind === "data") assert.equal(resumed.records.length, 4);
  } finally { await browser.close(); }
});

test("visible unparsed prices report partial coverage and traversal responds to Stop", async t => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    t.mock.method(page, "waitForTimeout", async () => {});
    await page.route("https://www.betfair.com/**", route => route.fulfill({ contentType: "text/html", body: `<span class="odds">2.10</span>` }));
    await page.goto(base);
    const ctx = context(page), progress: VisualProgress[] = [];
    ctx.visualProgress = value => progress.push(value);
    assert.equal((await crawlBetfair(page, ctx)).kind, "miss");
    assert.equal(progress.at(-1)?.complete, false);
    assert.equal(progress.at(-1)?.failedViews, 1);
    const stopped = context(page); stopped.signal = AbortSignal.abort(new Error("Stopped"));
    await assert.rejects(crawlBetfair(page, stopped), /Stopped/);
  } finally { await browser.close(); }
});

test("some valid quotes do not hide remaining unread prices or read betslip data", async t => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); t.mock.method(page, "waitForTimeout", async () => {});
    await page.route("https://www.betfair.com/**", route => route.fulfill({ contentType: "text/html", body:
      `${priceCard("100")}<span class="odds">4.10</span><aside data-betslip>${priceCard("private")}</aside>` }));
    await page.goto(base);
    const snapshot = await captureBetfairDom(page);
    assert.equal(snapshot.visiblePrices, 3);
    assert.deepEqual(snapshot.events.map(event => event.id), ["100"]);
    const ctx = context(page), result = await crawlBetfair(page, ctx);
    assert.equal(result.kind, "data");
    if (result.kind === "data") assert.equal(result.records.length, 2);
    assert.equal(ctx.betfairCrawl?.failures.length, 1);
  } finally { await browser.close(); }
});

test("Sportsbook feeds join competition, event, market and runner IDs, preserve market lines and reject Exchange ladders", () => {
  const rows = extractBetfairFeed({ attachments: { competitions: { "7": { competitionId: 7, name: "Minor League" } },
    events: { "42": { eventId: 42, name: "Alpha v Beta", competitionId: 7 } }, markets: { "m": { eventId: 42, marketId: "m", marketName: "Asian Handicap", runners: [
      { selectionId: 1, runnerName: "Alpha", handicap: -1.5, winRunnerOdds: { trueOdds: { decimalOdds: { decimalOdds: 1.91 } } } },
      { selectionId: 2, runnerName: "Beta", ex: { availableToBack: [{ price: 2.2 }] } },
    ] } } } }, base);
  assert.equal(rows.length, 1); assert.equal(rows[0]?.competition, "Minor League");
  assert.equal(rows[0]?.sourceMarketId, "m"); assert.equal(rows[0]?.line, "-1.5"); assert.equal(rows[0]?.decimalOdds, 1.91);
  assert.equal(betfairRecords([{ label: "Alpha v Beta", markets: [{ label: "Winner", selections: [{ label: "Alpha", odds: "NaN" }] }] }], base).length, 0);
});

test("Betfair always traverses after the first structured quote, including in Renzo", async () => {
  const called: string[] = [];
  const handlers: Handler[] = ["http", "network", "dom", "accessibility", "visual"].map(method => ({ method: method as Handler["method"], async run(ctx): Promise<HandlerResult> {
    called.push(method); assert.equal(ctx.exhaustive, true);
    if (method === "visual") assert.equal(ctx.visualSeed?.records.length, 1);
    return { kind: "data", records: [{ eventName: "Alpha vs Beta", market: method === "visual" ? "All markets" : "Winner", selection: "Alpha", decimalOdds: 2 }], evidence: { url: base, transport: "fixture", capturedAt: new Date().toISOString(), payload: {} } };
  } }));
  const result = await new AcquisitionOrchestrator({ handlers, persist: false, browserMode: "renzo", consoleNotifier: false }).run({ type: "betfair", url: base });
  assert.equal(result.status, "SUCCEEDED"); assert.deepEqual(called, ["network", "visual"]);
});

test("the actual Renzo page adapter traverses and extracts using serialized DOM programs without CDP or screenshots", { timeout: 15_000 }, async t => {
  const browser = await chromium.launch({ headless: true });
  try {
    const chromeTab = await browser.newPage();
    await chromeTab.route("https://www.betfair.com/**", route => route.fulfill({ contentType: "text/html", body:
      route.request().url().endsWith("ac-1") ? `<h1>All Competitions</h1><a href="/betting/football/tiny/c-99">Tiny League</a>`
        : route.request().url().endsWith("c-99") ? `<h1>Tiny League</h1><a href="/betting/football/alpha-beta/e-100">Alpha v Beta</a>` : priceCard("100") }));
    // Simulate only the OS transport. All scripts, navigation and the Renzo
    // page adapter itself execute against a real isolated Chromium document.
    const adapter = await RenzoChromePage.open({ localState: { profile: { info_cache: { Default: { name: "Renzo" } } } }, command: async (command, args) => {
      if (command === "ps") return "22 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
      if (command === "open") return "";
      if (args[1] === "locate") return "123:456";
      if (args[1] === "navigate") { await chromeTab.goto(args[4]!); return ""; }
      if (args[1] === "execute") return String(await chromeTab.evaluate(source => (0, eval)(source), args[4]!));
      return "";
    } });
    t.mock.method(adapter, "waitForTimeout", async () => {});
    await adapter.goto(base);
    const ctx = context(adapter.asPage()); ctx.renzoPage = adapter;
    const result = await crawlBetfair(adapter.asPage(), ctx);
    assert.equal(result.kind, "data");
    if (result.kind === "data") { assert.equal(result.records.length, 2); assert.equal(result.records[0]?.sourceEventId, "100"); }
    assert.equal(ctx.visualCrawl?.visited.length, 3);
    assert.equal(ctx.betfairCrawl?.failures.length, 0);
    await adapter.close();
  } finally { await browser.close(); }
});
