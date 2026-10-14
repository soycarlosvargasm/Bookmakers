#!/usr/bin/env node
// Recover real captures left in temporary workbench directories into the permanent data root.
// Copies (never moves) RAW JSON + text + images + receipts + run files. Deduplicates by SHA256,
// excludes fixtures, backs up any existing file before replacing it, and writes a JSON report.
//   node scripts/recover-workbench-captures.mjs            → dry run (report only)
//   node scripts/recover-workbench-captures.mjs --apply    → copy into .engine
//   options: --target DIR (default .engine) · --source DIR (repeatable; default $TMPDIR/workbench-native-*) · --no-db
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

const args = process.argv.slice(2);
const apply = args.includes('--apply'), useDb = !args.includes('--no-db');
const option = (name) => args.flatMap((a, i) => a === name && args[i + 1] ? [args[i + 1]] : []);
const target = resolve(option('--target')[0] ?? '.engine');
const RAW_NAME = /-\d+-(http|network|dom|accessibility|visual)\.json$/;
const FIXTURE_TRANSPORTS = new Set(['local-fixture', 'fixture-only']);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

const sha = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');
const listDir = async (path) => { try { return await readdir(path); } catch (error) { if (error.code === 'ENOENT') return []; throw error; } };
const isFixture = (snapshot) => { const payload = snapshot?.evidence?.payload; return payload?.verificationFixture === true || payload?.liveSportsbook === false || FIXTURE_TRANSPORTS.has(snapshot?.evidence?.transport); };
// Local or test hosts are harness artefacts, not sportsbooks; they stay on disk but never enter the permanent root.
const localSource = (source) => { try { const host = new URL(source?.url ?? '').hostname; return !host || ['localhost', '127.0.0.1', '[::1]'].includes(host) || host.endsWith('.test') || host.endsWith('.localhost'); } catch { return true; } };

let sources = option('--source').map(dir => resolve(dir));
if (!sources.length) {
  const tmp = tmpdir();
  sources = (await listDir(tmp)).filter(name => name.startsWith('workbench-native-')).map(name => join(tmp, name)).filter(dir => dir !== target);
}
console.log(`${apply ? 'APPLY' : 'DRY RUN'} → target ${target}`);
console.log(`Sources: ${sources.length ? sources.join('\n  ') : '(none found)'}`);

// Index the permanent root by content hash so identical captures are never duplicated.
const targetRaw = join(target, 'raw');
const targetIndex = new Map();
for (const name of (await listDir(targetRaw)).filter(name => RAW_NAME.test(name))) targetIndex.set(await sha(join(targetRaw, name)), name);
console.log(`Permanent RAW captures indexed: ${targetIndex.size}`);

let archived = new Set();
let dbError = null;
if (useDb) {
  try {
    if (!process.env.DATABASE_URL && existsSync('.env.local')) process.loadEnvFile('.env.local');
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 });
    try { archived = new Set((await pool.query('SELECT sha256 FROM collector_captures')).rows.map(r => r.sha256)); }
    finally { await pool.end(); }
  } catch (error) { dbError = error.message; }
  console.log(dbError ? `PostgreSQL archive unavailable: ${dbError}` : `PostgreSQL archive captures: ${archived.size}`);
}

const report = { ranAt: new Date().toISOString(), mode: apply ? 'apply' : 'dry-run', target, sources, dbError, backupFolder: null, totals: { scanned: 0, fixtures: 0, localHosts: 0, unreadable: 0, alreadyPresent: 0, recovered: 0, replacedWithBackup: 0, artifacts: 0, receipts: 0, runs: 0, checkpoints: 0 }, captures: [] };
const backupFolder = join(target, 'backups', `recovery-${stamp}`);
const copyPreserving = async (from, to) => { await mkdir(resolve(to, '..'), { recursive: true }); await copyFile(from, to); const meta = await stat(from); await utimes(to, meta.atime, meta.mtime); };
const copyIfAbsent = async (from, to) => { if (existsSync(to)) return false; if (apply) await copyPreserving(from, to); return true; };

for (const dir of sources) {
  const rawDir = join(dir, 'raw');
  const names = (await listDir(rawDir)).filter(name => RAW_NAME.test(name)).sort();
  for (const name of names) {
    report.totals.scanned++;
    const id = basename(name, '.json'), path = join(rawDir, name);
    const entry = { sourceDir: dir, file: name, id, sha256: null, source: null, recordCount: null, capturedAt: null, decision: null, artifacts: [], notes: [] };
    report.captures.push(entry);
    let snapshot;
    try { snapshot = JSON.parse(await readFile(path, 'utf8')); } catch (error) { entry.decision = 'unreadable'; entry.notes.push(error.message); report.totals.unreadable++; continue; }
    entry.sha256 = await sha(path); entry.source = snapshot.source?.type ?? null; entry.recordCount = snapshot.recordCount ?? null; entry.capturedAt = snapshot.evidence?.capturedAt ?? snapshot.retrievedAt ?? null;
    entry.inArchive = archived.has(entry.sha256);
    if (isFixture(snapshot)) { entry.decision = 'fixture-excluded'; report.totals.fixtures++; continue; }
    if (localSource(snapshot.source)) { entry.decision = 'local-host-excluded'; report.totals.localHosts++; continue; }
    if (targetIndex.has(entry.sha256)) { entry.decision = 'already-present'; entry.notes.push(`same content as ${targetIndex.get(entry.sha256)}`); report.totals.alreadyPresent++; continue; }
    const destination = join(targetRaw, name);
    if (existsSync(destination)) {
      // Same name, different bytes: both are real evidence. Keep the old one in a backup, then write the recovered one.
      entry.notes.push('name collision with different content; existing file backed up');
      if (apply) { await copyPreserving(destination, join(backupFolder, 'raw', name)); report.backupFolder = backupFolder; }
      report.totals.replacedWithBackup++;
    }
    if (apply) await copyPreserving(path, destination);
    targetIndex.set(entry.sha256, name);
    entry.decision = 'recovered'; report.totals.recovered++;
    // Companion evidence: copied text, screenshots and tiles share the capture id.
    for (const artifact of (await listDir(rawDir)).filter(other => other !== name && (other === `${id}.txt` || other === `${id}.png` || (other.startsWith(`${id}-tile-`) && other.endsWith('.png'))))) {
      if (await copyIfAbsent(join(rawDir, artifact), join(targetRaw, artifact))) { entry.artifacts.push(artifact); report.totals.artifacts++; }
    }
    const receipt = join(dir, 'collection', 'receipts', `${id}.json`);
    if (existsSync(receipt) && await copyIfAbsent(receipt, join(target, 'collection', 'receipts', `${id}.json`))) { entry.artifacts.push(`receipt:${id}.json`); report.totals.receipts++; }
  }
  // Recoverable progress: UI run history and traversal checkpoints of real sources that the permanent root does not have yet.
  const realSource = async (path) => { try { const value = JSON.parse(await readFile(path, 'utf8')); return !localSource(value.source) && !(value.source?.type ?? '').startsWith('fixture'); } catch { return false; } };
  for (const run of (await listDir(join(dir, 'ui', 'runs'))).filter(name => name.endsWith('.json'))) if (await realSource(join(dir, 'ui', 'runs', run)) && await copyIfAbsent(join(dir, 'ui', 'runs', run), join(target, 'ui', 'runs', run))) report.totals.runs++;
  for (const checkpoint of (await listDir(join(dir, 'collection', 'checkpoints'))).filter(name => name.endsWith('.json'))) if (await realSource(join(dir, 'collection', 'checkpoints', checkpoint)) && await copyIfAbsent(join(dir, 'collection', 'checkpoints', checkpoint), join(target, 'collection', 'checkpoints', checkpoint))) report.totals.checkpoints++;
}

await mkdir('.audit', { recursive: true });
const reportPath = join('.audit', `recovery-${apply ? 'apply' : 'dry-run'}-${stamp}.json`);
await writeFile(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.totals, null, 2));
console.log(`Report: ${reportPath}`);
for (const capture of report.captures.filter(c => c.decision === 'recovered')) console.log(`  ${capture.decision} ${capture.source} ${capture.recordCount} records ${capture.capturedAt} ${capture.file}${capture.artifacts.length ? ` (+${capture.artifacts.length} artifacts)` : ''}`);
if (!apply) console.log('Nothing was copied. Re-run with --apply to recover into the permanent root.');
