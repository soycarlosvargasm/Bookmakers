-- Preserve the wrongly parsed live-validation observations as immutable evidence.
-- Flag only the audited 2026-09-17 capture window and value pattern.
CREATE TABLE IF NOT EXISTS odds_observation_flags (
  observation_id BIGINT PRIMARY KEY REFERENCES odds_observations(id),
  code TEXT NOT NULL,
  flagged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);
INSERT INTO odds_observation_flags(observation_id,code,details)
SELECT o.id,'ACTION_SPREAD_SWAPPED',jsonb_build_object('reason','spread price and handicap reversed during 2026-09-17 live validation')
FROM odds_observations o
JOIN selections s ON s.id=o.selection_id JOIN markets m ON m.id=s.market_id
JOIN events e ON e.id=m.event_id JOIN sportsbooks b ON b.id=e.sportsbook_id
WHERE b.key LIKE 'actionnetwork-%' AND m.market_type='spread'
  AND o.collected_at >= TIMESTAMPTZ '2026-09-17T06:24:21Z'
  AND o.collected_at < TIMESTAMPTZ '2026-09-17T06:27:10Z'
  AND CASE WHEN o.raw_odds ~ '^[-+]?[0-9]+(\.[0-9]+)?$' AND s.line ~ '^[-+]?[0-9]+(\.[0-9]+)?$' THEN abs(o.raw_odds::numeric)<50 AND abs(s.line::numeric)>=50 ELSE FALSE END
ON CONFLICT DO NOTHING;
INSERT INTO quality_findings(source,code,count,details)
SELECT 'actionnetwork','SCHEMA_DRIFT',count(*)::int,jsonb_build_object('reason','audited Action Network spread mapping error; affected observations flagged, immutable')
FROM odds_observation_flags WHERE code='ACTION_SPREAD_SWAPPED'
HAVING count(*)>0;
