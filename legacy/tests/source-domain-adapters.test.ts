import test from "node:test";
import assert from "node:assert/strict";
import { parseBouts } from "../src/connectors/muaythai2000/connector.js";
import { parseMarathonEvents } from "../src/connectors/marathonbet/connector.js";
import { flightValues } from "../src/connectors/racehub/connector.js";
import { parseEsportsInsiderBookQuotes, parseEsportsInsiderMatches } from "../src/connectors/esportsinsider/connector.js";

test("MuayThai2000 parser converts the latest visible corner quote without inventing the other side", () => {
  const html = `Tonight's Odds <h3>Palangmai</h3><i class="fa-map-marker-alt"></i> Rajadamnern <i class="fa-clock"></i> 18:00 PM
    <span class="font-bold text-gray-400">Bout 1</span><i class="fa-balance-scale"></i> 116 lbs
    <span class="text-red-500 font-bold truncate">Red Fighter</span><span class="text-blue-500 font-bold truncate text-right">Blue Fighter</span>
    <span class="inline-flex">Blue เสมอ</span><span class="inline-flex">Blue 10/9</span>
    <a href="?date=2026-09-22">View</a><!-- RIGHT SIDEBAR -->`;
  assert.deepEqual(parseBouts(html), [{ card: "Palangmai", venue: "Rajadamnern", time: "18:00 PM", date: "2026-09-22", order: 1, weight: "116 lbs", red: "Red Fighter", blue: "Blue Fighter", priceSide: "Blue", price: "10/9" }]);
});

test("Marathonbet parser preserves event, market, selection, line, decimal price and provider ids", () => {
  const html = `<div class="foot-market" data-sport-type="Tennis"><div class="coupon-row" data-event-eventId="42" data-event-treeId="84" data-event-name="A vs B" data-live="true">
    <td class="price height-column-with-price" data-coeff-uuid="quote-1" data-market-type="HANDICAP"><span class="left-simple">A</span><span class="middle-simple">(-1.5)</span><span data-selection-price="1.91" data-selection-key="42@handicap.home">1.91</span></td></div>`;
  assert.deepEqual(parseMarathonEvents(html), [{ id: "42", treeId: "84", name: "A vs B", sport: "Tennis", live: true, participants: ["A", "B"], selections: [{ id: "quote-1", market: "HANDICAP", name: "A", line: "-1.5", price: 1.91, key: "42@handicap.home" }] }]);
});

test("RaceHub flight decoder reads JSON records from Next.js hydration scripts", () => {
  const record = ["$", "component", null, { initial: { meetingId: "m1", race: { raceId: "r1", runners: [] } } }];
  const payload = `27:${JSON.stringify(record)}\n`;
  const html = `<script>self.__next_f.push(${JSON.stringify([1, payload])})</script>`;
  assert.deepEqual(flightValues(html), [record]);
});

test("EsportsInsider parser emits only visibly priced match-winner rows", () => {
  const html = `<a class="esi-row esi-mbrow" href="https://esportsinsider.com/betting-odds/r6/match/a-vs-b-42" data-esi-m="42">
    <span data-esi-live="when">Tomorrow 11:00</span>
    <span style="font:700 13px var(--esi-fb);color:var(--esi-ink,#19213D)">Team A</span>
    <span style="font:700 13px var(--esi-fb);color:var(--esi-ink,#19213D)">Team B</span>
    <span style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">R6 League</span>
    <span style="font:700 11px var(--esi-fh);color:var(--esi-ink-3,#6B6B6B)">BO3</span>
    <span class="esi-o--l best" data-odds="1.75">1.75</span><span class="esi-o--l" data-odds="2.10">2.10</span></a>`;
  assert.deepEqual(parseEsportsInsiderMatches(html), [{ id: "42", url: "https://esportsinsider.com/betting-odds/r6/match/a-vs-b-42", startLabel: "Tomorrow 11:00", teamOne: "Team A", teamTwo: "Team B", competition: "R6 League", seriesFormat: "BO3", oddsOne: 1.75, oddsTwo: 2.1 }]);
});

test("EsportsInsider match parser preserves the displayed bookmaker prices", () => {
  const html = `<div class="esi-row esi-bookrow"><span style="font:700 14px var(--esi-fb);color:var(--esi-ink,#19213D)">Stake</span><span data-odds="1.80">1.80</span><span data-odds="2.05">2.05</span></div>`;
  assert.deepEqual(parseEsportsInsiderBookQuotes(html), [{ bookmaker: "Stake", oddsOne: 1.8, oddsTwo: 2.05 }]);
});
