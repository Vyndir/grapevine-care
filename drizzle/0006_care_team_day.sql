PRAGMA foreign_keys = OFF;

CREATE TABLE care_demo_runs_team_day (
  run_id TEXT PRIMARY KEY,
  resident_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  timezone TEXT NOT NULL,
  simulated_time TEXT NOT NULL,
  scenario TEXT NOT NULL CHECK (scenario IN ('on_schedule', 'missed_window', 'care_story', 'coverage_callout', 'care_team_day', 'door_fault', 'device_offline')),
  severity TEXT NOT NULL CHECK (severity IN ('routine', 'attention', 'urgent')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  evidence_version INTEGER NOT NULL DEFAULT 1,
  care_plan_version TEXT NOT NULL DEFAULT 'v4',
  care_plan_effective_at TEXT NOT NULL DEFAULT '2026-08-31T07:00:00-04:00',
  care_plan_authorized_by TEXT NOT NULL DEFAULT 'Nurse Ava',
  care_plan_authorization_role TEXT NOT NULL DEFAULT 'Care team RN',
  care_team_step INTEGER NOT NULL DEFAULT 0 CHECK (care_team_step BETWEEN 0 AND 6)
);

INSERT INTO care_demo_runs_team_day
  (run_id, resident_id, display_name, timezone, simulated_time, scenario, severity, created_at, updated_at, evidence_version, care_plan_version, care_plan_effective_at, care_plan_authorized_by, care_plan_authorization_role, care_team_step)
SELECT run_id, resident_id, display_name, timezone, simulated_time, scenario, severity, created_at, updated_at, evidence_version, care_plan_version, care_plan_effective_at, care_plan_authorized_by, care_plan_authorization_role, 0
FROM care_demo_runs;

DROP TABLE care_demo_runs;
ALTER TABLE care_demo_runs_team_day RENAME TO care_demo_runs;

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS care_demo_orientation_packets (
  run_id TEXT NOT NULL REFERENCES care_demo_runs(run_id) ON DELETE CASCADE,
  packet_id TEXT NOT NULL,
  resident_id TEXT NOT NULL,
  caregiver_id TEXT NOT NULL,
  care_plan_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('awaiting_caregiver_acknowledgement', 'acknowledged')),
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 12 AND 320),
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  acknowledged_at TEXT,
  PRIMARY KEY (run_id, packet_id),
  UNIQUE (run_id, idempotency_key),
  FOREIGN KEY (run_id, caregiver_id) REFERENCES care_demo_caregivers(run_id, caregiver_id)
);

CREATE INDEX IF NOT EXISTS idx_demo_orientation_run_status
  ON care_demo_orientation_packets(run_id, status, created_at DESC);

PRAGMA optimize;
