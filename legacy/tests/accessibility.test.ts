import assert from "node:assert/strict";
import { test } from "node:test";
import { extractAccessibility, type AxNode } from "../src/accessibility/extractor.js";
import { classifyAccessibility } from "../src/accessibility/discovery.js";
import { sanitizeRawPayload } from "../src/collectors/raw-policy.js";

const node = (id: string, role: string, name: string, parentId?: string, childIds: string[] = []): AxNode => ({ id, role, name, parentId, childIds, ignored: false });
const input = { sourceUrl: "https://example.test/odds", sportsbook: "accessibility:example.test", sport: "football" };

test("accepts a named outcome control with explicit event and market ancestors", () => {
  const nodes = [node("event", "group", "Tigers vs Lions", undefined, ["market"]), node("market", "group", "Match Winner", "event", ["a", "b"]), node("a", "button", "Tigers 1.85", "market"), node("b", "button", "Lions +150", "market")];
  const result = extractAccessibility(nodes, input);
  assert.equal(result.records.length, 2);
  assert.deepEqual(result.records.map((record) => record.selection), ["Tigers", "Lions"]);
  assert.equal(classifyAccessibility(nodes, result, true), "ACCESSIBILITY_RECOVERED");
});

test("rejects ordered table prices lacking explicit selection association", () => {
  const nodes = [node("row", "row", "", undefined, ["teams", "price"]), node("teams", "cell", "Tigers Lions Draw", "row"), node("price", "cell", "+120 +210 +250", "row")];
  assert.equal(extractAccessibility(nodes, input).records.length, 0);
});

test("rejects illustrative prices and keeps bounded auditable RAW", () => {
  const nodes = [node("example", "group", "Sample markets", undefined, ["event"]), node("event", "group", "Tigers vs Lions", "example", ["market"]), node("market", "group", "Match Winner", "event", ["price"]), node("price", "button", "Tigers 5/2", "market")];
  assert.equal(extractAccessibility(nodes, input).records.length, 0);
  assert.equal(classifyAccessibility([node("heading", "heading", "Live Odds"), node("note", "StaticText", "Odds shown are illustrative"), node("price", "cell", "1.72")], { ...extractAccessibility([], input), oddsCandidates: 1 }, true), "NO_ACCESSIBILITY_MARKETS");
  const raw = sanitizeRawPayload({ sportsbook: input.sportsbook, accountAlias: "accessibility", sourceType: "accessibility-extraction", sourceUrl: input.sourceUrl, parserVersion: "accessibility-v1", rawPayload: { status: "NO_ACCESSIBILITY_MARKETS", sourceUrl: input.sourceUrl, treeHash: "abc", nodeCount: 3, evidence: [{ role: "button", name: "Tigers 5/2", path: "group/group/button", reason: "odds candidate" }] } });
  assert.equal((raw.rawPayload as { capturePolicy: string }).capturePolicy, "accessibility-evidence-v1");
});
