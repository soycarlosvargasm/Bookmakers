import test from "node:test";
import assert from "node:assert/strict";
import { adapterKeyForDomain, catalogMetrics, loadSourceCatalog } from "../src/sources/registry.js";

test("master source catalogue preserves every supplied URL relation", async () => {
  const rows = await loadSourceCatalog();
  assert.deepEqual(catalogMetrics(rows), { rows: 306, urls: 269, domains: 36, sports: 88 });
  assert.equal(rows.filter((row) => row.url === "https://stake.com/sports/mma").length, 6);
  assert.equal(new Set(rows.filter((row) => row.url === "https://stake.com/sports/mma").map((row) => row.sport)).size, 6);
  assert.equal(adapterKeyForDomain("www.actionnetwork.com"), "actionnetwork-com");
});
