import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { reconcileMatching } from "./service.js";

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL or SUPABASE_DB_URL must be set");
  const full = process.argv.includes("--full");
  const idx = process.argv.indexOf("--iterations");
  const iterations = idx >= 0 ? Number(process.argv[idx + 1]) : 1;
  if (!Number.isSafeInteger(iterations) || iterations < 1 || iterations > 20) {
    throw new Error("--iterations must be 1..20");
  }
  const pool = new Pool({ connectionString: databaseUrl });
  const started = Date.now();
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (let i = 1; i <= iterations; i++) {
        await reconcileMatching(client, { full });
        if (iterations > 1) {
          const em = await client.query(`SELECT status, count(*)::int AS n FROM event_matches GROUP BY status ORDER BY status`);
          const ce = await client.query(`SELECT count(*)::int AS n FROM canonical_events`);
          const mm = await client.query(`SELECT count(*)::int AS n FROM market_matches WHERE status='MATCHED'`);
          const sm = await client.query(`SELECT count(*)::int AS n FROM selection_matches WHERE status='MATCHED'`);
          console.log(`Iteration ${i}: event=[${em.rows.map((row) => `${row.status}=${row.n}`).join(",")}] canonical_events=${ce.rows[0].n} market_matched=${mm.rows[0].n} selection_matched=${sm.rows[0].n}`);
        }
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    const elapsed = Date.now() - started;
    console.log(`Matching completed in ${elapsed} ms (full=${full})`);
    for (const [label, sql] of [
      ["event_matches", "SELECT status, count(*)::int AS n FROM event_matches GROUP BY status ORDER BY status"],
      ["market_matches", "SELECT status, count(*)::int AS n FROM market_matches GROUP BY status ORDER BY status"],
      ["selection_matches", "SELECT status, count(*)::int AS n FROM selection_matches GROUP BY status ORDER BY status"],
      ["canonical_events", "SELECT count(*)::int AS n FROM canonical_events"],
      ["canonical_markets", "SELECT count(*)::int AS n FROM canonical_markets"],
      ["canonical_selections", "SELECT count(*)::int AS n FROM canonical_selections"],
    ] as const) {
      const result = await pool.query(sql);
      if (label === "canonical_events" || label === "canonical_markets" || label === "canonical_selections") {
        console.log(`${label}: ${result.rows[0]?.n ?? 0}`);
      } else {
        for (const row of result.rows) console.log(`${label} ${row.status}: ${row.n}`);
      }
    }
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
