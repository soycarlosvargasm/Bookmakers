ALTER TABLE ai_text_extractions ADD COLUMN IF NOT EXISTS pipeline_version TEXT NOT NULL DEFAULT 'legacy-text-v1';
ALTER TABLE ai_text_extractions ADD COLUMN IF NOT EXISTS report JSONB NOT NULL DEFAULT '{}'::jsonb;
