import assert from "node:assert/strict";
import { test } from "node:test";
import { betB2B22Endpoint, extractBetB2B22Records, type BetB2BCapture } from "../src/network/betb2b.js";
import { TWENTYTWO_BET_OPTIONS } from "../src/network/22bet.js";

test("22bet reads every E[] price from the abbreviated Value[] dialect", () => {
  const event = { I: 756872014, O1: "Lalbagh Kings", O2: "Silk City Yodhas", O1I: 10906350, O2I: 10908132,
    SI: 66, SN: "Cricket", L: "India. Hazarduari League", LI: 3094686, S: 1790667000,
    E: [{ T: 402, C: 1.6, CV: "1.6", G: 101 }, { T: 3, C: 1.603, CV: "1.603", G: 1 },
      { T: 401, C: 2.18, CV: "2.18", G: 101, P: 1.5 }] };
  const payload = { Id: 0, Success: true, Value: [event] };
  const capture: BetB2BCapture = { url: betB2B22Endpoint(TWENTYTWO_BET_OPTIONS, "line"), mode: "line",
    status: 200, contentType: "application/json", body: JSON.stringify(payload), payload };
  const rows = extractBetB2B22Records([capture], TWENTYTWO_BET_OPTIONS, "2026-09-29T00:00:00.000Z");
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(row => row.sourceMarketId), ["402", "3", "401"]);
  assert.deepEqual(rows.map(row => row.decimalOdds), [1.6, 1.603, 2.18]);
  assert.equal(rows[0]?.sport, "Cricket");
  assert.equal(rows[0]?.competition, "India. Hazarduari League");
  assert.equal(rows[0]?.eventName, "Lalbagh Kings v Silk City Yodhas");
  assert.equal(rows[0]?.sourceEventId, "756872014");
  assert.equal(rows[0]?.sourceSelectionId, "402:10906350:10908132");
  assert.equal(rows[0]?.market, "type_402");
  assert.equal(rows[0]?.selection, "type_402");
  assert.equal(rows[0]?.rawOdds, "1.6");
  assert.equal(rows[0]?.rawOddsFormat, "decimal");
  assert.equal(rows[0]?.qualifiers?.sportId, "66");
  assert.equal(rows[0]?.qualifiers?.ligaId, "3094686");
  assert.equal(rows[0]?.qualifiers?.groupId, "101");
  assert.equal(rows[2]?.line, "1.5");
  assert.equal(rows[2]?.eventStartTime, "2026-09-29T07:30:00.000Z");
  assert.match(capture.url, /country=71&partner=151&gr=151/);
  assert.match(betB2B22Endpoint(TWENTYTWO_BET_OPTIONS, "live"), /LiveFeed\/Get1x2_VZip/);
});
