PRAGMA foreign_keys = OFF;

CREATE TABLE care_demo_runs_longitudinal (
  run_id TEXT PRIMARY KEY,
  resident_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  timezone TEXT NOT NULL,
  simulated_time TEXT NOT NULL,
  scenario TEXT NOT NULL CHECK (scenario IN ('on_schedule', 'missed_window', 'care_story', 'door_fault', 'device_offline')),
  severity TEXT NOT NULL CHECK (severity IN ('routine', 'attention', 'urgent')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  evidence_version INTEGER NOT NULL DEFAULT 1,
  care_plan_version TEXT NOT NULL DEFAULT 'v4',
  care_plan_effective_at TEXT NOT NULL DEFAULT '2026-08-31T07:00:00-04:00',
  care_plan_authorized_by TEXT NOT NULL DEFAULT 'Nurse Ava',
  care_plan_authorization_role TEXT NOT NULL DEFAULT 'Care team RN'
);

INSERT INTO care_demo_runs_longitudinal
  (run_id, resident_id, display_name, timezone, simulated_time, scenario, severity, created_at, updated_at, evidence_version, care_plan_version, care_plan_effective_at, care_plan_authorized_by, care_plan_authorization_role)
SELECT run_id, resident_id, display_name, timezone, simulated_time, scenario, severity, created_at, updated_at, evidence_version, care_plan_version, care_plan_effective_at, care_plan_authorized_by, care_plan_authorization_role
FROM care_demo_runs;

DROP TABLE care_demo_runs;
ALTER TABLE care_demo_runs_longitudinal RENAME TO care_demo_runs;

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS care_demo_profiles (
  run_id TEXT PRIMARY KEY REFERENCES care_demo_runs(run_id) ON DELETE CASCADE,
  resident_id TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age BETWEEN 18 AND 120),
  living_arrangement TEXT NOT NULL,
  support_schedule TEXT NOT NULL,
  relevant_history_json TEXT NOT NULL,
  baseline_json TEXT NOT NULL,
  preferences_json TEXT NOT NULL,
  source TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS care_demo_monitoring_rules (
  run_id TEXT NOT NULL REFERENCES care_demo_runs(run_id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL,
  resident_id TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  instruction TEXT NOT NULL,
  threshold_description TEXT NOT NULL,
  authorized_by TEXT NOT NULL,
  plan_version TEXT NOT NULL,
  PRIMARY KEY (run_id, rule_id)
);

CREATE TABLE IF NOT EXISTS care_demo_handoffs (
  run_id TEXT NOT NULL REFERENCES care_demo_runs(run_id) ON DELETE CASCADE,
  handoff_id TEXT NOT NULL,
  resident_id TEXT NOT NULL,
  review_type TEXT NOT NULL CHECK (review_type IN ('nurse_review', 'shift_handoff')),
  period_hours INTEGER NOT NULL CHECK (period_hours IN (24, 72)),
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 12 AND 320),
  evidence_snapshot_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('awaiting_human_approval', 'approved_in_demo', 'dismissed')),
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  PRIMARY KEY (run_id, handoff_id),
  UNIQUE (run_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_demo_monitoring_rules_run_category
  ON care_demo_monitoring_rules(run_id, category);
CREATE INDEX IF NOT EXISTS idx_demo_handoffs_run_status_created
  ON care_demo_handoffs(run_id, status, created_at DESC);

PRAGMA optimize;
