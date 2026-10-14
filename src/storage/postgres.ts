import { Pool, type PoolClient } from "pg";
import type { NormalizedRecord, RawPayloadInput } from "../normalization/types.js";
import type { CollectorRunInput } from "../collectors/service.js";
import { selectionIdentity, selectionIdentityKey } from "../normalization/identity.js";
import { saveRecordBatch } from "./batch.js";
import type { QualityFinding } from "../quality/service.js";
import { sanitizeRawPayload } from "../collectors/raw-policy.js";
import type { OddsObservation } from "../normalization/deduplication.js";
import type { SourceHealth } from "../health/types.js";
import type { AnomalyDatasetRow, AnomalyFinding, AnomalyModelArtifact, LogisticModelArtifact, MatchAssist, MatchDatasetRow, MlTrainingReport } from "../ml/types.js";
import type { MlRepository } from "../ml/service.js";
import { deterministicReviewCases, type ExperimentalReviewCase, type ReviewCaseStatus, type ReviewRevision } from "../ml/review.js";
import { matchFeatures } from "../ml/features.js";
import { reconcileMatching } from "../matching/service.js";

type MlDbRow = Record<string, unknown>;
const dbString = (row: MlDbRow, key: string): string | null => row[key] === null || row[key] === undefined ? null : row[key] instanceof Date ? row[key].toISOString() : String(row[key]);
const dbRecord = (row: MlDbRow, prefix: string): NormalizedRecord => ({
  sportsbook: dbString(row, `${prefix}_sportsbook`), sport: dbString(row, `${prefix}_sport`), competition: dbString(row, `${prefix}_competition`), eventName: dbString(row, `${prefix}_event_name`), participants: (row[`${prefix}_participants`] as string[] | null) ?? null,
  homeParticipant: dbString(row, `${prefix}_home_participant`), awayParticipant: dbString(row, `${prefix}_away_participant`), eventStartTime: dbString(row, `${prefix}_event_start_time`), eventStatus: dbString(row, `${prefix}_event_status`), phase: dbString(row, `${prefix}_phase`), liveScore: null, liveClock: null,
  market: dbString(row, `${prefix}_market`), marketPeriod: dbString(row, `${prefix}_market_period`), participantPlayer: dbString(row, `${prefix}_participant_player`), selection: dbString(row, `${prefix}_selection`), selectionStatus: dbString(row, `${prefix}_selection_status`), line: dbString(row, `${prefix}_line`), decimalOdds: row[`${prefix}_decimal_odds`] === null || row[`${prefix}_decimal_odds`] === undefined ? null : Number(row[`${prefix}_decimal_odds`]), rawOdds: dbString(row, `${prefix}_raw_odds`), rawOddsFormat: dbString(row, `${prefix}_raw_odds_format`), sourceEventId: dbString(row, `${prefix}_source_event_id`), sourceMarketId: dbString(row, `${prefix}_source_market_id`), sourceSelectionId: dbString(row, `${prefix}_source_selection_id`), sourceUrl: null, providerTimestamp: dbString(row, `${prefix}_provider_timestamp`), collectedAt: dbString(row, `${prefix}_observed_at`) ?? new Date(0).toISOString(), qualifiers: (row[`${prefix}_qualifiers`] as Record<string, string> | null) ?? null
});
const normalizeReviewEvent = (row: MlDbRow): NormalizedRecord => ({
  sportsbook: dbString(row, "candidate_source"), sport: dbString(row, "sport"), competition: dbString(row, "competition"), eventName: dbString(row, "event_name"), participants: (row.participants as string[] | null) ?? null,
  homeParticipant: dbString(row, "home_participant"), awayParticipant: dbString(row, "away_participant"), eventStartTime: dbString(row, "event_start_time"), eventStatus: dbString(row, "event_status"), phase: dbString(row, "phase"), liveScore: null, liveClock: null, market: null, marketPeriod: null, participantPlayer: null, selection: null, selectionStatus: null, line: null, decimalOdds: null, rawOdds: null, rawOddsFormat: null, sourceEventId: dbString(row, "source_event_id"), sourceMarketId: null, sourceSelectionId: null, sourceUrl: null, providerTimestamp: null, collectedAt: dbString(row, "event_start_time") ?? new Date(0).toISOString(), qualifiers: null
});

export class PostgresStorage implements MlRepository {
  readonly pool: Pool;
  constructor(databaseUrl: string) { this.pool = new Pool({ connectionString: databaseUrl }); }

  async close(): Promise<void> { await this.pool.end(); }

  /** Explicit reconciliation keeps collection latency independent from the full cross-source scan. */
  async reconcileMatching(options: { full?: boolean } = {}): Promise<void> { await this.withTransaction((client) => reconcileMatching(client, options)); }

  async reconcileOrphanCollectorRuns(): Promise<number> {
    const result = await this.pool.query(`UPDATE collector_runs SET status='FAILED', finished_at=now(),
      error_message=coalesce(error_message || '; ', '') || 'Collector lease expired after crash'
      WHERE status='RUNNING' AND lease_expires_at < now()`);
    return result.rowCount ?? 0;
  }

  async startCollectorRun(input: CollectorRunInput): Promise<number> {
    const result = await this.pool.query<{ id: number }>(`INSERT INTO collector_runs
      (sportsbook, account_alias, mode, started_at, status, lease_owner, heartbeat_at, lease_expires_at)
      VALUES ($1,$2,$3,$4,'RUNNING',$5,now(),now()+($6::text || ' milliseconds')::interval) RETURNING id`,
      [input.sportsbook,input.accountAlias,input.mode,input.startedAt,input.leaseOwner,input.leaseDurationMs]);
    return result.rows[0]!.id;
  }

  async heartbeatCollectorRun(id: number, leaseOwner: string, leaseDurationMs: number): Promise<boolean> {
    const result = await this.pool.query(`UPDATE collector_runs SET heartbeat_at=now(),
      lease_expires_at=now()+($3::text || ' milliseconds')::interval
      WHERE id=$1 AND lease_owner=$2 AND status='RUNNING' AND lease_expires_at>now()`, [id,leaseOwner,leaseDurationMs]);
    return result.rowCount === 1;
  }

  async finishCollectorRun(id: number, input: { leaseOwner?: string; status: "SUCCEEDED" | "FAILED"; finishedAt: string; recordsSeen: number; errorMessage?: string }): Promise<void> {
    const result = await this.pool.query(`UPDATE collector_runs SET finished_at=$2, status=$3, records_seen=$4, error_message=$5,
      heartbeat_at=now(),lease_expires_at=NULL WHERE id=$1 AND status='RUNNING' AND lease_owner=$6 AND lease_expires_at>now()`,
      [id,input.finishedAt,input.status,input.recordsSeen,input.errorMessage ?? null,input.leaseOwner ?? null]);
    if (result.rowCount !== 1) throw new Error(`Collector lease lost before finishing run ${id}`);
  }

  async saveRawPayload(payload: RawPayloadInput): Promise<void> {
    payload = sanitizeRawPayload(payload);
    await this.pool.query(`INSERT INTO raw_payloads
      (sportsbook, account_alias, source_type, source_url, retrieved_at, provider_timestamp, external_event_id, raw_payload, parser_version, source_topic, source_request_id, observation_direction, payload_size_bytes, normalized_record_count)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`, [payload.sportsbook, payload.accountAlias, payload.sourceType, payload.sourceUrl ?? null,
      payload.retrievedAt ?? new Date().toISOString(), payload.providerTimestamp ?? null, payload.externalEventId ?? null,
      JSON.stringify(payload.rawPayload), payload.parserVersion, payload.sourceTopic ?? null, payload.sourceRequestId ?? null,
      payload.observationDirection ?? null, payload.payloadSizeBytes ?? null, payload.normalizedRecordCount ?? null]);
  }

  async saveNormalizedRecords(records: NormalizedRecord[],lease?:{runId:number;leaseOwner:string}): Promise<void> {
    const valid = records.filter((r) => r.sportsbook && r.sourceEventId);
    if (!valid.length) return;
    await this.withTransaction(async (client) => {
      if(lease) await this.assertLease(client,lease);
      // A source-scoped xact lock fences independently launched collectors and
      // makes nullable selection identity registry creation race safe.
      for (const source of [...new Set(valid.map((r) => r.sportsbook!))].sort())
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [source]);
      await saveRecordBatch(client, valid);
      if(lease) await this.assertLease(client,lease);
    });
  }

  private async assertLease(client:PoolClient,lease:{runId:number;leaseOwner:string}):Promise<void>{
    const r=await client.query(`SELECT 1 FROM collector_runs WHERE id=$1 AND lease_owner=$2 AND status='RUNNING' AND lease_expires_at>now() FOR UPDATE`,[lease.runId,lease.leaseOwner]);
    if(!r.rowCount) throw new Error('Collector lease lost during persistence');
  }

  async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try { await client.query("BEGIN"); const result = await fn(client); await client.query("COMMIT"); return result; }
    catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }

  async getMarketObservations(options: {limit?: number; offset?: number; sportsbook?: string; sport?: string; competition?: string; eventId?: string; current?: boolean; changesOnly?: boolean; excludeStale?: boolean; staleAfterMs?: number} = {}): Promise<OddsObservation[]> {
    const terms: string[] = []; const args: unknown[] = [];
    const where = (value: unknown, expression: string) => { if (value !== undefined) { args.push(value); terms.push(expression.replace('?', `$${args.length}`)); } };
    where(options.sportsbook, 'sbook.key=?'); where(options.sport,'e.sport=?'); where(options.competition,'e.competition=?'); where(options.eventId,'e.source_event_id=?');
    if(options.current || options.changesOnly) terms.push('f.observation_id IS NULL');
    if(options.excludeStale) { args.push(options.staleAfterMs ?? 300_000); terms.push(`s.last_seen_at >= now() - ($${args.length}::text || ' milliseconds')::interval`); }
    const predicate = terms.length ? `WHERE ${terms.join(' AND ')}` : '';
    const page = options.limit === undefined ? '' : `LIMIT $${args.push(options.limit)} OFFSET $${args.push(options.offset ?? 0)}`;
    const current = options.current ? 'WHERE rank=1' : options.changesOnly ? 'WHERE previous_odds IS NOT NULL AND previous_odds IS DISTINCT FROM decimal_odds' : '';
    const result = await this.pool.query(`WITH observation_rows AS (
      SELECT sbook.key AS sportsbook, e.sport, e.competition, e.event_name, e.participants,
      e.home_participant, e.away_participant, e.event_start_time, e.event_status, e.phase, e.live_score, e.live_clock, e.source_event_id,
      e.source_url AS event_source_url, m.market_type, m.market_period, m.participant_player, m.qualifiers AS market_qualifiers,
      m.market_identity, m.source_market_id, s.selection_name, s.selection_status, s.line, s.source_selection_id, s.qualifiers AS selection_qualifiers,
      o.id AS observation_id, o.observed_at, o.decimal_odds, o.raw_odds, o.raw_odds_format, o.source_url, o.provider_timestamp, o.collected_at, f.code AS quality_flag,
      ${options.current ? "row_number() OVER(PARTITION BY coalesce(s.canonical_selection_id,s.id) ORDER BY o.observed_at DESC,o.id DESC)" : "1"} AS rank,
      ${options.changesOnly ? "lag(o.decimal_odds) OVER(PARTITION BY coalesce(s.canonical_selection_id,s.id) ORDER BY o.observed_at,o.id)" : "NULL::numeric"} AS previous_odds
      FROM odds_observations o LEFT JOIN odds_observation_flags f ON f.observation_id=o.id JOIN selections s ON s.id=o.selection_id JOIN markets m ON m.id=s.market_id
      JOIN events e ON e.id=m.event_id LEFT JOIN sportsbooks sbook ON sbook.id=e.sportsbook_id ${predicate}
    ) SELECT * FROM observation_rows ${current} ORDER BY observed_at ASC, observation_id ASC ${page}`, args);
    return result.rows.map((row) => ({
      identity: selectionIdentity({sportsbook:row.sportsbook,sourceEventId:row.source_event_id,eventName:row.event_name,sourceMarketId:row.source_market_id,market:row.market_type,marketPeriod:row.market_period,participantPlayer:row.participant_player,qualifiers:row.selection_qualifiers ?? row.market_qualifiers,selection:row.selection_name,line:row.line,sourceSelectionId:row.source_selection_id} as NormalizedRecord), observedAt: new Date(row.observed_at).toISOString(), sportsbook: row.sportsbook ?? null,
      sport: row.sport ?? null, competition: row.competition ?? null, eventName: row.event_name ?? null,
      participants: row.participants ?? null, homeParticipant: row.home_participant ?? null, awayParticipant: row.away_participant ?? null,
      eventStartTime: row.event_start_time ? new Date(row.event_start_time).toISOString() : null, eventStatus: row.event_status ?? null,
      phase: row.phase ?? null, liveScore: row.live_score ?? null, liveClock: row.live_clock ?? null, market: row.market_type ?? null, marketPeriod: row.market_period ?? null,
      selection: row.selection_name ?? null, selectionStatus: row.selection_status ?? null, line: row.line ?? null, decimalOdds: row.decimal_odds === null ? null : Number(row.decimal_odds),
      rawOdds: row.raw_odds ?? null, rawOddsFormat: row.raw_odds_format ?? null, sourceEventId: row.source_event_id ?? null,
      sourceMarketId: row.source_market_id ?? null, sourceSelectionId: row.source_selection_id ?? null,
      sourceUrl: row.source_url ?? row.event_source_url ?? null, providerTimestamp: row.provider_timestamp ? new Date(row.provider_timestamp).toISOString() : null,
      collectedAt: new Date(row.collected_at).toISOString(), qualityFlag: row.quality_flag ?? null, participantPlayer: row.participant_player ?? null,
      qualifiers: row.market_qualifiers ?? row.selection_qualifiers ?? null
    }));
  }

  async countTimestampRegressions(records: NormalizedRecord[]):Promise<number>{
    const values=records.filter(r=>r.providerTimestamp).map(r=>({identity:JSON.parse(selectionIdentityKey(r)),timestamp:r.providerTimestamp}));
    if(!values.length)return 0;
    const r=await this.pool.query(`SELECT count(*)::int n FROM jsonb_to_recordset($1::jsonb) AS x(identity jsonb,timestamp timestamptz) JOIN selection_identities i ON i.identity=x.identity JOIN selections s ON s.id=i.selection_id WHERE s.latest_provider_timestamp IS NOT NULL AND x.timestamp<s.latest_provider_timestamp`,[JSON.stringify(values)]);
    return r.rows[0].n as number;
  }

  async priorNonemptyRun(source: string, mode: string): Promise<boolean> {
    const r=await this.pool.query(`SELECT 1 FROM collector_runs WHERE sportsbook=$1 AND mode=$2 AND status='SUCCEEDED' AND records_seen>0 LIMIT 1`,[source,mode]);
    return !!r.rowCount;
  }
  async saveQualityFindings(runId:number|undefined,findings:QualityFinding[]):Promise<void>{
    for(const finding of findings) await this.pool.query(`INSERT INTO quality_findings(collector_run_id,source,code,count,details) VALUES($1,$2,$3,$4,$5)`,[runId??null,finding.source,finding.code,finding.count,JSON.stringify(finding.details)]);
  }

  async saveReviewCases(cases: ExperimentalReviewCase[]): Promise<void> {
    for (const item of cases) await this.pool.query("INSERT INTO ml_review_cases(case_type,source,left_record,right_record,evidence,dataset_version) VALUES($1,$2,$3,$4,$5,$6)", [item.caseType,item.source,item.leftRecord ? JSON.stringify(item.leftRecord) : null,item.rightRecord ? JSON.stringify(item.rightRecord) : null,JSON.stringify(item.evidence),item.datasetVersion]);
  }

  async collectReviewCases(records: NormalizedRecord[], findings: QualityFinding[]): Promise<void> {
    const cases = deterministicReviewCases(records[0]?.sportsbook ?? findings[0]?.source ?? "unknown", records, findings);
    const eventRecords = [...new Map(records.filter((record) => record.sourceEventId && record.sport && record.eventStartTime).map((record) => [record.sourceEventId!, record])).values()].slice(0, 500);
    if (eventRecords.length) {
      const input = eventRecords.map((record) => ({ source_event_id: record.sourceEventId, sportsbook: record.sportsbook, sport: record.sport, event_name: record.eventName, participants: record.participants, home_participant: record.homeParticipant, away_participant: record.awayParticipant, event_start_time: record.eventStartTime }));
      const result = await this.pool.query(`WITH incoming AS (SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(source_event_id text,sportsbook text,sport text,event_name text,participants jsonb,home_participant text,away_participant text,event_start_time timestamptz))
        SELECT i.source_event_id AS incoming_event_id,i.sportsbook AS incoming_source,e.id AS candidate_event_id,b.key AS candidate_source,e.source_event_id,e.sport,e.competition,e.event_name,e.participants,e.home_participant,e.away_participant,e.event_start_time,e.event_status,e.phase
        FROM incoming i JOIN events e ON e.event_start_time IS NOT NULL AND lower(e.sport)=lower(i.sport) AND abs(extract(epoch FROM(e.event_start_time-i.event_start_time)))<=10800 JOIN sportsbooks b ON b.id=e.sportsbook_id AND b.key<>i.sportsbook
        ORDER BY i.source_event_id,e.id`, [JSON.stringify(input)]);
      const byIncoming = new Map<string, typeof result.rows>(); for (const row of result.rows) byIncoming.set(String(row.incoming_event_id), [...(byIncoming.get(String(row.incoming_event_id)) ?? []), row]);
      for (const record of eventRecords) {
        const candidates = byIncoming.get(record.sourceEventId!) ?? [];
        if (!candidates.length) { cases.push({ caseType: "unmatched_cross_source_event", source: record.sportsbook ?? "unknown", leftRecord: record, evidence: { reason: "no deterministic cross-source event candidate within three hours", labelsMustBeHumanConfirmed: true }, datasetVersion: "review-v1" }); continue; }
        const candidateRecords = candidates.map((row) => normalizeReviewEvent(row));
        if (candidateRecords.length > 1) {
          cases.push({ caseType: "ambiguous_match", source: record.sportsbook ?? "unknown", leftRecord: record, evidence: { candidateCount: candidateRecords.length, candidates: candidateRecords.map((candidate) => ({ sportsbook: candidate.sportsbook, sourceEventId: candidate.sourceEventId, eventName: candidate.eventName })), labelsMustBeHumanConfirmed: true }, datasetVersion: "review-v1" });
          cases.push({ caseType: "conflicting_match", source: record.sportsbook ?? "unknown", leftRecord: record, evidence: { candidateCount: candidateRecords.length, featureSummaries: candidateRecords.map((candidate) => matchFeatures(record, candidate)), labelsMustBeHumanConfirmed: true }, datasetVersion: "review-v1" });
        } else cases.push({ caseType: "near_match", source: record.sportsbook ?? "unknown", leftRecord: record, rightRecord: candidateRecords[0], evidence: { features: matchFeatures(record, candidateRecords[0]!), labelsMustBeHumanConfirmed: true }, datasetVersion: "review-v1" });
      }
    }
    await this.saveReviewCases(cases);
  }

  async getReviewCases(limit: number, status?: ReviewCaseStatus): Promise<unknown[]> { const args: unknown[] = [Math.min(limit,1000)]; const where = status ? `WHERE status=$${args.push(status)}` : ""; const result = await this.pool.query(`SELECT id,case_type,source,left_record,right_record,evidence,dataset_version,status,ground_truth_label,correction,created_at,reviewed_at FROM ml_review_cases ${where} ORDER BY created_at DESC,id DESC LIMIT $1`, args); return result.rows; }
  async reviewCase(input: ReviewRevision): Promise<void> { await this.withTransaction(async (client) => { const found = await client.query("SELECT id FROM ml_review_cases WHERE id=$1 FOR UPDATE", [input.caseId]); if (!found.rowCount) throw new Error("review case not found"); const revision = await client.query("SELECT coalesce(max(revision),0)+1 AS next FROM ml_review_case_revisions WHERE case_id=$1", [input.caseId]); await client.query("INSERT INTO ml_review_case_revisions(case_id,revision,status,ground_truth_label,correction,reviewer,reason) VALUES($1,$2,$3,$4,$5,$6,$7)", [input.caseId,revision.rows[0].next,input.status,input.groundTruthLabel ?? null,input.correction ? JSON.stringify(input.correction) : null,input.reviewer ?? null,input.reason ?? null]); await client.query("UPDATE ml_review_cases SET status=$2,ground_truth_label=$3,correction=$4,reviewed_at=now() WHERE id=$1", [input.caseId,input.status,input.groundTruthLabel ?? null,input.correction ? JSON.stringify(input.correction) : null]); }); }

  async getEvents(options: {limit?: number;offset?: number;sportsbook?: string;sport?: string;competition?: string;eventId?: string} = {}): Promise<Record<string, unknown>[]> {
    const args: unknown[]=[];const clauses: string[]=[];
    for(const [value,column] of [[options.sportsbook,'b.key'],[options.sport,'e.sport'],[options.competition,'e.competition'],[options.eventId,'e.source_event_id']] as const) if(value!==undefined){args.push(value);clauses.push(`${column}=$${args.length}`);}
    const where=clauses.length?`WHERE ${clauses.join(' AND ')}`:'';
    const page=options.limit===undefined?'':`LIMIT $${args.push(options.limit)} OFFSET $${args.push(options.offset??0)}`;
    const r=await this.pool.query(`SELECT e.source_event_id AS id,b.key AS sportsbook,e.sport,e.competition,e.event_name AS "eventName",e.participants,e.home_participant AS "homeParticipant",e.away_participant AS "awayParticipant",e.event_start_time AS "eventStartTime",e.event_status AS "eventStatus",e.phase,e.live_score AS "liveScore",e.live_clock AS "liveClock",e.source_url AS "sourceUrl" FROM events e JOIN sportsbooks b ON b.id=e.sportsbook_id ${where} ORDER BY e.id ${page}`,args);
    return r.rows;
  }

  async getFacets(kind: 'sportsbook'|'sport'|'competition'): Promise<string[]> {
    const expression=kind==='sportsbook'?'b.key':kind==='sport'?'e.sport':'e.competition';
    const r=await this.pool.query(`SELECT DISTINCT ${expression} AS value FROM events e JOIN sportsbooks b ON b.id=e.sportsbook_id WHERE ${expression} IS NOT NULL ORDER BY value`);
    return r.rows.map(row=>row.value as string);
  }

  async saveSourceHealth(health: SourceHealth): Promise<void> {
    await this.pool.query("INSERT INTO source_health (sportsbook, account_alias, status, checked_at, message) VALUES ($1,$2,$3,$4,$5)", [health.sportsbook, health.accountAlias, health.status, health.checkedAt, health.message ?? null]);
  }

  async getSourceHealth(): Promise<SourceHealth[]> {
    const result = await this.pool.query("SELECT DISTINCT ON (sportsbook, account_alias) sportsbook, account_alias, status, checked_at, message FROM source_health ORDER BY sportsbook, account_alias, checked_at DESC");
    return result.rows.map((row) => ({ sportsbook: row.sportsbook, accountAlias: row.account_alias, status: row.status, checkedAt: new Date(row.checked_at).toISOString(), ...(row.message ? { message: row.message } : {}) }));
  }

  async loadMatchDataset(): Promise<MatchDatasetRow[]> {
    const result = await this.pool.query(`WITH event_pairs AS (
      SELECT e1.id::text AS left_event_key,e2.id::text AS right_event_key FROM events e1 JOIN events e2 ON e1.id<e2.id
      JOIN sportsbooks b1 ON b1.id=e1.sportsbook_id JOIN sportsbooks b2 ON b2.id=e2.sportsbook_id
      WHERE b1.key<b2.key AND lower(e1.sport)=lower(e2.sport) AND e1.event_start_time IS NOT NULL AND e2.event_start_time IS NOT NULL AND abs(extract(epoch FROM(e1.event_start_time-e2.event_start_time)))<=10800
    ), records AS (
      SELECT e.id::text AS event_key,b.key AS sportsbook,e.source_event_id,e.sport,e.competition,e.event_name,e.participants,e.home_participant,e.away_participant,e.event_start_time,e.event_status,e.phase,
        m.market_type AS market,m.market_period,m.participant_player,m.qualifiers,m.source_market_id,s.selection_name AS selection,s.selection_status,s.line,s.source_selection_id,
        o.decimal_odds,o.raw_odds,o.raw_odds_format,o.provider_timestamp,coalesce(o.observed_at,e.created_at) AS observed_at
      FROM selections s JOIN markets m ON m.id=s.market_id JOIN events e ON e.id=m.event_id JOIN sportsbooks b ON b.id=e.sportsbook_id
      LEFT JOIN LATERAL (SELECT decimal_odds,raw_odds,raw_odds_format,provider_timestamp,observed_at FROM odds_observations WHERE selection_id=s.id ORDER BY observed_at DESC,id DESC LIMIT 1) o ON true
    ) SELECT l.event_key AS left_event_key,r.event_key AS right_event_key,
      l.sportsbook AS l_sportsbook,l.sport AS l_sport,l.competition AS l_competition,l.event_name AS l_event_name,l.participants AS l_participants,l.home_participant AS l_home_participant,l.away_participant AS l_away_participant,l.event_start_time AS l_event_start_time,l.event_status AS l_event_status,l.phase AS l_phase,l.market AS l_market,l.market_period AS l_market_period,l.participant_player AS l_participant_player,l.qualifiers AS l_qualifiers,l.selection AS l_selection,l.selection_status AS l_selection_status,l.line AS l_line,l.decimal_odds AS l_decimal_odds,l.raw_odds AS l_raw_odds,l.raw_odds_format AS l_raw_odds_format,l.source_event_id AS l_source_event_id,l.source_market_id AS l_source_market_id,l.source_selection_id AS l_source_selection_id,l.provider_timestamp AS l_provider_timestamp,l.observed_at AS l_observed_at,
      r.sportsbook AS r_sportsbook,r.sport AS r_sport,r.competition AS r_competition,r.event_name AS r_event_name,r.participants AS r_participants,r.home_participant AS r_home_participant,r.away_participant AS r_away_participant,r.event_start_time AS r_event_start_time,r.event_status AS r_event_status,r.phase AS r_phase,r.market AS r_market,r.market_period AS r_market_period,r.participant_player AS r_participant_player,r.qualifiers AS r_qualifiers,r.selection AS r_selection,r.selection_status AS r_selection_status,r.line AS r_line,r.decimal_odds AS r_decimal_odds,r.raw_odds AS r_raw_odds,r.raw_odds_format AS r_raw_odds_format,r.source_event_id AS r_source_event_id,r.source_market_id AS r_source_market_id,r.source_selection_id AS r_source_selection_id,r.provider_timestamp AS r_provider_timestamp,r.observed_at AS r_observed_at
      FROM event_pairs p JOIN records l ON l.event_key=p.left_event_key JOIN records r ON r.event_key=p.right_event_key
      WHERE l.sport IS NOT NULL AND r.sport IS NOT NULL AND lower(l.sport)=lower(r.sport) AND l.event_start_time IS NOT NULL AND r.event_start_time IS NOT NULL AND abs(extract(epoch FROM(l.event_start_time-r.event_start_time)))<=10800
      ORDER BY greatest(l.observed_at,r.observed_at),l.event_key,r.event_key LIMIT 100000`);
    return result.rows.map((raw) => { const row = raw as MlDbRow; const left = dbRecord(row, "l"); const right = dbRecord(row, "r"); return { pairKey: `${row.left_event_key}:${row.right_event_key}:${left.sourceMarketId ?? left.market}:${right.sourceMarketId ?? right.market}:${left.sourceSelectionId ?? left.selection}:${right.sourceSelectionId ?? right.selection}`, leftEventKey: String(row.left_event_key), rightEventKey: String(row.right_event_key), observedAt: new Date(Math.max(Date.parse(left.collectedAt), Date.parse(right.collectedAt))).toISOString(), left, right }; });
  }

  async loadAnomalyDataset(): Promise<AnomalyDatasetRow[]> {
    const result = await this.pool.query(`WITH observations AS (
      SELECT o.id,o.observed_at,o.decimal_odds,o.raw_odds,o.raw_odds_format,o.provider_timestamp,o.collected_at,
        lag(o.decimal_odds) OVER(PARTITION BY coalesce(s.canonical_selection_id,s.id) ORDER BY o.observed_at,o.id) AS previous_odds,
        count(*) OVER(PARTITION BY o.selection_id,o.observed_at,o.decimal_odds) AS duplicate_count,count(*) OVER(PARTITION BY o.selection_id) AS selection_count,
        e.source_event_id,e.sport,e.competition,e.event_name,e.participants,e.home_participant,e.away_participant,e.event_start_time,e.event_status,e.phase,
        m.market_type AS market,m.market_period,m.participant_player,m.qualifiers,m.source_market_id,s.selection_name AS selection,s.selection_status,s.line,s.source_selection_id,b.key AS sportsbook,f.observation_id IS NOT NULL AS known_anomaly
      FROM odds_observations o JOIN selections s ON s.id=o.selection_id JOIN markets m ON m.id=s.market_id JOIN events e ON e.id=m.event_id JOIN sportsbooks b ON b.id=e.sportsbook_id LEFT JOIN odds_observation_flags f ON f.observation_id=o.id
    ) SELECT * FROM observations ORDER BY observed_at,id LIMIT 200000`);
    const rows = result.rows as MlDbRow[]; const groups = new Map<string, MlDbRow[]>(); const keyOf = (row: MlDbRow): string => [row.sport,row.home_participant,row.away_participant,row.event_start_time,row.market,row.market_period,row.selection,row.line].map((value) => String(value ?? "").toLowerCase()).join("|");
    rows.forEach((row) => { const key = keyOf(row); groups.set(key, [...(groups.get(key) ?? []), row]); });
    return rows.map((row) => { const peers = (groups.get(keyOf(row)) ?? []).filter((peer) => peer.sportsbook !== row.sportsbook && peer.decimal_odds !== null && Number(peer.decimal_odds) > 1).map((peer) => Number(peer.decimal_odds)).sort((a, b) => a - b); const peerMedian = peers.length ? peers[Math.floor(peers.length / 2)]! : null; const record = dbRecord({ l_sportsbook: row.sportsbook,l_sport: row.sport,l_competition: row.competition,l_event_name: row.event_name,l_participants: row.participants,l_home_participant: row.home_participant,l_away_participant: row.away_participant,l_event_start_time: row.event_start_time,l_event_status: row.event_status,l_phase: row.phase,l_market: row.market,l_market_period: row.market_period,l_participant_player: row.participant_player,l_qualifiers: row.qualifiers,l_selection: row.selection,l_selection_status: row.selection_status,l_line: row.line,l_decimal_odds: row.decimal_odds,l_raw_odds: row.raw_odds,l_raw_odds_format: row.raw_odds_format,l_source_event_id: row.source_event_id,l_source_market_id: row.source_market_id,l_source_selection_id: row.source_selection_id,l_provider_timestamp: row.provider_timestamp,l_observed_at: row.observed_at }, "l"); return { observationId: Number(row.id), observedAt: new Date(row.observed_at as string).toISOString(), record, previousOdds: row.previous_odds === null ? null : Number(row.previous_odds), duplicateRate: Number(row.duplicate_count) > 1 ? Math.min(1, Number(row.duplicate_count) / Math.max(1, Number(row.selection_count))) : 0, sourceDisagreement: peerMedian && record.decimalOdds && record.decimalOdds > 1 ? Math.min(1, Math.abs(Math.log(record.decimalOdds / peerMedian)) / 2) : 0, knownAnomaly: Boolean(row.known_anomaly) }; });
  }

  async getLatestMlRun(): Promise<{ modelVersion: string; matchModel: LogisticModelArtifact | null; anomalyModel: AnomalyModelArtifact | null; report: MlTrainingReport } | null> {
    const result = await this.pool.query("SELECT model_version,match_model,anomaly_model,report FROM ml_model_versions ORDER BY training_date DESC,id DESC LIMIT 1"); if (!result.rowCount) return null; const row = result.rows[0] as { model_version: string; match_model: LogisticModelArtifact | null; anomaly_model: AnomalyModelArtifact | null; report: MlTrainingReport }; return { modelVersion: row.model_version, matchModel: row.match_model, anomalyModel: row.anomaly_model, report: row.report };
  }
  async saveMlRun(input: { report: MlTrainingReport; matchModel: LogisticModelArtifact | null; anomalyModel: AnomalyModelArtifact | null }): Promise<void> { const { report } = input; await this.pool.query("INSERT INTO ml_model_versions(dataset_version,feature_version,model_version,training_date,train_count,validation_count,test_count,metrics,baseline_metrics,anomaly_metrics,match_model,anomaly_model,report) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)", [report.datasetVersion,report.featureVersion,report.modelVersion,report.trainingDate,report.trainCount,report.validationCount,report.testCount,JSON.stringify(report.matchingMetrics),JSON.stringify(report.deterministicBaseline),JSON.stringify(report.anomalyMetrics),input.matchModel ? JSON.stringify(input.matchModel) : null,input.anomalyModel ? JSON.stringify(input.anomalyModel) : null,JSON.stringify(report)]); }
  async saveMlAnalysis(analysis: { matches: MatchAssist[]; anomalies: AnomalyFinding[] }): Promise<void> { for (const item of analysis.matches) await this.pool.query("INSERT INTO ml_match_assists(pair_key,decision,confidence,reasons,features,model_version) VALUES($1,$2,$3,$4,$5,$6)", [item.pairKey,item.decision,item.confidence,JSON.stringify(item.reasons),JSON.stringify(item.features),item.modelVersion]); for (const item of analysis.anomalies) await this.pool.query("INSERT INTO ml_anomalies(entity_key,observed_at,anomaly_type,score,decision,reasons,features,model_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8)", [item.entityKey,item.observationAt,item.anomalyType,item.score,item.decision,JSON.stringify(item.reasons),JSON.stringify(item.features),item.modelVersion]); }
  async getMlAssists(limit: number): Promise<MatchAssist[]> { const result = await this.pool.query("SELECT pair_key,decision,confidence,reasons,features,model_version FROM ml_match_assists ORDER BY created_at DESC,id DESC LIMIT $1", [Math.min(limit,1000)]); return result.rows.map((row) => ({ pairKey: row.pair_key, decision: row.decision, confidence: Number(row.confidence), reasons: row.reasons, features: row.features, modelVersion: row.model_version })); }
  async getMlAnomalies(limit: number): Promise<AnomalyFinding[]> { const result = await this.pool.query("SELECT entity_key,observed_at,anomaly_type,score,decision,reasons,features,model_version FROM ml_anomalies ORDER BY created_at DESC,id DESC LIMIT $1", [Math.min(limit,1000)]); return result.rows.map((row) => ({ entityKey: row.entity_key, observationAt: new Date(row.observed_at).toISOString(), anomalyType: row.anomaly_type, score: Number(row.score), decision: row.decision, reasons: row.reasons, features: row.features, modelVersion: row.model_version })); }
}
