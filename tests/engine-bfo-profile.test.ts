import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { extractBestFightOddsDom } from "../src/profiles/bestfightodds.js";
import { HttpHandler } from "../src/engine/handlers.js";
import { captureVisibleDom } from "../src/dom/browser.js";
import { chromium } from "playwright";
import type { DomNode } from "../src/dom/extractor.js";

const node = (tag: string, text: string, children: DomNode[] = [], attrs?: Record<string, string>): DomNode => ({ tag, text, path: tag, children, attrs });

test("BFO profile joins two fighter rows by data-mu and binds moneyline odds by data-li", () => {
  const table = node("table", "", [
    node("thead", "", [node("tr", "", [node("th", "FanDuel", [node("a", "FanDuel")], { "data-b": "21" })])]),
    node("tbody", "", [
      node("tr", "", [node("th", "45001Christian Eckerlin", [node("a", "45001"), node("a", "Christian Eckerlin")]), node("td", "+150", [], { "data-li": "[21,1,45001]" }), node("td", "", [], { "data-mu": "45001" })]),
      node("tr", "", [node("th", "David Kozma", [node("a", "David Kozma")]), node("td", "-170", [], { "data-li": "[21,2,45001]" }), node("td", "", [], { "data-mu": "45001" })])
    ])
  ]);
  const rows = extractBestFightOddsDom(node("body", "", [table]), { sportsbook: "bestfightodds", sourceUrl: "https://www.bestfightodds.com/" });
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((row) => row.selection), ["Christian Eckerlin", "David Kozma"]);
  assert.deepEqual(rows.map((row) => row.rawOdds), ["+150", "-170"]);
  assert.equal(rows[0]?.eventName, "Christian Eckerlin vs David Kozma");
  assert.equal(rows[0]?.sourceEventId, "45001");
  assert.equal(rows[0]?.market, "Moneyline");
  assert.equal(rows[0]?.eventStatus, null);
  assert.equal(rows[0]?.bookmaker, "fanduel");
  assert.equal(rows[0]?.sportsbook, "bestfightodds");
});

test("BFO profile retains equal prices from different books and reads the event heading", () => {
  const table = node("table", "", [
    node("thead", "", [node("tr", "", [node("th", "FanDuel", [node("a", "FanDuel")], { "data-b": "21" }), node("th", "BetMGM", [node("a", "BetMGM")], { "data-b": "23" })])]),
    node("tbody", "", [
      node("tr", "", [node("th", "Fighter A", [node("a", "Fighter A")]), node("td", "+110", [], { "data-li": "[21,1,45001]" }), node("td", "+110", [], { "data-li": "[23,1,45001]" }), node("td", "", [], { "data-mu": "45001" })]),
      node("tr", "", [node("th", "Fighter B", [node("a", "Fighter B")]), node("td", "-120", [], { "data-li": "[21,2,45001]" }), node("td", "-120", [], { "data-li": "[23,2,45001]" }), node("td", "", [], { "data-mu": "45001" })])
    ])
  ]);
  const block = node("div", "", [node("h1", "UFC 300 Odds"), table]);
  const rows = extractBestFightOddsDom(node("body", "", [block]), { sportsbook: "bestfightodds", sourceUrl: "https://www.bestfightodds.com/" });
  assert.equal(rows.length, 4);
  assert.deepEqual([...new Set(rows.map((row) => row.bookmaker))].sort(), ["betmgm", "fanduel"]);
  assert.ok(rows.every((row) => row.competition === "UFC 300"));
  assert.equal(rows.filter((row) => row.selection === "Fighter A" && row.rawOdds === "+110").length, 2);
});

test("DOM capture preserves fighter names with the letter s", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<table class="odds-table"><tbody><tr><th><a>Christian Eckerlin</a></th><td data-li="[21,1,45001]">+150</td><td data-mu="45001"></td></tr></tbody></table>');
    const tree = await captureVisibleDom(page, { rootSelector: "table.odds-table" });
    assert.match(JSON.stringify(tree), /Christian Eckerlin/);
  } finally { await browser.close(); }
});

test("HTTP handler accepts 3 MB HTML with embedded JSON but keeps the 2 MB JSON limit", async () => {
  const event = { events: [{ id: "one", name: "A vs B", sport: "mma", markets: [{ name: "Winner", selections: [{ name: "A", odds: 1.8 }] }] }] };
  const html = `<html><script type="application/json">${JSON.stringify(event)}</script><body>${"x".repeat(3 * 1024 * 1024)}</body></html>`;
  const json = JSON.stringify({ ...event, filler: "x".repeat(3 * 1024 * 1024) });
  const server = createServer((request, response) => {
    response.setHeader("content-type", request.url === "/html" ? "text/html" : "application/json");
    response.end(request.url === "/html" ? html : json);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const handler = new HttpHandler();
    const source = { type: "sportsbook", url: `http://127.0.0.1:${address.port}/html` };
    const result = await handler.run({ source, memory: null, configuration: null, timeoutMs: 10_000, observeMs: 0 });
    assert.equal(result.kind, "data");
    if (result.kind === "data") assert.equal(result.records.length, 1);
    const tooLarge = await handler.run({ source: { ...source, url: `http://127.0.0.1:${address.port}/json` }, memory: null, configuration: null, timeoutMs: 10_000, observeMs: 0 });
    assert.deepEqual(tooLarge, { kind: "miss", reason: "Response exceeds capture limit" });
  } finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
});
