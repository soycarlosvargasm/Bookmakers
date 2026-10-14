-- Matching layer: verdicts about whether two source events are the same real-world match.
-- Deterministic rules decide the clear cases in memory; only ambiguous pairs are sent to the AI and
-- its verdict is stored here so it is never asked twice. No prices are stored or modified here.
CREATE TABLE IF NOT EXISTS match_resolutions (
  pair_key TEXT PRIMARY KEY CHECK (length(pair_key) = 40),
  left_signature TEXT NOT NULL,
  right_signature TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('SAME','DIFFERENT','UNSURE')),
  swapped BOOLEAN NOT NULL DEFAULT false,
  confidence NUMERIC(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  method TEXT NOT NULL CHECK (method IN ('ai','deterministic')),
  model TEXT,
  reason TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS match_resolutions_decided_idx ON match_resolutions(decided_at DESC);
ALTER TABLE match_resolutions ENABLE ROW LEVEL SECURITY;
