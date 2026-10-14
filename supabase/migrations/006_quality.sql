CREATE TABLE IF NOT EXISTS quality_findings (
  id BIGSERIAL PRIMARY KEY,
  collector_run_id BIGINT REFERENCES collector_runs(id),
  source TEXT NOT NULL,
  code TEXT NOT NULL CHECK(code IN ('ZERO_RECORDS','MISSING_PRICE','SCHEMA_DRIFT','TIMESTAMP_REGRESSION')),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  count INTEGER NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS quality_findings_source_latest_idx ON quality_findings(source,observed_at DESC);
