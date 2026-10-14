import test from "node:test";
import assert from "node:assert/strict";
import { analyzePage } from "../src/sources/ingestion.js";

test("source ingestion rejects an interstitial caution page as a transport block", () => {
  const result = analyzePage('<html><head><title>Caution</title></head><body><link href="https://cdn.truecybersecure.com/assets/landing.css">Caution</body></html>', "text/html", ["Fútbol"]);
  assert.equal(result.status, "BLOCKED");
  assert.match(result.reason ?? "", /access-control/i);
});
