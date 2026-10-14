CREATE TABLE IF NOT EXISTS sportsbooks (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  display_name TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id BIGSERIAL PRIMARY KEY,
  sportsbook_id BIGINT NOT NULL REFERENCES sportsbooks(id),
  account_alias TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sportsbook_id, account_alias)
);

-- This table contains state and references only. Browser storage remains in a
-- private filesystem directory and is never mixed with market data tables.
CREATE TABLE IF NOT EXISTS session_metadata (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL UNIQUE REFERENCES accounts(id),
  state TEXT NOT NULL CHECK (state IN ('NOT_CONFIGURED','AUTH_REQUIRED','AUTHENTICATING','ACTIVE','EXPIRED','LOCKED','ERROR')),
  private_storage_ref TEXT,
  last_validated_at TIMESTAMPTZ,
  error_message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS raw_payloads (
  id BIGSERIAL PRIMARY KEY,
  sportsbook TEXT NOT NULL,
  account_alias TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_url TEXT,
  retrieved_at TIMESTAMPTZ NOT NULL,
  provider_timestamp TIMESTAMPTZ,
  external_event_id TEXT,
  raw_payload JSONB NOT NULL,
  parser_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  sportsbook_id BIGINT REFERENCES sportsbooks(id),
  source_event_id TEXT NOT NULL,
  sport TEXT,
  competition TEXT,
  event_name TEXT,
  participants JSONB,
  home_participant TEXT,
  away_participant TEXT,
  event_start_time TIMESTAMPTZ,
  event_status TEXT,
  phase TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sportsbook_id, source_event_id)
);

-- Append-only event snapshots. The current event row is a lookup projection;
-- historical changes are represented here and are never updated in place.
CREATE TABLE IF NOT EXISTS event_versions (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id),
  observed_at TIMESTAMPTZ NOT NULL,
  version_payload JSONB NOT NULL,
  parser_version TEXT
);

CREATE TABLE IF NOT EXISTS markets (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id),
  market_type TEXT,
  market_period TEXT,
  participant_player TEXT,
  qualifiers JSONB,
  market_identity TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS selections (
  id BIGSERIAL PRIMARY KEY,
  market_id BIGINT NOT NULL REFERENCES markets(id),
  selection_name TEXT,
  line TEXT,
  source_selection_id TEXT,
  qualifiers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (market_id, selection_name, line, source_selection_id)
);

-- This is append-only: a new price produces a new row. Heartbeats may be
-- stored explicitly when operational audit requires them, without duplicating
-- the price-change stream.
CREATE TABLE IF NOT EXISTS odds_observations (
  id BIGSERIAL PRIMARY KEY,
  selection_id BIGINT NOT NULL REFERENCES selections(id),
  observed_at TIMESTAMPTZ NOT NULL,
  decimal_odds NUMERIC(18,8),
  raw_odds TEXT,
  raw_odds_format TEXT,
  observation_kind TEXT NOT NULL CHECK (observation_kind IN ('price_change','heartbeat')),
  source_url TEXT,
  provider_timestamp TIMESTAMPTZ,
  collected_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS collector_runs (
  id BIGSERIAL PRIMARY KEY,
  sportsbook TEXT NOT NULL,
  account_alias TEXT NOT NULL,
  mode TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  records_seen INTEGER NOT NULL DEFAULT 0,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS source_health (
  id BIGSERIAL PRIMARY KEY,
  sportsbook TEXT NOT NULL,
  account_alias TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('HEALTHY','DEGRADED','AUTH_REQUIRED','UNHEALTHY','DISABLED')),
  checked_at TIMESTAMPTZ NOT NULL,
  message TEXT
);

CREATE INDEX IF NOT EXISTS raw_payloads_lookup_idx ON raw_payloads (sportsbook, account_alias, retrieved_at DESC);
CREATE INDEX IF NOT EXISTS event_versions_history_idx ON event_versions (event_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS odds_observations_history_idx ON odds_observations (selection_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS source_health_latest_idx ON source_health (sportsbook, account_alias, checked_at DESC);
