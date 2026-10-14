CREATE TABLE IF NOT EXISTS collector_captures (
  sha256 TEXT PRIMARY KEY CHECK (length(sha256) = 64),
  file_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_url TEXT,
  method TEXT,
  captured_at TIMESTAMPTZ,
  record_count INTEGER NOT NULL CHECK (record_count >= 0),
  snapshot JSONB NOT NULL,
  stored_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS collector_captures_source_time
  ON collector_captures(source_type, captured_at DESC);
ALTER TABLE collector_captures ENABLE ROW LEVEL SECURITY;
