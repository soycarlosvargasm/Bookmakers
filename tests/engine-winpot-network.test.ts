import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { extractWinpotRecords, fetchWinpotFeed, isWinpotFeedUrl, WINPOT_ENDPOINT } from "../src/network/winpot.js";

// Complete, unmodified GetTopEvents response captured on Winpot MX, 2026-09-27.
const payload = JSON.parse(await readFile(new URL("./fixtures/winpot-network.json", import.meta.url), "utf8"));
const capture = { url: WINPOT_ENDPOINT, payload };

test("Winpot joins observed event/market/odd IDs and maps decimal odds and competition without guessing home/away", () => {
  const records = extractWinpotRecords([capture]);
  assert.equal(records.length, 48);
  const first = records[0]!;
  assert.equal(first.eventName, "Pumas UNAM vs. Atletico San Luis");
  assert.equal(first.market, "1x2"); assert.equal(first.selection, "Pumas UNAM");
  assert.equal(first.sourceEventId, "17642051"); assert.equal(first.sourceMarketId, "1743292123"); assert.equal(first.sourceSelectionId, "4535605008");
  assert.equal(first.decimalOdds, 2); assert.equal(first.rawOdds, "2"); assert.equal(first.rawOddsFormat, "decimal");
  assert.equal(first.sport, "Fútbol"); assert.equal(first.competition, "Liga MX");
  assert.deepEqual(first.participants, ["Pumas UNAM", "Atletico San Luis"]);
  assert.equal(first.homeParticipant, null); assert.equal(first.awayParticipant, null); assert.equal(first.marketPeriod, null); assert.equal(first.line, null);
  assert.equal(records[1]!.selection, "X");
  assert.ok(records.every(row => row.sportsbook === "winpot" && row.bookmaker === "winpot"));
  const withoutMetadata = structuredClone(payload);
  withoutMetadata.sports = []; withoutMetadata.champs = []; withoutMetadata.competitors = [];
  const missing = extractWinpotRecords([{ url: WINPOT_ENDPOINT, payload: withoutMetadata }])[0]!;
  assert.equal(missing.sport, null); assert.equal(missing.competition, null); assert.equal(missing.participants, null);
});

test("Winpot keeps signed selection handicaps and total lines, without extracting nested teasers", () => {
  const records = extractWinpotRecords([capture]);
  assert.equal(records.find(record => record.sourceSelectionId === "4425550373")?.line, "+3.5");
  assert.equal(records.find(record => record.sourceSelectionId === "4425550374")?.line, "-3.5");
  assert.equal(records.find(record => record.sourceSelectionId === "4425550393")?.line, "42.5");
  assert.equal(records.find(record => record.sourceSelectionId === "4425550394")?.line, "42.5");
  assert.ok(!records.some(record => record.sourceSelectionId === "4425550381"));
  assert.equal(records.find(record => record.sourceSelectionId === "4436444865")?.decimalOdds, payload.odds.find((odd: { id: number }) => odd.id === 4436444865).price);
});

test("Winpot refuses unrelated integrations, missing joins and invalid prices and deduplicates stable IDs", () => {
  assert.equal(isWinpotFeedUrl(WINPOT_ENDPOINT), true);
  assert.equal(extractWinpotRecords([{ ...capture, url: WINPOT_ENDPOINT.replace("winpot.mx", "other.mx") }]).length, 0);
  assert.equal(extractWinpotRecords([capture, capture]).length, 48);
  const broken = structuredClone(payload); broken.markets = [];
  assert.equal(extractWinpotRecords([{ ...capture, payload: broken }]).length, 0);
  const absent = structuredClone(payload); absent.odds = [];
  assert.equal(extractWinpotRecords([{ ...capture, payload: absent }]).length, 0);
  const invalid = structuredClone(payload); invalid.odds[0].price = 1;
  assert.equal(extractWinpotRecords([{ ...capture, payload: invalid }]).length, 47);
});

test("Winpot fetch requests the confirmed Altenar endpoint and preserves non-JSON error evidence", async context => {
  const calls: Array<{ url: string; options?: RequestInit }> = [];
  context.mock.method(globalThis, "fetch", async (url: string, options?: RequestInit) => {
    calls.push({ url, options });
    return new Response("Service unavailable", { status: 503, headers: { "content-type": "text/plain" } });
  });
  const result = await fetchWinpotFeed(1000);
  const url = new URL(calls[0]!.url);
  assert.equal(url.origin + url.pathname, "https://sb2frontend-altenar2.biahosted.com/api/widget/GetTopEvents");
  assert.deepEqual(Object.fromEntries(url.searchParams), { culture: "es-ES", timezoneOffset: "-420", integration: "winpot.mx", deviceType: "1", numFormat: "es-ES", countryCode: "MX", eventCount: "0", sportId: "0", timePeriod: "0" });
  assert.ok(calls[0]!.options?.signal);
  assert.equal(result.status, 503); assert.equal(result.payload, null); assert.equal(result.body, "Service unavailable");
});
