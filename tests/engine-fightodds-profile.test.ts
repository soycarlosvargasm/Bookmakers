import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";
import { detectPageChallenge } from "../src/engine/challenge.js";
import { extractFightOddsDom } from "../src/profiles/fightodds.js";
import type { DomNode } from "../src/dom/extractor.js";

const node = (tag: string, text = "", children: DomNode[] = [], attrs: Record<string, string> = {}): DomNode => ({ tag, text, children, attrs, path: "body" });
const root = (headers: string[], prices: string[][]): DomNode => node("body", "", [node("div", "", [
  node("a", "UFC Event September 26 2", [node("p", "UFC Event September 26", [node("span", "September 26")])], { href: "/odds/9721/ufc-event" }),
  node("table", "", [node("thead", "", [node("tr", "", headers.map(text => node("th", text)))]),
    node("tbody", "", prices.map((row, index) => node("tr", "", [
      node("td", "", [node("a", index % 2 ? "Raoni Barcelos" : "Raul Rosas Jr.", [], { href: `/fighters/fighter-${index % 2 ? 5848 : 48126}` })]),
      ...row.map(text => node("td", text))
    ])))])
])]);

test("FightOdds binds separate fighter rows to bookmaker columns and preserves equal prices across books", () => {
  const records = extractFightOddsDom(root(["Fighters", "BetOnline", "Bovada", ""], [["-150", "-150", "131"], ["+130", "+130", "90"]]), { sportsbook: "fightodds", sourceUrl: "https://fightodds.io/odds" });
  assert.equal(records.length, 4);
  assert.deepEqual(new Set(records.map(r => r.bookmaker)), new Set(["betonline", "bovada"]));
  assert.ok(records.every(r => r.competition === "UFC Event" && r.rawOddsFormat === "american" && r.sportsbook === "fightodds"));
  assert.equal(records[0]!.sourceEventId, "9721:fighters:48126:5848");
  assert.equal(records[0]!.decimalOdds, 1 + 100 / 150);
});

test("FightOdds leaves empty quotes empty, retains decimal format and deduplicates repeated table rows", () => {
  const records = extractFightOddsDom(root(["Fighters", "BetOnline", "Bovada"], [["", "1.8"], ["+130", ""], ["", "1.8"], ["+130", ""]]), { sportsbook: "fightodds", sourceUrl: "https://fightodds.io/odds" });
  assert.equal(records.length, 2);
  assert.equal(records[0]!.bookmaker, "bovada");
  assert.equal(records[0]!.rawOddsFormat, "decimal");
  assert.equal(records[1]!.selection, "Raoni Barcelos");
});

test("hidden reCAPTCHA support frames do not pause a board; visible challenge frames still do", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route("https://www.google.com/recaptcha/**", route => route.fulfill({ contentType: "text/html", body: "<html><body>Frame</body></html>" }));
    await page.setContent('<p>Odds board</p><iframe src="https://www.google.com/recaptcha/api2/aframe" style="display:none;width:0;height:0"></iframe>');
    assert.equal(await detectPageChallenge(page), null);
    await page.locator("iframe").evaluate(element => { element.style.display = "block"; element.style.width = "300px"; element.style.height = "150px"; });
    assert.equal((await detectPageChallenge(page))?.reason, "Challenge iframe");
  } finally { await browser.close(); }
});
