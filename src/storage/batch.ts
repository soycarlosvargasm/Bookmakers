import type { PoolClient } from "pg";
import type { NormalizedRecord } from "../normalization/types.js";
import { marketIdentity, marketIdentityKey, selectionIdentityKey } from "../normalization/identity.js";

/** Bounded wire payloads; statement count depends on chunks, never outcomes. */
export async function saveRecordBatch(client: PoolClient, records: NormalizedRecord[]): Promise<void> {
  await client.query(`CREATE TEMP TABLE IF NOT EXISTS collector_input (seq integer,r jsonb,mkey jsonb,skey jsonb,mhash text,event_id bigint,market_id bigint,selection_id bigint) ON COMMIT DROP`);
  for (let offset = 0; offset < records.length; offset += 500) {
    const chunk = records.slice(offset, offset + 500).map((r, seq) => ({seq,r,mkey:JSON.parse(marketIdentityKey(r)),skey:JSON.parse(selectionIdentityKey(r)),mhash:marketIdentity(r)}));
    await client.query('TRUNCATE collector_input');
    await client.query(`INSERT INTO collector_input(seq,r,mkey,skey,mhash) SELECT seq,r,mkey,skey,mhash FROM jsonb_to_recordset($1::jsonb) AS x(seq integer,r jsonb,mkey jsonb,skey jsonb,mhash text)`,[JSON.stringify(chunk)]);
    await client.query(`INSERT INTO sportsbooks(key,display_name) SELECT DISTINCT r->>'sportsbook',r->>'sportsbook' FROM collector_input ON CONFLICT(key) DO NOTHING`);
    await client.query(`INSERT INTO events(sportsbook_id,source_event_id,sport,competition,event_name,participants,home_participant,away_participant,event_start_time,event_status,phase,live_score,live_clock,source_url)
      SELECT DISTINCT ON(b.id,r->>'sourceEventId') b.id,r->>'sourceEventId',r->>'sport',r->>'competition',r->>'eventName',nullif(r->'participants','null'::jsonb),r->>'homeParticipant',r->>'awayParticipant',(r->>'eventStartTime')::timestamptz,r->>'eventStatus',r->>'phase',nullif(r->'liveScore','null'::jsonb),r->>'liveClock',r->>'sourceUrl'
      FROM collector_input i JOIN sportsbooks b ON b.key=r->>'sportsbook' ORDER BY b.id,r->>'sourceEventId',(r->>'collectedAt')::timestamptz DESC,seq DESC
      ON CONFLICT(sportsbook_id,source_event_id) DO UPDATE SET sport=EXCLUDED.sport,competition=EXCLUDED.competition,event_name=EXCLUDED.event_name,participants=EXCLUDED.participants,home_participant=EXCLUDED.home_participant,away_participant=EXCLUDED.away_participant,event_start_time=EXCLUDED.event_start_time,event_status=EXCLUDED.event_status,phase=EXCLUDED.phase,live_score=EXCLUDED.live_score,live_clock=EXCLUDED.live_clock,source_url=EXCLUDED.source_url`);
    await client.query(`UPDATE collector_input i SET event_id=e.id FROM events e JOIN sportsbooks b ON b.id=e.sportsbook_id WHERE b.key=i.r->>'sportsbook' AND e.source_event_id=i.r->>'sourceEventId'`);
    await client.query(`INSERT INTO event_versions(event_id,observed_at,version_payload) SELECT DISTINCT ON(event_id,r->>'collectedAt') event_id,(r->>'collectedAt')::timestamptz,r - ARRAY['selection','line','rawOdds','decimalOdds','rawOddsFormat','sourceSelectionId','qualifiers'] FROM collector_input ORDER BY event_id,r->>'collectedAt',seq DESC`);
    await client.query(`INSERT INTO markets(event_id,market_type,market_period,participant_player,qualifiers,market_identity,source_market_id)
      SELECT DISTINCT ON(i.mkey) event_id,r->>'market',r->>'marketPeriod',r->>'participantPlayer',mkey->'qualifiers',mhash,r->>'sourceMarketId'
      FROM collector_input i LEFT JOIN market_identities k ON k.identity=i.mkey WHERE k.market_id IS NULL ORDER BY i.mkey,seq DESC ON CONFLICT(market_identity) DO NOTHING`);
    await client.query(`INSERT INTO market_identities(identity,market_id) SELECT DISTINCT mkey,m.id FROM collector_input i JOIN markets m ON m.market_identity=i.mhash ON CONFLICT DO NOTHING`);
    await client.query(`UPDATE collector_input i SET market_id=k.market_id FROM market_identities k WHERE k.identity=i.mkey`);
    await client.query(`UPDATE markets SET canonical_market_id=id WHERE canonical_market_id IS NULL AND id IN(SELECT market_id FROM collector_input)`);
    await client.query(`INSERT INTO selections(market_id,selection_name,line,source_selection_id,qualifiers,selection_status)
      SELECT DISTINCT ON(skey) i.market_id,r->>'selection',r->>'line',r->>'sourceSelectionId',mkey->'qualifiers',r->>'selectionStatus'
      FROM collector_input i LEFT JOIN selection_identities k ON k.identity=i.skey WHERE k.selection_id IS NULL ORDER BY skey,seq DESC ON CONFLICT DO NOTHING`);
    await client.query(`INSERT INTO selection_identities(identity,selection_id) SELECT DISTINCT ON(i.skey) i.skey,s.id FROM collector_input i JOIN selections s ON s.market_id=i.market_id AND s.selection_name IS NOT DISTINCT FROM i.r->>'selection' AND s.line IS NOT DISTINCT FROM i.r->>'line' AND s.source_selection_id IS NOT DISTINCT FROM i.r->>'sourceSelectionId' ORDER BY i.skey,s.id ON CONFLICT DO NOTHING`);
    await client.query(`UPDATE collector_input i SET selection_id=k.selection_id FROM selection_identities k WHERE k.identity=i.skey`);
    await client.query(`UPDATE selections s SET canonical_selection_id=s.id,last_seen_at=greatest(s.last_seen_at,(x.r->>'collectedAt')::timestamptz),selection_status=CASE WHEN s.last_seen_at IS NULL OR (x.r->>'collectedAt')::timestamptz>=s.last_seen_at THEN x.r->>'selectionStatus' ELSE s.selection_status END,latest_provider_timestamp=CASE WHEN x.r->>'providerTimestamp' IS NOT NULL THEN greatest(coalesce(s.latest_provider_timestamp,'-infinity'::timestamptz),(x.r->>'providerTimestamp')::timestamptz) ELSE s.latest_provider_timestamp END,latest_qualifiers=CASE WHEN s.last_seen_at IS NULL OR (x.r->>'collectedAt')::timestamptz>=s.last_seen_at THEN x.r->'qualifiers' ELSE s.latest_qualifiers END FROM (SELECT DISTINCT ON(selection_id) selection_id,r FROM collector_input ORDER BY selection_id,(r->>'collectedAt')::timestamptz DESC,seq DESC) x WHERE s.id=x.selection_id`);
    // Compare against all legacy aliases and preceding records in this batch. An
    // out-of-order arrival is retained but cannot replace a later current price.
    await client.query(`WITH latest AS (SELECT ids.selection_id,p.decimal_odds,p.raw_odds,p.raw_odds_format FROM (SELECT DISTINCT selection_id FROM collector_input) ids LEFT JOIN LATERAL (SELECT o.decimal_odds,o.raw_odds,o.raw_odds_format FROM selections s JOIN odds_observations o ON o.selection_id=s.id WHERE s.canonical_selection_id=ids.selection_id ORDER BY o.observed_at DESC,o.id DESC LIMIT 1) p ON true), stream AS (
      SELECT i.*,round((r->>'decimalOdds')::numeric,8) AS price,lag(round((r->>'decimalOdds')::numeric,8)) OVER w AS prev_price,lag(r->>'rawOdds') OVER w AS prev_raw,lag(r->>'rawOddsFormat') OVER w AS prev_format,row_number() OVER w AS n FROM collector_input i WINDOW w AS (PARTITION BY selection_id ORDER BY seq)
    ) INSERT INTO odds_observations(selection_id,observed_at,decimal_odds,raw_odds,raw_odds_format,observation_kind,source_url,provider_timestamp,collected_at)
      SELECT i.selection_id,(r->>'collectedAt')::timestamptz,price,r->>'rawOdds',r->>'rawOddsFormat','price_change',r->>'sourceUrl',(r->>'providerTimestamp')::timestamptz,(r->>'collectedAt')::timestamptz FROM stream i JOIN latest p USING(selection_id)
      WHERE ((CASE WHEN n=1 THEN p.decimal_odds ELSE prev_price END IS DISTINCT FROM price) OR (CASE WHEN n=1 THEN p.raw_odds ELSE prev_raw END IS DISTINCT FROM r->>'rawOdds') OR (CASE WHEN n=1 THEN p.raw_odds_format ELSE prev_format END IS DISTINCT FROM r->>'rawOddsFormat') OR (n=1 AND NOT EXISTS(SELECT 1 FROM selections s JOIN odds_observations o ON o.selection_id=s.id WHERE s.canonical_selection_id=i.selection_id)))
      AND NOT EXISTS(SELECT 1 FROM odds_observations old WHERE old.selection_id=i.selection_id AND old.observed_at=(r->>'collectedAt')::timestamptz AND old.decimal_odds IS NOT DISTINCT FROM price AND old.raw_odds IS NOT DISTINCT FROM r->>'rawOdds' AND old.raw_odds_format IS NOT DISTINCT FROM r->>'rawOddsFormat') ORDER BY seq`);
  }
}
