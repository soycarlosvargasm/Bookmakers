CREATE TABLE IF NOT EXISTS accessibility_extraction_profiles (
  domain TEXT PRIMARY KEY,
  source_url_id BIGINT NOT NULL REFERENCES source_urls(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('ACCESSIBILITY_RECOVERED','ACCESSIBILITY_PARTIAL','NO_ACCESSIBILITY_MARKETS','ACCESSIBILITY_UNAVAILABLE','VISUAL_COLLECTOR_CANDIDATE')),
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS accessibility_extraction_profiles_status_idx
  ON accessibility_extraction_profiles(status,last_observed_at DESC);
