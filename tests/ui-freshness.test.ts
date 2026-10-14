import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import Fastify from "fastify";
import type { Pool } from "pg";
import { registerCatalogRoutes } from "../src/ui/catalog.js";

type Brand = { id: string; region: { status: string; latestRun?: { at: string; records: number; inProgress?: boolean } } };
type Country = { code: string; brands: Brand[] };
type View = Country & { status: string; color: string; age: string; withData: number; brands: Array<Brand & { displayStatus: string }> };
type Freshness = {
  countryView: (country: Country, filter: string, now: number) => View;
  age: (value: string | null, now: number) => string;
  dataRange: (filter: string, now: number) => { since?: string; until?: string; observedSince?: string; mode?: string; includeUndated?: string };
};
const window = {} as { collectorFreshness: Freshness };
runInNewContext(readFileSync("public/ui/freshness.js", "utf8"), { window });
const freshness = window.collectorFreshness;
const now = Date.parse("2026-10-05T12:00:00Z");
const brand = (id: string, at: string, status = "ok", records = 10): Brand => ({ id, region: { status, latestRun: { at, records } } });

test("old successful runs no longer make a country OK and remain visible as antiguo", () => {
  const country = { code: "ke", brands: [brand("1xbet", "2026-10-01T12:00:00Z")] };
  const filtered = freshness.countryView(country, "24h", now);
  assert.equal(filtered.status, "SIN DATOS RECIENTES");
  assert.equal(filtered.color, "muted");
  assert.equal(filtered.age, "hace 4 d");
  assert.equal(filtered.withData, 0);
  assert.equal(filtered.brands[0]!.displayStatus, "old");
  const all = freshness.countryView(country, "all", now);
  assert.equal(all.status, "OK");
  assert.equal(all.withData, 1);
  assert.equal(all.brands[0]!.displayStatus, "ok");
  assert.equal(country.brands[0]!.region.status, "ok");
});

test("country aggregation uses only recent runs and the age uses the latest run of any brand", () => {
  const country = { code: "mx", brands: [brand("fresh", "2026-10-05T10:00:00Z"), brand("old-failed", "2026-10-01T10:00:00Z", "failed", 0)] };
  assert.equal(freshness.countryView(country, "24h", now).status, "OK");
  assert.equal(freshness.countryView(country, "24h", now).age, "hace 2 h");
  assert.equal(freshness.countryView(country, "7d", now).status, "PARCIAL");
  assert.equal(freshness.countryView(country, "1h", now).status, "SIN DATOS RECIENTES");
  country.brands.push(brand("recent-failed", "2026-10-05T11:30:00Z", "failed", 0));
  assert.equal(freshness.countryView(country, "24h", now).status, "PARCIAL");
  assert.equal(freshness.countryView(country, "1h", now).status, "FALLÓ");
  assert.equal(freshness.countryView(country, "24h", now).age, "hace 30 min");
});

test("freshness includes the boundary and expires without a new run; missing dates never invent freshness", () => {
  const country = { code: "ng", brands: [brand("boundary", "2026-10-04T12:00:00Z")] };
  assert.equal(freshness.countryView(country, "24h", now).status, "OK");
  assert.equal(freshness.countryView(country, "24h", now + 1).status, "SIN DATOS RECIENTES");
  assert.equal(freshness.countryView({ code: "in", brands: [{ id: "none", region: { status: "unverified" } }] }, "24h", now).status, "SIN DATOS");
  assert.equal(freshness.age(null, now), "");
  assert.equal(freshness.age("bad-date", now), "");
});

test("Data defaults to quotes captured within 15 minutes; history and unverified schedules are explicit", () => {
  const range = freshness.dataRange("upcoming7d", now);
  assert.equal(range.mode, "live");
  assert.equal(range.since, undefined);
  assert.equal(range.observedSince, "2026-10-05T11:45:00.000Z");
  assert.equal(range.until, "2026-10-12T12:00:00.000Z");
  assert.equal(freshness.dataRange("1h", now).observedSince, "2026-10-05T11:00:00.000Z");
  assert.equal(freshness.dataRange("24h", now).observedSince, "2026-10-04T12:00:00.000Z");
  assert.equal(freshness.dataRange("7d", now).observedSince, "2026-09-28T12:00:00.000Z");
  assert.equal(freshness.dataRange("all", now).mode, "history");
  assert.equal(freshness.dataRange("undated", now).includeUndated, "true");
});

test("all three catalog levels apply optional parameterized event date bounds and reject bad dates", async () => {
  const app = Fastify();
  const queries: Array<{ sql: string; values: string[] }> = [];
  const pool = { query: async (sql: string, values: string[]) => { queries.push({ sql, values }); return { rows: [] }; } } as unknown as Pool;
  registerCatalogRoutes(app, pool);
  try {
    for (const [path, params, base] of [
      ["sports", {}, []],
      ["competitions", { sport: "Football" }, ["Football"]],
      ["events", { sport: "Football", competition: "Liga MX" }, ["Football", "Liga MX"]]
    ] as const) {
      const all = await app.inject({ url: `/api/data/${path}?${new URLSearchParams({...params, mode: "history"})}` });
      assert.equal(all.statusCode, 200);
      const unrestricted = queries.at(-1)!;
      assert.doesNotMatch(unrestricted.sql, /event_start_time\s*[<>]=?/);
      assert.deepEqual(unrestricted.values, base);
      const since = await app.inject({ url: `/api/data/${path}?${new URLSearchParams({ ...params, mode: "history", since: "2026-10-05" })}` });
      assert.equal(since.statusCode, 200);
      const filtered = queries.at(-1)!;
      assert.match(filtered.sql, new RegExp(`event_start_time >= \\$${base.length + 1}::timestamptz`));
      assert.deepEqual(filtered.values, [...base, "2026-10-05"]);
      const upcoming = await app.inject({ url: `/api/data/${path}?${new URLSearchParams({ ...params, mode: "history", since: "2026-10-05T12:00:00Z", until: "2026-10-12T12:00:00Z" })}` });
      assert.equal(upcoming.statusCode, 200);
      assert.match(queries.at(-1)!.sql, new RegExp(`event_start_time < \\$${base.length + 2}::timestamptz`));
      assert.deepEqual(queries.at(-1)!.values, [...base, "2026-10-05T12:00:00Z", "2026-10-12T12:00:00Z"]);
      const beforeInvalid = queries.length;
      assert.equal((await app.inject({ url: `/api/data/${path}?${new URLSearchParams({ ...params, mode: "history", since: "not-a-date" })}` })).statusCode, 400);
      assert.equal((await app.inject({ url: `/api/data/${path}?${new URLSearchParams({ ...params, mode: "history", since: "2026-10-12", until: "2026-10-05" })}` })).statusCode, 400);
      assert.equal(queries.length, beforeInvalid);
    }
  } finally { await app.close(); }
});
