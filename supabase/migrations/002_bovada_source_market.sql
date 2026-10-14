ALTER TABLE markets ADD COLUMN IF NOT EXISTS source_market_id TEXT;
CREATE INDEX IF NOT EXISTS markets_source_market_idx ON markets (source_market_id);
