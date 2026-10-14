import type {Pool} from 'pg';
export type ComparisonOptions={limit?:number;offset?:number;sport?:string;eventId?:string;excludeStale?:boolean;staleAfterMs?:number;includeExchange?:boolean};
/** Conservative semantic aliases; event participants and start still match exactly. */
export class ComparisonService {
  constructor(private readonly pool:Pool){}
  async compare(options:ComparisonOptions={}):Promise<unknown[]>{
    const params:unknown[]=[options.staleAfterMs??300_000,options.sport??null,options.eventId??null,options.excludeStale!==false,options.includeExchange===true,Math.min(options.limit??100,1000),options.offset??0];
    const sql=`WITH ranked AS (
      SELECT coalesce(s.canonical_selection_id,s.id) AS selection_id,o.decimal_odds::float8 AS odds,o.observed_at,
        row_number() OVER(PARTITION BY coalesce(s.canonical_selection_id,s.id) ORDER BY o.observed_at DESC,o.id DESC) AS newest,
        row_number() OVER(PARTITION BY coalesce(s.canonical_selection_id,s.id) ORDER BY o.observed_at ASC,o.id ASC) AS oldest,
        min(o.decimal_odds::float8) OVER(PARTITION BY coalesce(s.canonical_selection_id,s.id)) AS low,
        max(o.decimal_odds::float8) OVER(PARTITION BY coalesce(s.canonical_selection_id,s.id)) AS high
      FROM odds_observations o LEFT JOIN odds_observation_flags f ON f.observation_id=o.id JOIN selections s ON s.id=o.selection_id
      WHERE f.observation_id IS NULL
    ), selection_stats AS (
      SELECT selection_id,max(odds) FILTER(WHERE newest=1) AS current,max(odds) FILTER(WHERE newest=2) AS previous,
        max(odds) FILTER(WHERE oldest=1) AS open_observable,max(low) AS low,max(high) AS high
      FROM ranked GROUP BY selection_id
    ), quotes AS (
      SELECT b.key AS source,e.source_event_id,e.event_name,e.sport,e.competition,e.home_participant,e.away_participant,e.event_start_time,
        m.market_type,m.market_period,m.participant_player,s.selection_name,s.line,s.last_seen_at,
        x.current,x.previous,x.open_observable,x.low,x.high,
        CASE WHEN b.key='sxbet' OR b.key IN ('bfo-kalshi','bfo-polymarket','fightodds-kalshi','fightodds-polymarket','fightodds-sxbet','fightodds-prophetx') THEN 'EXCHANGE_AGGREGATED'
          WHEN b.key LIKE 'actionnetwork-%' OR b.key LIKE 'bfo-%' OR b.key LIKE 'fightodds-%' THEN 'AGGREGATED_ODDS'
          ELSE 'SPORTSBOOK' END AS source_kind
      FROM selection_stats x JOIN selections s ON s.id=x.selection_id JOIN markets m ON m.id=s.market_id JOIN events e ON e.id=m.event_id JOIN sportsbooks b ON b.id=e.sportsbook_id
      WHERE x.current>1 AND ($2::text IS NULL OR lower(e.sport)=lower($2) OR
        CASE upper(e.sport) WHEN 'FOOT' THEN 'football' WHEN 'BASK' THEN 'basketball' WHEN 'HCKY' THEN 'hockey' WHEN 'TENN' THEN 'tennis' END=lower($2))
        AND ($3::text IS NULL OR e.source_event_id=$3)
        AND (NOT $4::boolean OR s.last_seen_at >= now()-($1::text||' milliseconds')::interval)
        AND ($5::boolean OR b.key NOT IN ('sxbet','bfo-kalshi','bfo-polymarket','fightodds-kalshi','fightodds-polymarket','fightodds-sxbet','fightodds-prophetx'))
    ), comparable AS (
      SELECT min(source_event_id) AS source_event_id,
        CASE upper(trim(sport)) WHEN 'FOOT' THEN 'football' WHEN 'BASK' THEN 'basketball' WHEN 'HCKY' THEN 'hockey' WHEN 'TENN' THEN 'tennis' ELSE lower(trim(sport)) END AS sport,
        lower(trim(competition)) AS competition,
        lower(trim(home_participant)) AS home_participant,lower(trim(away_participant)) AS away_participant,event_start_time,
        CASE lower(trim(market_type)) WHEN 'point spread' THEN 'spread' WHEN 'total points' THEN 'total' ELSE lower(trim(market_type)) END AS market_type,
        lower(trim(market_period)) AS market_period,lower(trim(participant_player)) AS participant_player,
        CASE WHEN lower(trim(selection_name))='home' AND lower(trim(market_type)) IN ('moneyline','spread','point spread') THEN lower(trim(home_participant))
          WHEN lower(trim(selection_name))='away' AND lower(trim(market_type)) IN ('moneyline','spread','point spread') THEN lower(trim(away_participant))
          ELSE lower(trim(selection_name)) END AS selection_name,
        CASE WHEN trim(line) ~ '^[+-]?[0-9]+(\\.[0-9]+)?$' THEN trim((trim(line)::numeric)::text) ELSE lower(trim(line)) END AS line,
        count(DISTINCT source)::int AS source_count,min(current) AS worst,max(current) AS best,avg(current) AS mean,
        percentile_cont(0.5) WITHIN GROUP(ORDER BY current) AS median,stddev_pop(current) AS dispersion,
        avg(CASE WHEN previous>1 THEN 1/current-1/previous END) AS mean_implied_probability_movement,
        jsonb_agg(jsonb_build_object('source',source,'sourceKind',source_kind,'current',current,'previous',previous,'openObservable',open_observable,'high',high,'low',low,'impliedProbabilityMovement',CASE WHEN previous>1 THEN 1/current-1/previous END,'lastSeenAt',last_seen_at) ORDER BY source) AS sources
      FROM quotes WHERE home_participant IS NOT NULL AND away_participant IS NOT NULL
        AND (event_start_time IS NOT NULL OR source LIKE 'bfo-%')
      GROUP BY 2,3,4,5,source_event_id,6,7,8,9,10,11
    ) SELECT * FROM comparable ORDER BY event_start_time,sport,home_participant,market_type,selection_name LIMIT $6 OFFSET $7`;
    return (await this.pool.query(sql,params)).rows;
  }
}
