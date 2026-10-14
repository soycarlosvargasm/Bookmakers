import assert from "node:assert/strict";
import { test } from "node:test";
import { betB2BEndpoint, extractBetB2BRecords, type BetB2BCapture, type BetB2BDictionary } from "../src/network/betb2b.js";
import { ONEXBET_BETB2B_OPTIONS } from "../src/network/onexbet.js";

test("1xBet parses every priced match in a block across sports and skips unidentifiable summary legs", () => {
  const payload = [{ events: [
    { sport: { id: 66, name: "Cricket" }, liga: { id: 2607656, name: "Asian Games" },
      opponent1: { fullName: "Sri Lanka", opps: [{ id: 21871 }] }, opponent2: { fullName: "Nepal", opps: [{ id: 37787 }] },
      event: { type: 401, groupId: 101, cf: 1.511, cfView: "1.511" }, id: 756305683, startTs: 1790640000 },
    { sport: { id: 3, name: "Basketball" }, liga: { id: 139460, name: "Euroleague" },
      opponent1: { fullName: "Paris", opps: [{ id: 411083 }] }, opponent2: { fullName: "Partizan", opps: [{ id: 6798 }] },
      event: { type: 9, groupId: 17, parameter: 172.5, cf: 1.814 }, id: 756224953, startTs: 1790707500,
      eventGroups: [{ groupId: 17, events: [
        [{ type: 9, cf: 1.9 }, { type: 10, cf: 2.2, parameter: 173.5 }],
        [{ type: 1, cf: 1.4 }]
      ] }] },
    { event: { type: 707, cf: 1.1 }, id: 384962132 }
  ] }];
  const capture: BetB2BCapture = { url: betB2BEndpoint(ONEXBET_BETB2B_OPTIONS, "line"), status: 200,
    contentType: "application/json", body: JSON.stringify(payload), payload, mode: "line" };
  const dictionaries = new Map<string, BetB2BDictionary>([["9", { type: "9", url: "https://example.test/9.json", status: 200,
    payload: { "9": { "17": { N: "Total", M: { "9": { N: "Over" } } } } } }]]);
  const rows = extractBetB2BRecords([capture], dictionaries, ONEXBET_BETB2B_OPTIONS, "2026-09-29T00:00:00.000Z");
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.map(row => row.sport), ["Cricket", "Basketball", "Basketball", "Basketball"]);
  assert.equal(rows[0]?.eventName, "Sri Lanka v Nepal");
  assert.equal(rows[0]?.sourceEventId, "756305683");
  assert.equal(rows[0]?.sourceMarketId, "401");
  assert.equal(rows[0]?.sourceSelectionId, "401:21871:37787");
  assert.equal(rows[0]?.qualifiers?.marketId, "1xbet_type_401");
  assert.equal(rows[0]?.qualifiers?.ligaId, "2607656");
  assert.equal(rows[0]?.market, "type_401");
  assert.equal(rows[0]?.rawOdds, "1.511");
  assert.equal(rows[0]?.decimalOdds, 1.511);
  assert.equal(rows[0]?.rawOddsFormat, "decimal");
  assert.equal(rows[1]?.market, "Total");
  assert.equal(rows[1]?.selection, "Over");
  assert.equal(rows[1]?.line, "172.5");
  assert.equal(rows[1]?.decimalOdds, 1.814);
  assert.equal(rows[2]?.sourceMarketId, "10");
  assert.equal(rows[2]?.sourceSelectionId, "10:411083:6798");
  assert.equal(rows[2]?.market, "type_10");
  assert.equal(rows[2]?.selection, "type_10");
  assert.equal(rows[2]?.line, "173.5");
  assert.equal(rows[2]?.decimalOdds, 2.2);
  assert.equal(rows[3]?.sourceSelectionId, "1:411083:6798");
  assert.equal(rows[3]?.selection, "type_1");
});
