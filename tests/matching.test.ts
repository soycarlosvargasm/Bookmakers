import assert from "node:assert/strict";
import test from "node:test";
import { compareEvents, semanticMarket, semanticSelection, stableName } from "../src/matching/service.js";

const event = (overrides: Record<string, unknown> = {}) => ({
  id: 1, sportsbook: "book-a", sourceEventId: "e-1", sport: "football", competition: "La Liga",
  eventName: "Real Madrid vs Barcelona", participants: ["Real Madrid", "Barcelona"], home: "Real Madrid", away: "Barcelona",
  startTime: "2026-09-22T18:00:00Z", status: "prematch", ...overrides
});

test("event matching accepts source-namespace IDs and canonicalizes common club suffixes", () => {
  const external = compareEvents(event({ sportsbook: "actionnetwork-15", sourceEventId: "99" }), event({ id: 2, sportsbook: "actionnetwork-75", sourceEventId: "99" }));
  assert.equal(external?.method, "EXTERNAL_ID_NAMESPACE");
  assert.equal(compareEvents(event({ sportsbook: "actionnetwork-15", sourceEventId: "99" }), event({ id: 2, sportsbook: "actionnetwork-75", sourceEventId: "99", sport: "basketball", competition: "nba" })), null);
  const semantic = compareEvents(event(), event({ id: 2, sportsbook: "book-b", sourceEventId: "other", eventName: "FC Barcelona @ Real Madrid CF", participants: ["FC Barcelona", "Real Madrid CF"], home: "Real Madrid CF", away: "FC Barcelona" }));
  assert.equal(semantic?.method, "SPORT_COMPETITION_PARTICIPANTS_TIME");
  assert.equal(stableName("Real Madrid CF"), stableName("Real Madrid"));
});

test("event matching rejects reversed home-away, lifecycle conflicts without a schedule, and distant starts", () => {
  assert.equal(compareEvents(event(), event({ id: 2, sportsbook: "book-b", home: "Barcelona", away: "Real Madrid", participants: ["Barcelona", "Real Madrid"] })), null);
  assert.equal(compareEvents(event({ startTime: null }), event({ id: 2, sportsbook: "book-b", status: "live", startTime: null })), null);
  assert.equal(compareEvents(event(), event({ id: 2, sportsbook: "book-b", status: "live" }))?.method, "SPORT_COMPETITION_PARTICIPANTS_TIME");
  assert.equal(compareEvents(event(), event({ id: 2, sportsbook: "book-b", startTime: "2026-09-22T22:00:01Z" })), null);
});

test("market semantics preserve family, period, subject, side and line", () => {
  const total = semanticMarket({ market: "Total Goals", period: "Full Game", player: null, home: "A", away: "B" });
  const totalAlias = semanticMarket({ market: "Game Total Goals", period: "game", player: null, home: "A", away: "B" });
  assert.equal(total.family, "TOTAL");
  assert.equal(total.typeKey, totalAlias.typeKey);
  assert.equal(total.periodKey, totalAlias.periodKey);
  const over25 = semanticSelection({ selection: "Over", line: "2½", home: "A", away: "B" }, total);
  const embeddedOver25 = semanticSelection({ selection: "Over 2½", line: null, home: "A", away: "B" }, total);
  const over35 = semanticSelection({ selection: "O", line: "3.5", home: "A", away: "B" }, total);
  assert.equal(over25.selectionKey, over35.selectionKey);
  assert.equal(embeddedOver25.lineKey, over25.lineKey);
  assert.notEqual(over25.lineKey, over35.lineKey);
  assert.notEqual(semanticMarket({ market: "Game Total", period: "First Half", player: null, home: "A", away: "B" }).periodKey, total.periodKey);
  assert.notEqual(semanticMarket({ market: "Team Total", period: "Game", player: null, home: "A", away: "B" }).family, total.family);
  assert.equal(semanticMarket({ market: "Team Score", period: "Game", player: null, home: "A", away: "B" }).ambiguous, true);
  assert.notEqual(semanticMarket({ market: "Player Points", period: "Game", player: "Jane Doe", home: "A", away: "B" }).family, semanticMarket({ market: "Team Points", period: "Game", player: null, home: "A", away: "B" }).family);
  const moneyline = semanticMarket({ market: "moneyline", period: "game", player: null, home: "A", away: "B" });
  assert.equal(semanticSelection({ selection: "Away", line: null, home: "A", away: "B" }, moneyline).selectionKey, "AWAY");
  assert.equal(semanticSelection({ selection: "Home", line: null, home: "A", away: "B" }, moneyline).ambiguous, false);
  const runs = semanticMarket({ market: "Total Runs O/U", period: "First 5 Innings", player: null, home: "A", away: "B" });
  assert.equal(semanticSelection({ selection: "Over - 1H", line: "3.5", home: "A", away: "B" }, runs).ambiguous, false);
  const exact = semanticMarket({ market: "Exact Total Runs", period: "Game", player: null, home: "A", away: "B" });
  assert.equal(exact.family, "EVENT_PROP");
  assert.equal(semanticSelection({ selection: "Exactly 4", line: null, home: "A", away: "B" }, exact).ambiguous, false);
  const mmaEventProp = semanticMarket({ market: "mma_prop_either-fighter-wins-by-submission", period: "fight", player: null, home: "A", away: "B" });
  assert.equal(mmaEventProp.family, "EVENT_PROP");
  const bands = semanticMarket({ market: "Total Runs (Bands)", period: "Game", player: null, home: "A", away: "B" });
  assert.equal(bands.family, "EVENT_PROP");
  assert.equal(semanticSelection({ selection: "3-4", line: null, home: "A", away: "B" }, bands).ambiguous, false);
  const spread = semanticMarket({ market: "Spread", period: "First 5 Innings", player: null, home: "Los Angeles Dodgers", away: "A" });
  assert.equal(semanticSelection({ selection: "Los Angeles Dodgers - 1H", line: "0.5", home: "Los Angeles Dodgers", away: "A" }, spread).selectionKey, "HOME");
  const embeddedSpread = semanticSelection({ selection: "Los Angeles Dodgers -1.5", line: null, home: "Los Angeles Dodgers", away: "A" }, spread);
  assert.equal(embeddedSpread.selectionKey, "HOME");
  assert.equal(embeddedSpread.lineKey, "-1.5");
});
