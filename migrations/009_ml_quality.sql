-- ML artifacts are additive and review-only. RAW and append-only observations are untouched.
CREATE TABLE IF NOT EXISTS ml_model_versions (
  id BIGSERIAL PRIMARY KEY,
  dataset_version TEXT NOT NULL,
  feature_version TEXT NOT NULL,
  model_version TEXT NOT NULL UNIQUE,
  training_date TIMESTAMPTZ NOT NULL,
  train_count INTEGER NOT NULL,
  validation_count INTEGER NOT NULL,
  test_count INTEGER NOT NULL,
  metrics JSONB NOT NULL,
  baseline_metrics JSONB NOT NULL,
  anomaly_metrics JSONB,
  match_model JSONB,
  anomaly_model JSONB,
  report JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ml_model_versions_latest_idx ON ml_model_versions(training_date DESC,id DESC);

CREATE TABLE IF NOT EXISTS ml_match_assists (
  id BIGSERIAL PRIMARY KEY,
  pair_key TEXT NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN ('deterministic_exact','ml_match','abstain')),
  confidence NUMERIC(8,7) NOT NULL CHECK(confidence>=0 AND confidence<=1),
  reasons JSONB NOT NULL,
  features JSONB NOT NULL,
  model_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ml_match_assists_latest_idx ON ml_match_assists(created_at DESC,id DESC);

CREATE TABLE IF NOT EXISTS ml_anomalies (
  id BIGSERIAL PRIMARY KEY,
  entity_key TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  anomaly_type TEXT NOT NULL,
  score NUMERIC(12,7) NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN ('review','normal')),
  reasons JSONB NOT NULL,
  features JSONB NOT NULL,
  model_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ml_anomalies_latest_idx ON ml_anomalies(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS ml_anomalies_review_idx ON ml_anomalies(decision,observed_at DESC);
