import type { Pool } from 'pg';
import type { NormalizedRecord, RawPayloadInput } from '../normalization/types.js';
export type QualityFinding={source:string;code:'ZERO_RECORDS'|'MISSING_PRICE'|'SCHEMA_DRIFT'|'TIMESTAMP_REGRESSION';count:number;details:Record<string,unknown>};
export function inspectCollection(source:string, records:NormalizedRecord[], raw:RawPayloadInput[], previousNonempty=false):QualityFinding[] {
  const findings:QualityFinding[]=[];
  if(records.length===0 && previousNonempty) findings.push({source,code:'ZERO_RECORDS',count:1,details:{expected:'prior successful nonempty run'}});
  const missing=records.filter(r=>r.decimalOdds===null||r.decimalOdds<=1||!Number.isFinite(r.decimalOdds));
  if(missing.length) findings.push({source,code:'MISSING_PRICE',count:missing.length,details:{records:records.length}});
  const malformed=records.filter(r=>!r.sourceEventId||!r.market||!r.selection);
  const rawMalformed=raw.filter(r=>!r.sourceType||!r.parserVersion);
  if(malformed.length+rawMalformed.length) findings.push({source,code:'SCHEMA_DRIFT',count:malformed.length+rawMalformed.length,details:{normalized:malformed.length,raw:rawMalformed.length}});
  const regressions=records.filter(r=>r.providerTimestamp && Number.isFinite(Date.parse(r.providerTimestamp)) && Date.parse(r.providerTimestamp)>Date.parse(r.collectedAt)+60_000);
  if(regressions.length) findings.push({source,code:'TIMESTAMP_REGRESSION',count:regressions.length,details:{reason:'provider timestamp later than collection by >60s'}});
  return findings;
}
export class DataQualityService {
  constructor(private readonly pool:Pool){}
  async getSourceQuality(staleAfterMs=300_000):Promise<unknown[]> {
    const r=await this.pool.query(`WITH latest_health AS (SELECT DISTINCT ON(sportsbook) sportsbook,status,checked_at,message FROM source_health ORDER BY sportsbook,checked_at DESC),
      latest_run AS (SELECT DISTINCT ON(sportsbook) sportsbook,status,started_at,finished_at,records_seen FROM collector_runs WHERE status='SUCCEEDED' ORDER BY sportsbook,started_at DESC,id DESC),
      prices AS (SELECT CASE WHEN b.key LIKE 'actionnetwork-%' THEN 'actionnetwork' ELSE b.key END AS sportsbook,count(*)::int selections,count(*) FILTER(WHERE s.last_seen_at<now()-($1::text||' milliseconds')::interval OR s.last_seen_at IS NULL)::int stale_count,count(*) FILTER(WHERE o.decimal_odds IS NULL)::int missing_price_count,max(s.last_seen_at) AS newest_seen FROM selections s JOIN markets m ON m.id=s.market_id JOIN events e ON e.id=m.event_id JOIN sportsbooks b ON b.id=e.sportsbook_id LEFT JOIN LATERAL (SELECT decimal_odds FROM odds_observations WHERE selection_id=s.id ORDER BY observed_at DESC,id DESC LIMIT 1) o ON true WHERE (s.canonical_selection_id IS NULL OR s.canonical_selection_id=s.id) AND (e.event_start_time IS NULL OR e.event_start_time>=now()-interval '24 hours') GROUP BY CASE WHEN b.key LIKE 'actionnetwork-%' THEN 'actionnetwork' ELSE b.key END),
      anomalies AS (SELECT source,code,sum(count)::int count FROM quality_findings WHERE observed_at>now()-interval '24 hours' GROUP BY source,code)
      SELECT h.sportsbook,h.status AS transport_status,h.checked_at,h.message,r.status AS run_status,r.started_at,r.records_seen,p.selections,p.stale_count,p.missing_price_count,p.newest_seen,coalesce(jsonb_object_agg(a.code,a.count) FILTER(WHERE a.code IS NOT NULL),'{}'::jsonb) AS anomalies
      FROM latest_health h LEFT JOIN latest_run r USING(sportsbook) LEFT JOIN prices p ON p.sportsbook=h.sportsbook LEFT JOIN anomalies a ON a.source=h.sportsbook GROUP BY h.sportsbook,h.status,h.checked_at,h.message,r.status,r.started_at,r.records_seen,p.selections,p.stale_count,p.missing_price_count,p.newest_seen ORDER BY h.sportsbook`,[staleAfterMs]);
    return r.rows.map(row=>({...row,overall_status:row.transport_status!=='HEALTHY'||Date.now()-new Date(row.checked_at).getTime()>staleAfterMs?'DEGRADED':row.run_status==='FAILED'||row.stale_count>0||row.missing_price_count>0||Object.keys(row.anomalies).length?'DEGRADED':'HEALTHY',reasons:[row.transport_status!=='HEALTHY'?'transport':null,Date.now()-new Date(row.checked_at).getTime()>staleAfterMs?'health_check_stale':null,row.run_status==='FAILED'?'last_run_failed':null,row.stale_count>0?'stale_odds':null,row.missing_price_count>0?'missing_prices':null,...Object.keys(row.anomalies)].filter(Boolean)}));
  }
}
