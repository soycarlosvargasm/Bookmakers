import test from "node:test";
import assert from "node:assert/strict";
import { parseOneXBetPrices, parseOneXBetTrottingLinks } from "../src/connectors/onexbet/connector.js";

test("1xBet Kenya parser preserves public trotting event IDs, selections and decimal prices", () => {
  const links = parseOneXBetTrottingLinks('<a href="/en/line/trotting/1449995-australia-hobart/372339968-hobart">Hobart</a>');
  assert.deepEqual(links, [{ eventId: "372339968", url: "https://1xbet.co.ke/en/line/trotting/1449995-australia-hobart/372339968-hobart" }]);
  const prices = parseOneXBetPrices({ eventGroups: [{ groupId: 26, shortGroupId: 36, events: [[{ type: 2637, player: { id: 301546660, name: "№6 My Beautiful Life" }, cf: 1.8 }, { type: 2637, player: { id: 266305311, name: "Count Your Blessin" }, cfView: "4" }, { type: 2637, player: { id: 1, name: "SP runner" }, cfView: "SP" }]] }] });
  assert.deepEqual(prices, [{ groupId: 26, shortGroupId: 36, type: 2637, selectionId: "301546660", selection: "№6 My Beautiful Life", decimalOdds: 1.8 }, { groupId: 26, shortGroupId: 36, type: 2637, selectionId: "266305311", selection: "Count Your Blessin", decimalOdds: 4 }]);
});
