-- Separate, refreshable sports identity/logo catalog. No changes to odds or RAW history.
CREATE TABLE IF NOT EXISTS sports_logo_entities (
  betflux_entity_id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('team','club','national_team','league','tournament','federation','sport')),
  sport_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  country TEXT,
  competition TEXT,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  external_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sports_logo_assets (
  sha256 TEXT PRIMARY KEY CHECK (length(sha256) = 64),
  source_key TEXT NOT NULL,
  source_url TEXT,
  canonical_path TEXT NOT NULL,
  source_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
  media_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL,
  width INTEGER,
  height INTEGER,
  has_alpha BOOLEAN,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sports_logo_candidates (
  betflux_entity_id TEXT NOT NULL REFERENCES sports_logo_entities(betflux_entity_id) ON DELETE CASCADE,
  asset_sha256 TEXT NOT NULL REFERENCES sports_logo_assets(sha256) ON DELETE CASCADE,
  source_key TEXT NOT NULL,
  match_method TEXT NOT NULL,
  confidence NUMERIC(5,4) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  quality_score NUMERIC(5,4) NOT NULL CHECK (quality_score BETWEEN 0 AND 1),
  source_rank INTEGER NOT NULL,
  selected BOOLEAN NOT NULL DEFAULT FALSE,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (betflux_entity_id, asset_sha256)
);

CREATE UNIQUE INDEX IF NOT EXISTS sports_logo_one_selected_per_entity
  ON sports_logo_candidates (betflux_entity_id) WHERE selected;
CREATE INDEX IF NOT EXISTS sports_logo_candidates_asset_idx
  ON sports_logo_candidates (asset_sha256);
CREATE INDEX IF NOT EXISTS sports_logo_entities_type_idx
  ON sports_logo_entities (sport_key, entity_type, country);

CREATE OR REPLACE VIEW sports_entity_logos AS
SELECT e.betflux_entity_id, e.entity_type, e.sport_key, e.display_name,
       a.sha256, a.canonical_path, a.source_url, a.media_type,
       c.confidence, c.match_method, c.source_key, c.evaluated_at
FROM sports_logo_entities e
JOIN sports_logo_candidates c
  ON c.betflux_entity_id = e.betflux_entity_id AND c.selected
JOIN sports_logo_assets a ON a.sha256 = c.asset_sha256;
