-- Explicit user decisions (join / separate) are stored beside the AI verdicts and take precedence over rules and AI.
ALTER TABLE match_resolutions DROP CONSTRAINT IF EXISTS match_resolutions_method_check;
ALTER TABLE match_resolutions ADD CONSTRAINT match_resolutions_method_check CHECK (method IN ('ai','deterministic','manual'));
