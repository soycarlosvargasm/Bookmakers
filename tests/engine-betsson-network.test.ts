import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { extractBetssonRecords, isBetssonFeedUrl, type BetssonCapture } from "../src/network/betsson.js";

// Unmodified event, market and selection objects observed on Betsson MX, 2026-09-26.
const captures = JSON.parse(await readFile(new URL("./fixtures/betsson-network.json", import.meta.url), "utf8")) as BetssonCapture[];

test("Betsson joins separate widget arrays by real IDs and preserves decimal display, labels and market lines", () => {
  const rows = extractBetssonRecords(captures);
  assert.equal(rows.length, 9);
  assert.equal(rows[0]?.eventName, "Inglaterra - España");
  assert.equal(rows[0]?.sport, "Fútbol");
  assert.equal(rows[0]?.competition, "UEFA Nations League");
  assert.equal(rows[0]?.selection, "Inglaterra");
  assert.equal(rows[0]?.market, "Ganador del partido");
  assert.equal(rows[0]?.rawOdds, "3.45");
  assert.equal(rows[0]?.decimalOdds, 3.45);
  assert.equal(rows[0]?.sourceEventId, "f-3uLKkolqOkanyK3VybudSg");
  assert.equal(rows[0]?.sourceMarketId, "m-f-3uLKkolqOkanyK3VybudSg-MW3W");
  assert.equal(rows[0]?.sourceSelectionId, "s-m-f-3uLKkolqOkanyK3VybudSg-MW3W-home");
  assert.equal(rows[0]?.line, null);
  assert.ok(rows.every(row => row.sportsbook === "betsson" && row.bookmaker === "betsson" && row.rawOddsFormat === "decimal" && row.marketPeriod === null));
  const line = rows.find(row => row.line !== null)!;
  assert.equal(line.line, "3.5");
  assert.equal(line.market, "Ganador del partido + Total de goles 3.5");
  assert.equal(line.selection, "Macedonia del Norte y Más de");
  assert.equal(line.rawOdds, "51.00");
});

test("Betsson refuses missing joins and unrelated endpoints and deduplicates repeated selection IDs", () => {
  assert.equal(extractBetssonRecords([...captures, ...captures]).length, 9);
  assert.equal(extractBetssonRecords(captures.map(capture => ({ ...capture, url: "https://example.test/feed" }))).length, 0);
  const broken = structuredClone(captures);
  for (const capture of broken) {
    const payload = capture.payload as { data: { events: unknown[] } };
    payload.data.events = [];
  }
  assert.equal(extractBetssonRecords(broken).length, 0);
  assert.equal(isBetssonFeedUrl("https://www.betsson.mx/api/sb/v1/widgets/carousel/v3?priceFormats=2,1"), true);
  assert.equal(isBetssonFeedUrl("https://www.betsson.mx/api/sb/v1/widgets/widget-config/v1"), false);
});
