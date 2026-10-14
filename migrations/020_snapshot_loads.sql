CREATE TABLE IF NOT EXISTS snapshot_loads (
  sha256 TEXT PRIMARY KEY CHECK (length(sha256) = 64),
  file_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  records_submitted INTEGER NOT NULL CHECK (records_submitted > 0),
  loaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
