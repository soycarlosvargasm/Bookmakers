import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyBetOnlinePageState } from "../src/connectors/betonline/connector.js";
import { parseBetOnlinePayloads } from "../src/connectors/betonline/parser.js";

test("BetOnline parser extracts present dynamic markets and preserves source identifiers", () => {
  const records = parseBetOnlinePayloads([{
    sportsbook: "betonline", accountAlias: "personal", sourceType: "json", sourceUrl: "https://api-offering.betonline.ag/api/offering/sports/get-event",
    retrievedAt: "2026-09-13T00:00:00.000Z", providerTimestamp: null, externalEventId: null, parserVersion: "test",
    rawPayload: { status: 200, contentType: "application/json", body: JSON.stringify({ events: [{ eventId: "evt-1", sport: "football", competition: "NFL", eventName: "Away at Home", participants: [{ name: "Away" }, { name: "Home" }], homeParticipant: "Home", awayParticipant: "Away", startTime: "2026-09-14T18:00:00Z", live: false, markets: [{ marketId: "m-1", marketType: "Team Total", period: "Game", selections: [{ selectionId: "s-1", selectionName: "Home Over", line: "2.5", odds: { american: "+110" } }] }] }] }) },
  }]);
  assert.equal(records.length, 1);
  assert.equal(records[0]?.sourceEventId, "evt-1");
  assert.equal(records[0]?.sourceMarketId, "m-1");
  assert.equal(records[0]?.sourceSelectionId, "s-1");
  assert.equal(records[0]?.market, "Team Total");
  assert.equal(records[0]?.marketPeriod, "Game");
  assert.equal(records[0]?.line, "2.5");
  assert.equal(records[0]?.rawOdds, "+110");
  assert.equal(records[0]?.decimalOdds, 2.1);
  assert.equal(records[0]?.eventStatus, "prematch");
});

test("BetOnline parser leaves absent odds and event fields null", () => {
  const [record] = parseBetOnlinePayloads([{
    sportsbook: "betonline", accountAlias: "personal", sourceType: "json", sourceUrl: "https://api-offering.betonline.ag/api/offering/sports/get-event", parserVersion: "test",
    rawPayload: { body: JSON.stringify({ events: [{ eventId: "evt-2", markets: [{ marketId: "m-2", marketName: "Unknown", selections: [{ selectionId: "s-2", selectionName: "Unavailable" }] }] }] }) }
  }]);
  assert.equal(record?.decimalOdds, null);
  assert.equal(record?.rawOdds, null);
  assert.equal(record?.sport, null);
  assert.equal(record?.eventStartTime, null);
});

test("BetOnline parser preserves observed live score, clock and suspended selection state", () => {
  const [record] = parseBetOnlinePayloads([{
    sportsbook: "betonline", accountAlias: "personal", sourceType: "dom", sourceUrl: "https://www.betonline.ag/sportsbook/live/sport/basketball/1724687", parserVersion: "test",
    rawPayload: { events: [{
      eventId: "1724687", sport: "basketball", competition: "Turkey - TBL", eventName: "Ogm Ormanspor vs Buyukcekmece Basketbol",
      participants: ["Ogm Ormanspor", "Buyukcekmece Basketbol"], live: true, period: "2nd · 0:17", score: ["42", "38"], liveClock: "2nd · 0:17",
      markets: [{ marketName: "Moneyline", period: "Live", selections: [{ selectionName: "Ogm Ormanspor", suspended: true }] }]
    }] }
  }]);
  assert.equal(record?.eventStatus, "live");
  assert.deepEqual(record?.liveScore, ["42", "38"]);
  assert.equal(record?.liveClock, "2nd · 0:17");
  assert.equal(record?.selectionStatus, "suspended");
  assert.equal(record?.decimalOdds, null);
});

test("BetOnline classifies the observed regional page as degraded access, not an auth failure", () => {
  const state = classifyBetOnlinePageState("BetOnline is not available in your region", 0);
  assert.equal(state.regionalBlock, true);
  assert.equal(state.loginForm, false);
  assert.equal(state.challenge, false);
});
