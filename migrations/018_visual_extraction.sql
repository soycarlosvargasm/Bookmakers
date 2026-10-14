CREATE TABLE IF NOT EXISTS visual_extraction_profiles (
  domain TEXT PRIMARY KEY,
  source_url_id BIGINT NOT NULL REFERENCES source_urls(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('VISUAL_RECOVERED','VISUAL_PARTIAL','NO_VISUAL_MARKETS','VISUAL_BLOCKED','VISUAL_UNRESOLVED')),
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS visual_extraction_profiles_status_idx ON visual_extraction_profiles(status,last_observed_at DESC);
