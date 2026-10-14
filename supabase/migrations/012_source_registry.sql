CREATE TABLE IF NOT EXISTS source_ingestion_runs (
  id BIGSERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('RUNNING','SUCCEEDED','FAILED')),
  urls_total INTEGER NOT NULL DEFAULT 0,
  urls_attempted INTEGER NOT NULL DEFAULT 0,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS source_urls (
  id BIGSERIAL PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL,
  adapter_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS source_registry (
  id BIGSERIAL PRIMARY KEY,
  source_url_id BIGINT NOT NULL REFERENCES source_urls(id) ON DELETE CASCADE,
  sport TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('Agregador','Sportsbook','Exchange')),
  catalog_status TEXT NOT NULL CHECK (catalog_status IN ('ACTIVA','CANDIDATA','BLOQUEADA')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_url_id,sport,source_name)
);

CREATE TABLE IF NOT EXISTS source_url_attempts (
  id BIGSERIAL PRIMARY KEY,
  run_id BIGINT NOT NULL REFERENCES source_ingestion_runs(id) ON DELETE CASCADE,
  source_url_id BIGINT NOT NULL REFERENCES source_urls(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ NOT NULL,
  runtime_status TEXT NOT NULL CHECK (runtime_status IN ('WORKING','PARTIAL','BLOCKED','BROKEN','NO_CURRENT_MARKETS','INVALID_URL')),
  strategy TEXT NOT NULL,
  http_status INTEGER,
  final_url TEXT,
  record_count INTEGER NOT NULL DEFAULT 0,
  raw_count INTEGER NOT NULL DEFAULT 0,
  raw_payload_id BIGINT REFERENCES raw_payloads(id),
  failure_reason TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(run_id,source_url_id)
);

CREATE TABLE IF NOT EXISTS source_url_health (
  source_url_id BIGINT PRIMARY KEY REFERENCES source_urls(id) ON DELETE CASCADE,
  runtime_status TEXT NOT NULL CHECK (runtime_status IN ('WORKING','PARTIAL','BLOCKED','BROKEN','NO_CURRENT_MARKETS','INVALID_URL')),
  last_attempt TIMESTAMPTZ NOT NULL,
  last_success TIMESTAMPTZ,
  last_http_status INTEGER,
  last_strategy TEXT NOT NULL,
  failure_reason TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS source_registry_sport_idx ON source_registry(sport);
CREATE INDEX IF NOT EXISTS source_urls_domain_idx ON source_urls(domain);
CREATE INDEX IF NOT EXISTS source_url_attempts_status_idx ON source_url_attempts(run_id,runtime_status);
CREATE INDEX IF NOT EXISTS source_url_attempts_url_idx ON source_url_attempts(source_url_id,finished_at DESC);
