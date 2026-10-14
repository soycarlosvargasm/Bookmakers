-- Legacy entities and immutable observations remain present. Registry aliases fold
-- old outcome-level markets and volatile qualifier identities into canonical IDs.
ALTER TABLE markets ADD COLUMN IF NOT EXISTS canonical_market_id BIGINT REFERENCES markets(id);
ALTER TABLE selections ADD COLUMN IF NOT EXISTS canonical_selection_id BIGINT REFERENCES selections(id);
ALTER TABLE selections ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE selections ADD COLUMN IF NOT EXISTS latest_provider_timestamp TIMESTAMPTZ;
ALTER TABLE selections ADD COLUMN IF NOT EXISTS latest_qualifiers JSONB;
CREATE TABLE IF NOT EXISTS market_identities (identity JSONB PRIMARY KEY, market_id BIGINT NOT NULL REFERENCES markets(id));
CREATE TABLE IF NOT EXISTS selection_identities (identity JSONB PRIMARY KEY, selection_id BIGINT NOT NULL REFERENCES selections(id));
CREATE OR REPLACE FUNCTION stable_market_qualifiers(value JSONB) RETURNS JSONB LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
 SELECT coalesce(value,'{}'::jsonb) - ARRAY['availableSize','probabilityPercent','orderbookVersion','insertedAt','marketStatus','mainLine','side'];
$$;
CREATE TEMP TABLE migrate_market_keys ON COMMIT DROP AS SELECT m.id, jsonb_build_object(
 'sportsbook', b.key, 'event', e.source_event_id, 'sourceMarketId', m.source_market_id,
 'marketType',m.market_type,'period',m.market_period,'participantPlayer',m.participant_player,
 'qualifiers',stable_market_qualifiers(m.qualifiers)) AS identity
 FROM markets m JOIN events e ON e.id=m.event_id JOIN sportsbooks b ON b.id=e.sportsbook_id;
INSERT INTO market_identities SELECT identity,min(id) FROM migrate_market_keys GROUP BY identity ON CONFLICT DO NOTHING;
UPDATE markets m SET canonical_market_id=k.market_id FROM migrate_market_keys x JOIN market_identities k USING(identity) WHERE m.id=x.id;
CREATE TEMP TABLE migrate_selection_keys ON COMMIT DROP AS SELECT s.id,jsonb_build_object(
 'market',x.identity,'selection',s.selection_name,'line',s.line,'sourceSelectionId',s.source_selection_id) AS identity
 FROM selections s JOIN migrate_market_keys x ON x.id=s.market_id;
INSERT INTO selection_identities SELECT identity,min(id) FROM migrate_selection_keys GROUP BY identity ON CONFLICT DO NOTHING;
UPDATE selections s SET canonical_selection_id=k.selection_id FROM migrate_selection_keys x JOIN selection_identities k USING(identity) WHERE s.id=x.id;
UPDATE selections s SET last_seen_at=x.seen,latest_provider_timestamp=x.provider FROM
 (SELECT s.canonical_selection_id AS id,max(o.collected_at) AS seen,max(o.provider_timestamp) AS provider
 FROM selections s JOIN odds_observations o ON o.selection_id=s.id GROUP BY s.canonical_selection_id) x WHERE s.id=x.id;
CREATE INDEX IF NOT EXISTS markets_canonical_idx ON markets(canonical_market_id);
CREATE INDEX IF NOT EXISTS selections_canonical_idx ON selections(canonical_selection_id);
CREATE INDEX IF NOT EXISTS selections_last_seen_idx ON selections(last_seen_at);
CREATE INDEX IF NOT EXISTS odds_observations_latest_idx ON odds_observations(selection_id,observed_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS odds_observations_page_idx ON odds_observations(observed_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS events_sport_competition_idx ON events(sport,competition,id);
CREATE INDEX IF NOT EXISTS markets_event_idx ON markets(event_id,id);
CREATE INDEX IF NOT EXISTS selections_market_idx ON selections(market_id,id);
-- Database protection also covers accidental future application UPDATE/DELETE.
CREATE OR REPLACE FUNCTION reject_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'append-only history: % forbidden',TG_OP; END $$;
CREATE TRIGGER odds_append_only BEFORE UPDATE OR DELETE ON odds_observations FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER event_versions_append_only BEFORE UPDATE OR DELETE ON event_versions FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
