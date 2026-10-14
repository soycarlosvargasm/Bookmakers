import { usableRecord } from "../validation/records.js";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import type { NormalizedRecord } from "../normalization/types.js";
import { saveRecordBatch } from "../storage/batch.js";
import { extractSnapshotRecords, readRawSnapshot, UnsupportedSnapshotError } from "./reader.js";

const DEFAULT_ROOT = ".engine";

export async function listSnapshots(root: string): Promise<string[]> {
  const dir = join(root, "raw");
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter(entry => entry.isFile() && entry.name.endsWith(".json") && !entry.name.includes("-failure"))
    .map(entry => join(dir, entry.name)).sort();
}

export async function persistRecords(pool: Pool, records: NormalizedRecord[], sha256: string, file: string, sourceType: string): Promise<boolean> {
  const valid = records.filter(record => record.sportsbook && record.sourceEventId && usableRecord(record));
  if (!valid.length) return false;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 1))", [sha256]);
    const prior = await client.query("SELECT 1 FROM snapshot_loads WHERE sha256=$1", [sha256]);
    if (prior.rowCount) { await client.query("COMMIT"); return false; }
    for (const source of [...new Set(valid.map(record => record.sportsbook!))].sort()) {
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [source]);
    }
    await saveRecordBatch(client, valid);
    await client.query("INSERT INTO snapshot_loads(sha256,file_name,source_type,records_submitted) VALUES($1,$2,$3,$4)", [sha256, basename(file), sourceType, valid.length]);
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function loadSnapshotFile(pool: Pool, file: string): Promise<{ status: "loaded" | "already-loaded" | "empty" | "archived"; source: string; records: number }> {
  const bytes = await readFile(file);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const snapshot = JSON.parse(bytes.toString("utf8")) as Awaited<ReturnType<typeof readRawSnapshot>>;
  const payload = snapshot.evidence?.payload as Record<string, unknown> | undefined;
  if (payload?.verificationFixture === true || payload?.liveSportsbook === false || ['local-fixture','fixture-only'].includes(snapshot.evidence?.transport)) throw new UnsupportedSnapshotError("Verification fixtures are excluded from the live catalog");
  const capturedAt=snapshot.evidence?.capturedAt??snapshot.retrievedAt;
  // Archive evidence even without parsed odds, or when its normalized rows
  // were imported before the complete capture archive existed.
  await pool.query(`INSERT INTO collector_captures(sha256,file_name,source_type,source_url,method,captured_at,record_count,snapshot)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb) ON CONFLICT(sha256) DO NOTHING`,
    [sha256,basename(file),snapshot.source?.type||'unknown',snapshot.evidence?.url??snapshot.source?.url??null,snapshot.method??null,
      capturedAt&&Number.isFinite(Date.parse(capturedAt))?capturedAt:null,Number.isSafeInteger(snapshot.recordCount)&&snapshot.recordCount>=0?snapshot.recordCount:0,bytes.toString('utf8')]);
  if ((await pool.query("SELECT 1 FROM snapshot_loads WHERE sha256=$1", [sha256])).rowCount)
    return { status: "already-loaded", source: snapshot.source.type, records: 0 };
  const records = extractSnapshotRecords(snapshot);
  if (!records.length) return { status: "empty", source: snapshot.source.type, records: 0 };
  // Validated rows without a provider event id stay in the complete archive (and in the day
  // export) but cannot join the normalized event/market tables; say so instead of claiming a load.
  if (!records.some(record => record.sportsbook && record.sourceEventId)) return { status: "archived", source: snapshot.source.type, records: records.length };
  const loaded = await persistRecords(pool, records, sha256, file, snapshot.source.type);
  return { status: loaded ? "loaded" : "already-loaded", source: snapshot.source.type, records: loaded ? records.length : 0 };
}

async function main(): Promise<void> {
  const databaseUrl = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL or SUPABASE_DB_URL must be set");
  const root = process.env.SNAPSHOT_ROOT ?? DEFAULT_ROOT;
  const pool = new Pool({ connectionString: databaseUrl });
  let processed = 0, submitted = 0, skipped = 0, alreadyLoaded = 0, archived = 0, failed = 0;
  const perSource = new Map<string, { files: number; records: number }>();

  try {
    const files = await listSnapshots(root);
    console.log(`Snapshots found: ${files.length}`);
    for (const file of files) {
      try {
        const result=await loadSnapshotFile(pool,file);
        if(result.status==='empty'){skipped++;continue;}
        if(result.status==='already-loaded'){alreadyLoaded++;continue;}
        if(result.status==='archived'){archived++;continue;}
        processed++;
        submitted += result.records;
        const key = result.source;
        const previous = perSource.get(key) ?? { files: 0, records: 0 };
        perSource.set(key, { files: previous.files + 1, records: previous.records + result.records });
      } catch (error) {
        if (error instanceof UnsupportedSnapshotError) { skipped++; continue; }
        failed++;
        console.error(`FAILED ${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    console.log(`Processed files: ${processed}`);
    console.log(`Records submitted: ${submitted}`);
    console.log(`Skipped (unsupported or empty): ${skipped}`);
    console.log(`Already loaded: ${alreadyLoaded}`);
    console.log(`Archived only (no provider event ids): ${archived}`);
    console.log(`Failed: ${failed}`);
    for (const [key, value] of [...perSource].sort()) console.log(`  ${key}: ${value.files} files, ${value.records} records`);
    process.exitCode = failed ? 1 : 0;
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
