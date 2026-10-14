import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { altenarEndpoint, extractAltenarRecords } from "../src/network/altenar.js";
import { extractCodereRecords } from "../src/network/codere.js";
import { betwayBoardsFromHtml, extractBetwayRecords } from "../src/network/betway.js";
const playdoit = JSON.parse(await readFile(new URL("./fixtures/playdoit-network.json", import.meta.url), "utf8"));
const codere = JSON.parse(await readFile(new URL("./fixtures/codere-network.json", import.meta.url), "utf8"));
const betwayHtml = await readFile(new URL("./fixtures/betway-network.html", import.meta.url), "utf8");
test("Altenar joins the real Playdoit payload and preserves its actual integration", () => {
  const captures = [{ url: altenarEndpoint("playdoit2", "en-GB"), payload: playdoit }];
  const records = extractAltenarRecords(captures, { integration: "playdoit2", sportsbook: "playdoit" });
  assert.equal(records.length, 84);
  assert.ok(records.every(r => r.sportsbook === "playdoit" && r.bookmaker === "playdoit"));
  assert.equal(extractAltenarRecords(captures, { integration: "winpot.mx", sportsbook: "winpot" }).length, 0);
});
test("Altenar excludes odds without event/market joins", () => {
  assert.deepEqual(extractAltenarRecords([{ url: altenarEndpoint("playdoit2"), payload: { ...playdoit, markets: [] } }], { integration: "playdoit2", sportsbook: "playdoit" }), []);
});
test("Codere joins real Sport/SBClass/SBType/Ev/Mkt/Seln/Price fields", () => {
  const records = extractCodereRecords(codere);
  assert.ok(records.length >= 9);
  const first = records.find(r => r.sourceEventId === "13924960");
  assert.equal(first?.competition, "Liga MX");
  assert.equal(first?.selection, "Pumas UNAM");
  assert.equal(first?.decimalOdds, 1.95);
  assert.equal(first?.homeParticipant, "Pumas UNAM");
  assert.equal(first?.awayParticipant, "Atlético San Luis");
  assert.equal(first?.line, null);
  assert.equal(new Set(records.map(r => JSON.stringify([r.sourceEventId, r.sourceMarketId, r.sourceSelectionId]))).size, records.length);
});
test("Codere rejects failed ContentAPI responses and unrelated endpoints", () => {
  assert.deepEqual(extractCodereRecords([{ url: codere[0].url, payload: { ContentAPI: { "@status": "ERROR" } } }]), []);
  assert.deepEqual(extractCodereRecords([{ ...codere[0], url: "https://unrelated.invalid/" }]), []);
});
test("Betway decodes captured React Flight JSON without executing scripts", () => {
  const boards = betwayBoardsFromHtml(betwayHtml);
  const records = extractBetwayRecords(boards);
  assert.ok(records.length > 200);
  assert.ok(records.some(r => r.eventName === "Pumas UNAM - Atlético San Luis" && r.selection === "Pumas UNAM"));
  assert.ok(records.every(r => r.bookmaker === "betway" && r.rawOdds === String(r.decimalOdds)));
  assert.equal(new Set(records.map(r => JSON.stringify([r.sourceEventId, r.sourceMarketId, r.sourceSelectionId]))).size, records.length);
});
test("Betway ignores accumulator prices and orphan outcomes", () => {
  assert.deepEqual(extractBetwayRecords([{ data: [{ legs: [{ eventId: 1 }], accumulator: { AccumulatorPriceDecimal: 7.5 } }] }]), []);
  const boards = betwayBoardsFromHtml(betwayHtml).map(board => ({ ...board, markets: {} }));
  assert.deepEqual(extractBetwayRecords(boards), []);
});
test("Betway rejects malformed Flight literals and suspended selections", () => {
  assert.deepEqual(betwayBoardsFromHtml('<script>self.__next_f.push([1,doSomething()])</script>'), []);
  const boards = betwayBoardsFromHtml(betwayHtml).map(board => ({ ...board, outcomes: Object.fromEntries(Object.entries(board.outcomes as Record<string, object>).map(([key,value]) => [key, { ...value, suspended: true }])) }));
  assert.deepEqual(extractBetwayRecords(boards), []);
});

test("Rushbet maps Kambi thousandths, provider IDs and individual odds", async () => {
  const { extractRushbetRecords, RUSHBET_ENDPOINTS } = await import("../src/network/rushbet.js");
  const payload = JSON.parse(await readFile(new URL("./fixtures/rushbet-network.json", import.meta.url), "utf8"));
  const records = extractRushbetRecords([{ url: RUSHBET_ENDPOINTS[0]!, payload }]);
  const home = records.find(r => r.sourceSelectionId === "4344135933");
  assert.equal(home?.selection, "Pumas UNAM");
  assert.equal(home?.decimalOdds, 1.9);
  const total = records.find(r => r.sourceSelectionId === "4344136031");
  assert.equal(total?.line, "2.5");
  assert.equal(total?.decimalOdds, 1.67);
  assert.equal(total?.marketPeriod, "FULL_TIME");
  assert.ok(records.every(r => r.bookmaker === "rushbet"));
});
test("Rushbet ignores parlay bundle odds and suspended/unjoined outcomes", async () => {
  const { extractRushbetRecords, RUSHBET_ENDPOINTS } = await import("../src/network/rushbet.js");
  assert.deepEqual(extractRushbetRecords([{ url: RUSHBET_ENDPOINTS[0]!, payload: [{ odds: { decimal: 9 }, events: [] }] }]), []);
  const payload = JSON.parse(await readFile(new URL("./fixtures/rushbet-network.json", import.meta.url), "utf8"));
  for (const row of payload.events) for (const market of row.betOffers) market.suspended = true;
  assert.deepEqual(extractRushbetRecords([{ url: RUSHBET_ENDPOINTS[0]!, payload }]), []);
});
