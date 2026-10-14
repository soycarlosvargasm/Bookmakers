import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { extractPinnacleRecords, isPinnacleFeedUrl, type PinnacleCapture } from "../src/network/pinnacle.js";

// Unmodified samples of the publicly observed Arcadia responses, 2026-09-26.
const captures = JSON.parse(await readFile(new URL("./fixtures/pinnacle-network.json", import.meta.url), "utf8")) as PinnacleCapture[];

test("Pinnacle joins observed matchup IDs, binds sides and preserves signed spread/total points", () => {
  const rows = extractPinnacleRecords(captures, "2026-09-26T04:36:00Z");
  assert.equal(rows.length, 12);
  const soccer = rows.filter(row => row.sourceEventId === "1636346499");
  assert.equal(soccer.length, 9);
  assert.equal(soccer[0]?.eventName, "England vs Spain");
  assert.equal(soccer[0]?.competition, "UEFA - Nations League A");
  assert.equal(soccer[0]?.sport, "Soccer");
  assert.equal(soccer[0]?.rawOdds, "+230");
  assert.equal(soccer[0]?.decimalOdds, 3.3);
  assert.equal(soccer[2]?.selection, "Draw");
  const spread = soccer.filter(row => row.market === "Spread");
  assert.deepEqual(spread.map(row => [row.selection, row.line]), [["England", "0.25"], ["Spain", "-0.25"]]);
  assert.deepEqual(soccer.filter(row => row.market === "Total").map(row => [row.selection, row.line]), [["Over", "2.75"], ["Under", "2.75"]]);
  assert.deepEqual(soccer.filter(row => row.market === "Team Total").map(row => row.selection), ["England Over", "England Under"]);
  assert.ok(rows.every(row => row.sportsbook === "pinnacle" && row.bookmaker === "pinnacle" && row.rawOddsFormat === "american"));
  assert.equal(new Set(rows.map(row => row.sourceSelectionId)).size, rows.length);
  assert.deepEqual(rows.filter(row => row.sourceEventId === "1635222027").map(row => row.selection), ["USA", "Tie", "Internationals"]);
});

test("Pinnacle rejects unmatched metadata and unrelated endpoints and keeps the newest market snapshot", () => {
  assert.equal(extractPinnacleRecords([captures[1]!]).length, 0);
  assert.equal(extractPinnacleRecords(captures.map(capture => ({ ...capture, url: "https://example.test/feed" }))).length, 0);
  const repeated = [...captures, captures[1]!, captures[0]!];
  assert.equal(extractPinnacleRecords(repeated).length, 12);
  const stale = structuredClone(captures[1]!);
  const market = (stale.payload as Array<{ version: number; prices: Array<{ price: number }> }>)[0]!;
  market.version -= 1;
  market.prices[0]!.price = 999;
  assert.equal(extractPinnacleRecords([...captures, stale])[0]?.rawOdds, "+230");
  assert.equal(isPinnacleFeedUrl("https://guest.api.arcadia.pinnacle.com/0.1/sports/29/markets/highlighted/straight?primaryOnly=false"), true);
  assert.equal(isPinnacleFeedUrl("https://www.pinnacle.com/config/app.json"), false);
});
