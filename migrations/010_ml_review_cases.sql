-- Human-review queue only. No ML output is promoted to a label automatically.
CREATE TABLE IF NOT EXISTS ml_review_cases (
  id BIGSERIAL PRIMARY KEY,
  case_type TEXT NOT NULL CHECK(case_type IN ('ambiguous_match','near_match','unmatched_cross_source_event','conflicting_match','deterministic_anomaly','correction_confirmed')),
  source TEXT NOT NULL,
  left_record JSONB,
  right_record JSONB,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  dataset_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','CONFIRMED_MATCH','CONFIRMED_NON_MATCH','DISMISSED','CORRECTED')),
  ground_truth_label BOOLEAN,
  correction JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ml_review_cases_queue_idx ON ml_review_cases(status,created_at DESC,id DESC);

CREATE TABLE IF NOT EXISTS ml_review_case_revisions (
  id BIGSERIAL PRIMARY KEY,
  case_id BIGINT NOT NULL REFERENCES ml_review_cases(id),
  revision INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('OPEN','CONFIRMED_MATCH','CONFIRMED_NON_MATCH','DISMISSED','CORRECTED')),
  ground_truth_label BOOLEAN,
  correction JSONB,
  reviewer TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id,revision)
);
CREATE INDEX IF NOT EXISTS ml_review_case_revisions_case_idx ON ml_review_case_revisions(case_id,revision DESC);
