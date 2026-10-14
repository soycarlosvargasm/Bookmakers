-- Direct, traceable lookup for: event + market + selection + line -> sources.
-- One row is a retained normalized source selection; pricing history remains in
-- odds_observations and is deliberately not aggregated here.
CREATE OR REPLACE VIEW canonical_selection_sources AS
SELECT
  ce.id AS canonical_event_id,
  cm.id AS canonical_market_id,
  cs.id AS canonical_selection_id,
  ce.sport_key,
  cm.family,
  cm.type_key,
  cm.subject_kind,
  cm.subject_key,
  cm.period_key,
  cs.selection_key,
  cs.line_key,
  b.key AS source,
  e.id AS source_event_row_id,
  e.source_event_id,
  e.event_name,
  e.home_participant,
  e.away_participant,
  e.event_start_time,
  m.id AS source_market_row_id,
  m.source_market_id,
  m.market_type,
  m.market_period,
  m.participant_player,
  s.id AS source_selection_row_id,
  s.source_selection_id,
  s.selection_name,
  s.line AS source_line,
  s.last_seen_at AS source_last_seen_at,
  sm.match_method,
  sm.confidence,
  sm.evidence,
  sm.evaluated_at
FROM selection_matches sm
JOIN canonical_selections cs ON cs.id=sm.canonical_selection_id
JOIN canonical_markets cm ON cm.id=cs.canonical_market_id
JOIN canonical_events ce ON ce.id=cm.canonical_event_id
JOIN selections s ON s.id=sm.selection_id
JOIN markets m ON m.id=s.market_id
JOIN events e ON e.id=m.event_id
JOIN sportsbooks b ON b.id=e.sportsbook_id
WHERE sm.status='MATCHED';
