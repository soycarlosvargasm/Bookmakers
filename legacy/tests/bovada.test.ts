import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_BOVADA_SPORT_PATHS } from "../src/connectors/bovada/connector.js";
import { parseCoupon } from "../src/connectors/bovada/parser.js";

test("Bovada default delegates category coverage to rendered navigation discovery", () => {
  assert.deepEqual(DEFAULT_BOVADA_SPORT_PATHS, []);
});

test("Bovada parser preserves source IDs, periods, lines, raw American odds and dynamic markets", () => {
  const records = parseCoupon([{
    path: [{ type: "LEAGUE", description: "NFL", id: "241" }],
    events: [{ id: "event-1", description: "Away @ Home", sport: "FOOT", startTime: 1_789_318_800_000, status: "U", live: false, competitionId: "241", link: "/football/nfl/event-1", lastModified: 1_789_195_039_720,
      competitors: [{ id: "home", name: "Home", home: true }, { id: "away", name: "Away", home: false }],
      displayGroups: [{ description: "Game Props", markets: [{ id: "market-1", description: "Odd/Even Total Points", key: "2W-OE", marketTypeId: "178", period: { description: "Game", abbreviation: "G", live: false }, outcomes: [{ id: "selection-1", description: "Even", status: "O", type: "EV", price: { id: "price-1", american: "+105", decimal: "2.050", fractional: "21/20" } }] }] }]
    }]
  }], "https://www.bovada.lv", "2026-09-12T00:00:00.000Z");
  assert.equal(records.length, 1);
  assert.deepEqual(records[0], {
    sportsbook: "bovada", sport: "FOOT", competition: "NFL", eventName: "Away @ Home", participants: ["Home", "Away"],
    homeParticipant: "Home", awayParticipant: "Away", eventStartTime: "2026-09-13T17:00:00.000Z", eventStatus: "prematch", phase: null,
    market: "Odd/Even Total Points", marketPeriod: "Game", selection: "Even", line: null, decimalOdds: 2.05, rawOdds: "+105", rawOddsFormat: "american",
    sourceEventId: "event-1", sourceMarketId: "market-1", sourceSelectionId: "selection-1", sourceUrl: "https://www.bovada.lv/football/nfl/event-1",
    providerTimestamp: "2026-09-12T06:37:19.720Z", participantPlayer: null, qualifiers: { marketKey: "2W-OE", marketTypeId: "178", displayGroup: "Game Props" }
  });
});

test("Bovada parser does not invent odds or live state when source fields are absent", () => {
  const [record] = parseCoupon([{ path: [], events: [{ id: "event-2", description: "Unknown", sport: "FOOT", status: "X", live: false, displayGroups: [{ markets: [{ outcomes: [{ id: "s-2", description: "Unknown" }] }] }] }] }], "https://www.bovada.lv", "2026-09-12T00:00:00.000Z");
  assert.equal(record?.decimalOdds, null);
  assert.equal(record?.rawOdds, null);
  assert.equal(record?.eventStatus, "unknown");
});
