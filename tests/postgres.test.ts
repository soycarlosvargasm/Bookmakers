import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {PostgresStorage} from '../src/storage/postgres.js';
import {normalizeRecord} from '../src/normalization/normalize.js';
const url=process.env.TEST_DATABASE_URL;
test('PostgreSQL migrations, leases, batching, canonical entities and SQL pagination', {skip:!url},async()=>{
  const migrated=spawnSync(process.execPath,['scripts/migrate.mjs'],{env:{...process.env,DATABASE_URL:url},encoding:'utf8'});
  assert.equal(migrated.status,0,migrated.stderr);
  const db=new PostgresStorage(url!);const source='test-'+randomUUID();
  try{
    const now=new Date().toISOString();
    const run=await db.startCollectorRun({sportsbook:source,accountAlias:'test',mode:'events',startedAt:now,leaseOwner:'owner',leaseDurationMs:1000});
    await assert.rejects(db.startCollectorRun({sportsbook:source,accountAlias:'test',mode:'live',startedAt:now,leaseOwner:'other',leaseDurationMs:1000}),/duplicate key/);
    assert.equal(await db.heartbeatCollectorRun(run,'wrong',1000),false);
    assert.equal(await db.heartbeatCollectorRun(run,'owner',1000),true);
    await db.pool.query("UPDATE collector_runs SET lease_expires_at=now()-interval '1 second' WHERE id=$1",[run]);
    assert.equal(await db.reconcileOrphanCollectorRuns(),1);
    assert.equal((await db.pool.query('SELECT status FROM collector_runs WHERE id=$1',[run])).rows[0].status,'FAILED');
    const records=Array.from({length:20},(_,i)=>normalizeRecord({sportsbook:source,sport:'football',competition:'league',eventName:'A vs B',homeParticipant:'A',awayParticipant:'B',eventStartTime:'2026-09-18T00:00:00Z',sourceEventId:'event',market:'spread',marketPeriod:'game',sourceMarketId:'market',selection:i%2?'B':'A',sourceSelectionId:i%2?'B':'A',line:i%2?'1.5':'-1.5',decimalOdds:2+i/100,rawOdds:String(2+i/100),rawOddsFormat:'decimal',qualifiers:{sourceKind:'fixed',insertedAt:String(i)}},now));
    await db.saveNormalizedRecords(records);
    const counts=await db.pool.query(`SELECT count(DISTINCT m.id)::int markets,count(DISTINCT s.id)::int selections,count(o.id)::int observations FROM events e JOIN sportsbooks b ON b.id=e.sportsbook_id JOIN markets m ON m.event_id=e.id JOIN selections s ON s.market_id=m.id JOIN odds_observations o ON o.selection_id=s.id WHERE b.key=$1`,[source]);
    assert.deepEqual(counts.rows[0],{markets:1,selections:2,observations:20});
    const withTimestamp=normalizeRecord({...records[18],providerTimestamp:'2026-09-18T00:00:00Z',collectedAt:'2026-09-18T00:00:01Z'});
    await db.saveNormalizedRecords([withTimestamp]);
    const regressed=normalizeRecord({...records[18],providerTimestamp:'2026-09-17T00:00:00Z',collectedAt:'2026-09-18T00:00:02Z'});
    assert.equal(await db.countTimestampRegressions([regressed]),1);
    const page=await db.getMarketObservations({sportsbook:source,limit:3,offset:2});assert.equal(page.length,3);
    const latest=await db.getMarketObservations({sportsbook:source,current:true});assert.equal(latest.length,2);
    const events=await db.getEvents({sportsbook:source,limit:1});assert.equal(events.length,1);
    await db.saveNormalizedRecords(records);const noDup=await db.pool.query(`SELECT count(*)::int n FROM odds_observations o JOIN selections s ON s.id=o.selection_id JOIN markets m ON m.id=s.market_id JOIN events e ON e.id=m.event_id JOIN sportsbooks b ON b.id=e.sportsbook_id WHERE b.key=$1`,[source]);assert.equal(noDup.rows[0].n,20);
    await assert.rejects(db.pool.query('DELETE FROM odds_observations WHERE id=(SELECT max(id) FROM odds_observations)'),/append-only history/);
  }finally{await db.close();}
});
