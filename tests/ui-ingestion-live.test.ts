import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import Fastify from 'fastify';
import { EngineStorage } from '../src/engine/storage.js';
import { SnapshotIngestion } from '../src/ui/ingestion.js';
import { registerCatalogRoutes } from '../src/ui/catalog.js';
import type { ProviderRecord } from '../src/normalization/types.js';

const url = process.env.TEST_DATABASE_URL;
test('automatic RAW ingestion survives a database outage, is idempotent, and Data excludes expired events and stale quotes', { skip: !url, timeout: 30000 }, async () => {
  const pool = new Pool({connectionString: url}), root = await mkdtemp(join(tmpdir(), 'collector-ingestion-test-'));
  const source = {url: 'https://controlled-fixture.example/sports', type: `test-ingestion-${randomUUID()}`};
  const storage = new EngineStorage(root), notifications: number[] = [];
  const now = Date.now(), fresh = new Date(now).toISOString(), stale = new Date(now - 86400000 * 30).toISOString();
  const rows: ProviderRecord[] = ['upcoming','past','closed','stale','live','undated','suspended'].map(kind => ({
    sportsbook: source.type, sport: source.type, competition: 'Controlled league', eventName: `${kind} Alpha vs Beta`, sourceEventId: kind, market: 'Moneyline', sourceMarketId: 'winner', selection: 'Alpha', sourceSelectionId: kind,
    rawOdds: '1.85', decimalOdds: 1.85, eventStartTime: kind === 'undated' ? null : new Date(now + (['past','live'].includes(kind) ? -3600000 : 86400000)).toISOString(),
    eventStatus: kind === 'closed' ? 'closed' : kind === 'live' ? 'live' : 'prematch', selectionStatus: kind === 'suspended' ? 'suspended' : 'prematch', collectedAt: kind === 'stale' ? stale : fresh,
  }));
  await storage.saveRaw(source, 'visual', {url: source.url, transport: 'controlled-fixture', capturedAt: fresh, payload: {records: rows}}, rows.length);
  await storage.saveRaw(source, 'visual', {url: source.url, transport: 'controlled-fixture', capturedAt: fresh, payload: {records: [{...rows[0],sourceEventId:'excluded-fixture'}],verificationFixture: true,liveSportsbook:false}}, 1);
  let offline = true;
  const proxy = new Proxy(pool, {get(target, key) {
    if (key === 'query') return (...args: unknown[]) => { if (offline) return Promise.reject(Object.assign(new Error('Controlled database outage'),{code:'ECONNREFUSED'})); return (target.query as Function).apply(target,args); };
    const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
  }});
  const ingest = new SnapshotIngestion(proxy, root, () => {}, (_source, records) => notifications.push(records), 60000);
  const app = Fastify(); registerCatalogRoutes(app, pool);
  try {
    await ingest.sync(); assert.deepEqual(notifications, []);
    offline = false; await ingest.sync(); await ingest.sync();
    assert.deepEqual(notifications, [7]);
    const archive=await pool.query('SELECT snapshot FROM collector_captures WHERE source_type=$1',[source.type]);
    assert.equal(archive.rowCount,1,'the verification fixture is never archived as real data');
    assert.deepEqual(archive.rows[0].snapshot.evidence.payload.records,rows);
    const count = await pool.query('SELECT count(*)::int n FROM events e JOIN sportsbooks b ON b.id=e.sportsbook_id WHERE b.key=$1',[source.type]); assert.equal(count.rows[0].n,7);
    const query = new URLSearchParams({sport:source.type,competition:'Controlled league'});
    const current = await app.inject({url:`/api/data/events?${query}`}); assert.equal(current.statusCode,200);
    assert.deepEqual(current.json().map((r: {event_name: string}) => r.event_name).sort(),['live Alpha vs Beta','upcoming Alpha vs Beta']);
    const detail = await app.inject({url:`/api/data/event/${current.json()[0].id}`}); assert.equal(detail.statusCode,200); assert.equal(detail.json().length,1); assert.ok(detail.json()[0].captured_at);
    const unverified = await app.inject({url:`/api/data/events?${query}&includeUndated=true`}); assert.equal(unverified.json().length,3);
    const history = await app.inject({url:`/api/data/events?${query}&mode=history`}); assert.equal(history.json().length,7);
    // An unchanged price observed again must refresh last_seen_at without duplicating price history.
    const unchanged = {...rows.find(r=>r.sourceEventId==='stale')!,collectedAt:new Date().toISOString()};
    await storage.saveRaw(source, 'network', {url:source.url,transport:'controlled-fixture',capturedAt:new Date().toISOString(),payload:{records:[unchanged]}},1);
    await ingest.sync(); assert.deepEqual(notifications,[7,1]);
    const after = await app.inject({url:`/api/data/events?${query}`}); assert.equal(after.json().length,3);
    const observations = await pool.query('SELECT count(*)::int n FROM odds_observations o JOIN selections s ON s.id=o.selection_id JOIN markets m ON m.id=s.market_id JOIN events e ON e.id=m.event_id JOIN sportsbooks b ON b.id=e.sportsbook_id WHERE b.key=$1 AND e.source_event_id=$2',[source.type,'stale']); assert.equal(observations.rows[0].n,1);
    const text='Alpha vs Beta → Alpha +180 / Empate 2.80 / Beta 9/5';
    await storage.saveRaw(source,'dom',{url:source.url,transport:'dom-visible-text',capturedAt:fresh,payload:{records:[],copiedText:text}},0);
    await ingest.sync();await ingest.sync();
    const textArchive=await pool.query("SELECT snapshot->'evidence'->'payload'->>'copiedText' AS text FROM collector_captures WHERE source_type=$1 AND record_count=0",[source.type]);
    assert.deepEqual(textArchive.rows,[{text}],'unparsed text is saved in PostgreSQL once');
  } finally { await ingest.close(); await app.close(); await pool.end(); await rm(root,{recursive:true,force:true}); }
});
