CREATE TABLE IF NOT EXISTS network_discovery_profiles (
  domain TEXT PRIMARY KEY,
  source_url_id BIGINT NOT NULL REFERENCES source_urls(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('RECOVERED','NO_USABLE_FEED','PAGE_UNAVAILABLE','NEEDS_OTHER_TECHNIQUE')),
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS network_discovery_profiles_status_idx
  ON network_discovery_profiles(status,last_observed_at DESC);
