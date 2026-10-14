-- Source event/market/selection rows remain the immutable source projection.
-- These tables add a separate, explainable cross-source canonical layer.
CREATE TABLE IF NOT EXISTS canonical_competitions (
  id BIGSERIAL PRIMARY KEY,
  sport_key TEXT NOT NULL,
  canonical_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sport_key, canonical_key)
);

CREATE TABLE IF NOT EXISTS competition_aliases (
  sport_key TEXT NOT NULL,
  alias_key TEXT NOT NULL,
  canonical_competition_id BIGINT NOT NULL REFERENCES canonical_competitions(id),
  source_namespace TEXT,
  alias_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (sport_key, alias_key)
);

CREATE TABLE IF NOT EXISTS canonical_participants (
  id BIGSERIAL PRIMARY KEY,
  sport_key TEXT NOT NULL,
  canonical_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sport_key, canonical_key)
);

CREATE TABLE IF NOT EXISTS participant_aliases (
  sport_key TEXT NOT NULL,
  alias_key TEXT NOT NULL,
  canonical_participant_id BIGINT NOT NULL REFERENCES canonical_participants(id),
  source_namespace TEXT,
  alias_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (sport_key, alias_key)
);

-- The canonical event ID is the stable, deterministic minimum source-event ID
-- in a fully evidenced component. It deliberately retains an anchor back to
-- the source projection instead of copying or altering RAW/history.
CREATE TABLE IF NOT EXISTS canonical_events (
  id BIGINT PRIMARY KEY REFERENCES events(id),
  sport_key TEXT NOT NULL,
  canonical_competition_id BIGINT REFERENCES canonical_competitions(id),
  home_participant_id BIGINT REFERENCES canonical_participants(id),
  away_participant_id BIGINT REFERENCES canonical_participants(id),
  event_start_time TIMESTAMPTZ,
  lifecycle_bucket TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS canonical_event_external_ids (
  source_namespace TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  canonical_event_id BIGINT NOT NULL REFERENCES canonical_events(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (source_namespace, external_event_id)
);

CREATE TABLE IF NOT EXISTS event_matches (
  event_id BIGINT PRIMARY KEY REFERENCES events(id),
  canonical_event_id BIGINT REFERENCES canonical_events(id),
  status TEXT NOT NULL CHECK (status IN ('MATCHED','AMBIGUOUS','UNMATCHED')),
  match_method TEXT NOT NULL,
  confidence NUMERIC(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_match_decisions (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id),
  canonical_event_id BIGINT REFERENCES canonical_events(id),
  status TEXT NOT NULL CHECK (status IN ('MATCHED','AMBIGUOUS','UNMATCHED')),
  match_method TEXT NOT NULL,
  confidence NUMERIC(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  sources JSONB NOT NULL,
  evidence JSONB NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS canonical_markets (
  id BIGSERIAL PRIMARY KEY,
  canonical_event_id BIGINT NOT NULL REFERENCES canonical_events(id),
  family TEXT NOT NULL,
  type_key TEXT NOT NULL,
  subject_kind TEXT NOT NULL,
  subject_key TEXT,
  period_key TEXT NOT NULL,
  identity_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (canonical_event_id, identity_key)
);

CREATE TABLE IF NOT EXISTS market_matches (
  market_id BIGINT PRIMARY KEY REFERENCES markets(id),
  canonical_market_id BIGINT REFERENCES canonical_markets(id),
  status TEXT NOT NULL CHECK (status IN ('MATCHED','AMBIGUOUS','UNMATCHED')),
  match_method TEXT NOT NULL,
  confidence NUMERIC(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_match_decisions (
  id BIGSERIAL PRIMARY KEY,
  market_id BIGINT NOT NULL REFERENCES markets(id),
  canonical_market_id BIGINT REFERENCES canonical_markets(id),
  status TEXT NOT NULL CHECK (status IN ('MATCHED','AMBIGUOUS','UNMATCHED')),
  match_method TEXT NOT NULL,
  confidence NUMERIC(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  sources JSONB NOT NULL,
  evidence JSONB NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS canonical_selections (
  id BIGSERIAL PRIMARY KEY,
  canonical_market_id BIGINT NOT NULL REFERENCES canonical_markets(id),
  selection_key TEXT NOT NULL,
  line_key TEXT,
  identity_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (canonical_market_id, identity_key)
);

CREATE TABLE IF NOT EXISTS selection_matches (
  selection_id BIGINT PRIMARY KEY REFERENCES selections(id),
  canonical_selection_id BIGINT REFERENCES canonical_selections(id),
  status TEXT NOT NULL CHECK (status IN ('MATCHED','AMBIGUOUS','UNMATCHED')),
  match_method TEXT NOT NULL,
  confidence NUMERIC(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS selection_match_decisions (
  id BIGSERIAL PRIMARY KEY,
  selection_id BIGINT NOT NULL REFERENCES selections(id),
  canonical_selection_id BIGINT REFERENCES canonical_selections(id),
  status TEXT NOT NULL CHECK (status IN ('MATCHED','AMBIGUOUS','UNMATCHED')),
  match_method TEXT NOT NULL,
  confidence NUMERIC(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  sources JSONB NOT NULL,
  evidence JSONB NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_matches_canonical_idx ON event_matches(canonical_event_id,status);
CREATE INDEX IF NOT EXISTS market_matches_canonical_idx ON market_matches(canonical_market_id,status);
CREATE INDEX IF NOT EXISTS selection_matches_canonical_idx ON selection_matches(canonical_selection_id,status);
CREATE INDEX IF NOT EXISTS canonical_markets_event_idx ON canonical_markets(canonical_event_id);
CREATE INDEX IF NOT EXISTS canonical_selections_market_idx ON canonical_selections(canonical_market_id);
