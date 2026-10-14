ALTER TABLE collector_runs ADD COLUMN IF NOT EXISTS lease_owner TEXT;
ALTER TABLE collector_runs ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMPTZ;
ALTER TABLE collector_runs ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ;
-- Legacy workers have no renewable ownership. Preserve their audit records.
UPDATE collector_runs SET status='FAILED', finished_at=now(),
  error_message=COALESCE(error_message || '; ', '') || 'Abandoned legacy run reconciled during lease migration'
WHERE status='RUNNING' AND lease_owner IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS collector_runs_one_active_source_idx ON collector_runs(sportsbook, account_alias) WHERE status='RUNNING';
CREATE INDEX IF NOT EXISTS collector_runs_expired_lease_idx ON collector_runs(lease_expires_at) WHERE status='RUNNING';
