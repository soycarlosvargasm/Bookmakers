-- BetOnline passive-observation audit fields. Frames remain append-only RAW.
ALTER TABLE raw_payloads ADD COLUMN IF NOT EXISTS source_topic TEXT;
ALTER TABLE raw_payloads ADD COLUMN IF NOT EXISTS source_request_id TEXT;
ALTER TABLE raw_payloads ADD COLUMN IF NOT EXISTS observation_direction TEXT CHECK (observation_direction IN ('sent', 'received'));
ALTER TABLE raw_payloads ADD COLUMN IF NOT EXISTS payload_size_bytes INTEGER;
ALTER TABLE raw_payloads ADD COLUMN IF NOT EXISTS normalized_record_count INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS live_score JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS live_clock TEXT;
ALTER TABLE selections ADD COLUMN IF NOT EXISTS selection_status TEXT;

CREATE INDEX IF NOT EXISTS raw_payloads_betonline_audit_idx
  ON raw_payloads (sportsbook, source_type, retrieved_at DESC);
CREATE INDEX IF NOT EXISTS raw_payloads_topic_idx
  ON raw_payloads (source_topic) WHERE source_topic IS NOT NULL;
