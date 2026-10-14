import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

type TimeRange = { since?: string; until?: string; observedSince?: string; mode?: 'live' | 'history'; includeUndated?: 'true' | 'false' };
const dateProperties = { since: { type: 'string' }, until: { type: 'string' }, observedSince: { type: 'string' }, mode: { type: 'string', enum: ['live', 'history'] }, includeUndated: { type: 'string', enum: ['true', 'false'] } };
function conditions(range: TimeRange, values: string[], detail = false): string {
  for (const value of [range.since, range.until, range.observedSince]) if (value !== undefined && (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value) || !Number.isFinite(Date.parse(value)))) throw Object.assign(new Error('Date filters must be ISO dates or timestamps.'), { statusCode: 400 });
  if (range.since && range.until && Date.parse(range.since) >= Date.parse(range.until)) throw Object.assign(new Error('until must be later than since.'), { statusCode: 400 });
  const clauses: string[] = [];
  if (range.since) { values.push(range.since); clauses.push(`e.event_start_time >= $${values.length}::timestamptz`); }
  if (range.until) { values.push(range.until); clauses.push(`(e.event_start_time < $${values.length}::timestamptz${range.includeUndated === 'true' ? ' OR e.event_start_time IS NULL' : ''})`); }
  if (range.mode !== 'history') {
    clauses.push(`lower(coalesce(e.event_status,'')) NOT IN ('closed','finished','ended','final','cancelled','canceled','settled')`);
    clauses.push(`(e.event_start_time >= now() OR lower(e.event_status) IN ('live','inplay','inprogress','in-play')${range.includeUndated === 'true' ? ' OR e.event_start_time IS NULL' : ''})`);
    const selection = detail ? 's' : 'fresh';
    let cutoff = "now() - interval '15 minutes'";
    if (range.observedSince) { values.push(range.observedSince); cutoff = `$${values.length}::timestamptz`; }
    const fresh = `${selection}.last_seen_at >= ${cutoff} AND lower(coalesce(${selection}.selection_status,'')) NOT IN ('closed','suspended','settled','unavailable') AND (${selection}.canonical_selection_id IS NULL OR ${selection}.canonical_selection_id=${selection}.id)`;
    clauses.push(detail ? fresh : `EXISTS (SELECT 1 FROM markets fm JOIN selections fresh ON fresh.market_id=fm.id WHERE fm.event_id=e.id AND ${fresh})`);
  }
  return clauses.length ? ` AND ${clauses.join(' AND ')}` : '';
}
const sport = "coalesce(e.sport,'Sin deporte identificado')", competition = "coalesce(e.competition,'Sin competición identificada')";
export function registerCatalogRoutes(app: FastifyInstance, pool: Pool): void {
  app.get<{ Querystring: TimeRange }>('/api/data/sports', { schema: { querystring: { type: 'object', properties: dateProperties } } }, async request => {
    const values: string[] = [], where = conditions(request.query, values);
    return (await pool.query(`SELECT ${sport} AS sport,count(*)::int AS events,count(DISTINCT e.sportsbook_id)::int AS sources,min(e.event_start_time) AS first_start,max(e.event_start_time) AS last_start FROM events e WHERE true${where} GROUP BY ${sport} ORDER BY events DESC`, values)).rows;
  });
  app.get<{ Querystring: TimeRange & { sport: string } }>('/api/data/competitions', { schema: { querystring: { type: 'object', required: ['sport'], properties: { sport: { type: 'string' }, ...dateProperties } } } }, async request => {
    const values = [request.query.sport], where = conditions(request.query, values);
    return (await pool.query(`SELECT ${competition} AS competition,count(*)::int AS events,count(DISTINCT e.sportsbook_id)::int AS sources FROM events e WHERE ${sport}=$1${where} GROUP BY ${competition} ORDER BY events DESC`, values)).rows;
  });
  app.get<{ Querystring: TimeRange & { sport: string; competition: string } }>('/api/data/events', { schema: { querystring: { type: 'object', required: ['sport','competition'], properties: { sport: { type: 'string' }, competition: { type: 'string' }, ...dateProperties } } } }, async request => {
    const values = [request.query.sport, request.query.competition], where = conditions(request.query, values);
    return (await pool.query(`SELECT e.id,e.event_name,e.event_start_time,e.event_status,string_agg(DISTINCT b.key,', ' ORDER BY b.key) AS sources FROM events e JOIN sportsbooks b ON b.id=e.sportsbook_id WHERE ${sport}=$1 AND ${competition}=$2${where} GROUP BY e.id ORDER BY e.event_start_time NULLS LAST,e.id`, values)).rows;
  });
  app.get<{ Params: { id: string }; Querystring: TimeRange }>('/api/data/event/:id', { schema: { params: { type: 'object', required: ['id'], properties: { id: { type: 'string', pattern: '^[0-9]+$' } } }, querystring: { type: 'object', properties: dateProperties } } }, async request => {
    const values = [request.params.id], where = conditions(request.query, values, true);
    return (await pool.query(`SELECT b.key AS sportsbook,coalesce(s.latest_qualifiers->>'displayedBook',m.qualifiers->>'displayedBook') AS bookmaker,m.market_type,s.selection_name,o.decimal_odds,o.raw_odds,o.observed_at,s.last_seen_at AS captured_at,e.event_start_time,e.event_status,s.latest_qualifiers->>'crossValidation' AS cross_validation FROM events e JOIN sportsbooks b ON b.id=e.sportsbook_id JOIN markets m ON m.event_id=e.id JOIN selections s ON s.market_id=m.id JOIN LATERAL (SELECT decimal_odds,raw_odds,observed_at FROM odds_observations WHERE selection_id=s.id ORDER BY observed_at DESC,id DESC LIMIT 1) o ON true WHERE e.id=$1${where} ORDER BY b.key,m.market_type,s.selection_name`, values)).rows;
  });
}
