import { readdir, readFile } from "node:fs/promises";
import { Pool } from "pg";

const migrationDirectory = new URL("../migrations/", import.meta.url);
const names = (await readdir(migrationDirectory)).filter((name) => name.endsWith(".sql")).sort();
if (names.length === 0) throw new Error("No SQL migrations found");

const migrations = [];
for (const name of names) {
  const sql = await readFile(new URL(name, migrationDirectory), "utf8");
  if (!/^\s*(CREATE|ALTER|DROP)\s+/m.test(sql)) throw new Error(`Migration has no schema statement: ${name}`);
  migrations.push({ name, sql });
}

const databaseUrl = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  for (const migration of migrations) console.log(`validated ${migration.name}`);
  console.log(`validated ${migrations.length} migration(s); DATABASE_URL not set, database apply skipped`);
  process.exit(0);
}

const pool = new Pool({ connectionString: databaseUrl });
try {
  await pool.query("CREATE TABLE IF NOT EXISTS _collector_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())");
  for (const migration of migrations) {
    const existing = await pool.query("SELECT 1 FROM _collector_migrations WHERE name = $1", [migration.name]);
    if (existing.rowCount) {
      console.log(`already applied ${migration.name}`);
      continue;
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(migration.sql);
      await client.query("INSERT INTO _collector_migrations (name) VALUES ($1)", [migration.name]);
      await client.query("COMMIT");
      console.log(`applied ${migration.name}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
} finally {
  await pool.end();
}
