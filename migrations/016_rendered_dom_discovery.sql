CREATE TABLE IF NOT EXISTS dom_extraction_profiles (
  domain TEXT PRIMARY KEY,
  source_url_id BIGINT NOT NULL REFERENCES source_urls(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('DOM_RECOVERED','DOM_NO_CURRENT_MARKETS','DOM_NO_SPORTS_DATA','DOM_AMBIGUOUS','NEEDS_ACCESSIBILITY','NEEDS_VISUAL','PAGE_UNAVAILABLE')),
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dom_extraction_profiles_status_idx
  ON dom_extraction_profiles(status,last_observed_at DESC);
