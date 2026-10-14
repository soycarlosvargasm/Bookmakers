-- Odds structured by the AI from a capture's saved text. Only quotes whose event, selection and price appear
-- literally in the cited lines are stored; the rest is kept as rejected for audit. Raw captures are never modified.
CREATE TABLE IF NOT EXISTS ai_text_extractions (
  capture_sha256 TEXT PRIMARY KEY CHECK (length(capture_sha256) = 64),
  capture_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_url TEXT,
  captured_at TIMESTAMPTZ,
  text_sha256 TEXT NOT NULL CHECK (length(text_sha256) = 64),
  model TEXT NOT NULL,
  accepted INTEGER NOT NULL CHECK (accepted >= 0),
  rejected INTEGER NOT NULL CHECK (rejected >= 0),
  quotes JSONB NOT NULL DEFAULT '[]'::jsonb,
  rejected_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_text_extractions_time ON ai_text_extractions(captured_at DESC);
ALTER TABLE ai_text_extractions ENABLE ROW LEVEL SECURITY;
