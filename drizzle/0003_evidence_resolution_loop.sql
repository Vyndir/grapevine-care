PRAGMA foreign_keys = ON;

ALTER TABLE care_demo_runs ADD COLUMN evidence_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE care_demo_runs ADD COLUMN care_plan_version TEXT NOT NULL DEFAULT 'v4';
ALTER TABLE care_demo_runs ADD COLUMN care_plan_effective_at TEXT NOT NULL DEFAULT '2026-08-31T07:00:00-04:00';
ALTER TABLE care_demo_runs ADD COLUMN care_plan_authorized_by TEXT NOT NULL DEFAULT 'Nurse Ava';
ALTER TABLE care_demo_runs ADD COLUMN care_plan_authorization_role TEXT NOT NULL DEFAULT 'Care team RN';

ALTER TABLE care_demo_devices ADD COLUMN sensor_health TEXT NOT NULL DEFAULT 'nominal';
ALTER TABLE care_demo_devices ADD COLUMN applied_plan_version TEXT;

ALTER TABLE care_demo_events ADD COLUMN actor_type TEXT NOT NULL DEFAULT 'device'
  CHECK (actor_type IN ('device', 'resident', 'caregiver', 'care_team', 'agent', 'system'));
ALTER TABLE care_demo_events ADD COLUMN actor_id TEXT NOT NULL DEFAULT 'legacy-source';
ALTER TABLE care_demo_events ADD COLUMN evidence_type TEXT NOT NULL DEFAULT 'observation'
  CHECK (evidence_type IN ('observation', 'self_report', 'plan_record', 'prepared_action', 'human_decision', 'diagnostic'));
ALTER TABLE care_demo_events ADD COLUMN observed_at TEXT;
ALTER TABLE care_demo_events ADD COLUMN recorded_at TEXT;
ALTER TABLE care_demo_events ADD COLUMN trust_boundary TEXT NOT NULL DEFAULT 'simulated_evidence';
ALTER TABLE care_demo_events ADD COLUMN plan_version TEXT;

ALTER TABLE care_demo_actions ADD COLUMN evidence_snapshot_id TEXT;

CREATE TABLE IF NOT EXISTS care_demo_evidence_snapshots (
  run_id TEXT NOT NULL REFERENCES care_demo_runs(run_id) ON DELETE CASCADE,
  snapshot_id TEXT NOT NULL,
  resident_id TEXT NOT NULL,
  evidence_version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (run_id, snapshot_id)
);

CREATE TABLE IF NOT EXISTS care_demo_resident_check_ins (
  run_id TEXT NOT NULL REFERENCES care_demo_runs(run_id) ON DELETE CASCADE,
  check_in_id TEXT NOT NULL,
  resident_id TEXT NOT NULL,
  prompt TEXT NOT NULL CHECK (length(prompt) BETWEEN 8 AND 180),
  status TEXT NOT NULL CHECK (status IN ('awaiting_resident', 'responded')),
  response_code TEXT CHECK (response_code IN ('im_okay', 'not_sure', 'contact_caregiver')),
  evidence_snapshot_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  responded_at TEXT,
  PRIMARY KEY (run_id, check_in_id),
  UNIQUE (run_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS care_demo_device_checks (
  run_id TEXT NOT NULL REFERENCES care_demo_runs(run_id) ON DELETE CASCADE,
  check_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  PRIMARY KEY (run_id, check_id),
  UNIQUE (run_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_demo_snapshots_run_version
  ON care_demo_evidence_snapshots(run_id, evidence_version);
CREATE INDEX IF NOT EXISTS idx_demo_resident_check_ins_run_status
  ON care_demo_resident_check_ins(run_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_device_checks_run_time
  ON care_demo_device_checks(run_id, observed_at DESC);

PRAGMA optimize;
