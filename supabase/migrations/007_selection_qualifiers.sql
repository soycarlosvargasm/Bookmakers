-- Selection-specific BetOnline qualifiers must not split a market identity.
CREATE OR REPLACE FUNCTION stable_market_qualifiers(value JSONB) RETURNS JSONB LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
 SELECT coalesce(jsonb_object_agg(key,val),'{}'::jsonb) FROM jsonb_each(coalesce(value,'{}'::jsonb)) AS q(key,val)
 WHERE key <> ALL(ARRAY['availableSize','probabilityPercent','orderbookVersion','insertedAt','marketStatus','mainLine','side']) AND key NOT LIKE 'selection.%';
$$;
CREATE TEMP TABLE remap_market_keys ON COMMIT DROP AS SELECT m.id,jsonb_build_object(
 'sportsbook',b.key,'event',e.source_event_id,'sourceMarketId',m.source_market_id,
 'marketType',m.market_type,'period',m.market_period,'participantPlayer',m.participant_player,
 'qualifiers',stable_market_qualifiers(m.qualifiers)) AS identity
 FROM markets m JOIN events e ON e.id=m.event_id JOIN sportsbooks b ON b.id=e.sportsbook_id;
INSERT INTO market_identities(identity,market_id) SELECT identity,min(id) FROM remap_market_keys GROUP BY identity
 ON CONFLICT(identity) DO UPDATE SET market_id=EXCLUDED.market_id;
UPDATE markets m SET canonical_market_id=k.market_id FROM remap_market_keys x JOIN market_identities k USING(identity) WHERE m.id=x.id AND m.canonical_market_id IS DISTINCT FROM k.market_id;
CREATE TEMP TABLE remap_selection_keys ON COMMIT DROP AS SELECT s.id,jsonb_build_object(
 'market',x.identity,'selection',s.selection_name,'line',s.line,'sourceSelectionId',s.source_selection_id) AS identity
 FROM selections s JOIN remap_market_keys x ON x.id=s.market_id;
INSERT INTO selection_identities(identity,selection_id) SELECT identity,min(id) FROM remap_selection_keys GROUP BY identity
 ON CONFLICT(identity) DO UPDATE SET selection_id=EXCLUDED.selection_id;
UPDATE selections s SET canonical_selection_id=k.selection_id FROM remap_selection_keys x JOIN selection_identities k USING(identity) WHERE s.id=x.id AND s.canonical_selection_id IS DISTINCT FROM k.selection_id;
UPDATE selections s SET last_seen_at=x.seen,latest_provider_timestamp=x.provider FROM
 (SELECT s.canonical_selection_id AS id,max(o.collected_at) AS seen,max(o.provider_timestamp) AS provider
 FROM selections s JOIN odds_observations o ON o.selection_id=s.id GROUP BY s.canonical_selection_id) x WHERE s.id=x.id;
