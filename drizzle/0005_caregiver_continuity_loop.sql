PRAGMA foreign_keys = OFF;

CREATE TABLE care_demo_runs_operations (
  run_id TEXT PRIMARY KEY,
  resident_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  timezone TEXT NOT NULL,
  simulated_time TEXT NOT NULL,
  scenario TEXT NOT NULL CHECK (scenario IN ('on_schedule', 'missed_window', 'care_story', 'coverage_callout', 'door_fault', 'device_offline')),
  severity TEXT NOT NULL CHECK (severity IN ('routine', 'attention', 'urgent')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  evidence_version INTEGER NOT NULL DEFAULT 1,
  care_plan_version TEXT NOT NULL DEFAULT 'v4',
  care_plan_effective_at TEXT NOT NULL DEFAULT '2026-08-31T07:00:00-04:00',
  care_plan_authorized_by TEXT NOT NULL DEFAULT 'Nurse Ava',
  care_plan_authorization_role TEXT NOT NULL DEFAULT 'Care team RN'
);

INSERT INTO care_demo_runs_operations
  (run_id, resident_id, display_name, timezone, simulated_time, scenario, severity, created_at, updated_at, evidence_version, care_plan_version, care_plan_effective_at, care_plan_authorized_by, care_plan_authorization_role)
SELECT run_id, resident_id, display_name, timezone, simulated_time, scenario, severity, created_at, updated_at, evidence_version, care_plan_version, care_plan_effective_at, care_plan_authorized_by, care_plan_authorization_role
FROM care_demo_runs;

DROP TABLE care_demo_runs;
ALTER TABLE care_demo_runs_operations RENAME TO care_demo_runs;

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS care_demo_caregivers (
  run_id TEXT NOT NULL REFERENCES care_demo_runs(run_id) ON DELETE CASCADE,
  caregiver_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  previous_resident_visits INTEGER NOT NULL CHECK (previous_resident_visits >= 0),
  last_resident_shift_at TEXT,
  scheduled_weekly_hours INTEGER NOT NULL CHECK (scheduled_weekly_hours BETWEEN 0 AND 80),
  preferred_max_hours INTEGER NOT NULL CHECK (preferred_max_hours BETWEEN 1 AND 80),
  current_assignment_summary TEXT NOT NULL,
  PRIMARY KEY (run_id, caregiver_id)
);

CREATE TABLE IF NOT EXISTS care_demo_caregiver_availability (
  run_id TEXT NOT NULL REFERENCES care_demo_runs(run_id) ON DELETE CASCADE,
  caregiver_id TEXT NOT NULL,
  available_from TEXT NOT NULL,
  available_until TEXT NOT NULL,
  availability_status TEXT NOT NULL CHECK (availability_status IN ('available', 'unavailable', 'partial')),
  reason TEXT NOT NULL,
  PRIMARY KEY (run_id, caregiver_id),
  FOREIGN KEY (run_id, caregiver_id) REFERENCES care_demo_caregivers(run_id, caregiver_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS care_demo_caregiver_readiness (
  run_id TEXT NOT NULL REFERENCES care_demo_runs(run_id) ON DELETE CASCADE,
  caregiver_id TEXT NOT NULL,
  core_training_current INTEGER NOT NULL CHECK (core_training_current IN (0, 1)),
  role_qualification_current INTEGER NOT NULL CHECK (role_qualification_current IN (0, 1)),
  resident_orientation_complete INTEGER NOT NULL CHECK (resident_orientation_complete IN (0, 1)),
  acknowledged_care_plan_version TEXT,
  PRIMARY KEY (run_id, caregiver_id),
  FOREIGN KEY (run_id, caregiver_id) REFERENCES care_demo_caregivers(run_id, caregiver_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS care_demo_shifts (
  run_id TEXT NOT NULL REFERENCES care_demo_runs(run_id) ON DELETE CASCADE,
  shift_id TEXT NOT NULL,
  resident_id TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  required_role TEXT NOT NULL,
  required_orientation_plan_version TEXT NOT NULL,
  original_caregiver_id TEXT NOT NULL,
  assigned_caregiver_id TEXT,
  next_caregiver_id TEXT,
  coverage_status TEXT NOT NULL CHECK (coverage_status IN ('covered', 'coverage_needed', 'awaiting_scheduler_approval', 'assigned')),
  visit_status TEXT NOT NULL CHECK (visit_status IN ('not_started', 'in_progress', 'completed')),
  handoff_status TEXT NOT NULL CHECK (handoff_status IN ('not_ready', 'ready', 'awaiting_caregiver_approval', 'available_to_next_caregiver', 'acknowledged')),
  disruption_reason TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (run_id, shift_id),
  FOREIGN KEY (run_id, original_caregiver_id) REFERENCES care_demo_caregivers(run_id, caregiver_id),
  FOREIGN KEY (run_id, assigned_caregiver_id) REFERENCES care_demo_caregivers(run_id, caregiver_id),
  FOREIGN KEY (run_id, next_caregiver_id) REFERENCES care_demo_caregivers(run_id, caregiver_id)
);

CREATE TABLE IF NOT EXISTS care_demo_schedule_snapshots (
  run_id TEXT NOT NULL REFERENCES care_demo_runs(run_id) ON DELETE CASCADE,
  snapshot_id TEXT NOT NULL,
  shift_id TEXT NOT NULL,
  shift_version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (run_id, snapshot_id),
  FOREIGN KEY (run_id, shift_id) REFERENCES care_demo_shifts(run_id, shift_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS care_demo_coverage_proposals (
  run_id TEXT NOT NULL REFERENCES care_demo_runs(run_id) ON DELETE CASCADE,
  proposal_id TEXT NOT NULL,
  shift_id TEXT NOT NULL,
  caregiver_id TEXT NOT NULL,
  schedule_snapshot_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 12 AND 360),
  status TEXT NOT NULL CHECK (status IN ('awaiting_scheduler_approval', 'approved_in_demo', 'dismissed')),
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  PRIMARY KEY (run_id, proposal_id),
  UNIQUE (run_id, idempotency_key),
  FOREIGN KEY (run_id, shift_id) REFERENCES care_demo_shifts(run_id, shift_id) ON DELETE CASCADE,
  FOREIGN KEY (run_id, caregiver_id) REFERENCES care_demo_caregivers(run_id, caregiver_id),
  FOREIGN KEY (run_id, schedule_snapshot_id) REFERENCES care_demo_schedule_snapshots(run_id, snapshot_id)
);

CREATE TABLE IF NOT EXISTS care_demo_visit_events (
  run_id TEXT NOT NULL REFERENCES care_demo_runs(run_id) ON DELETE CASCADE,
  visit_event_id TEXT NOT NULL,
  shift_id TEXT NOT NULL,
  caregiver_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('shift_checked_in', 'routine_completed', 'meal_delivered', 'caregiver_observation', 'shift_checked_out')),
  summary TEXT NOT NULL,
  detail TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  evidence_class TEXT NOT NULL,
  PRIMARY KEY (run_id, visit_event_id),
  FOREIGN KEY (run_id, shift_id) REFERENCES care_demo_shifts(run_id, shift_id) ON DELETE CASCADE,
  FOREIGN KEY (run_id, caregiver_id) REFERENCES care_demo_caregivers(run_id, caregiver_id)
);

CREATE TABLE IF NOT EXISTS care_demo_shift_handoffs (
  run_id TEXT NOT NULL REFERENCES care_demo_runs(run_id) ON DELETE CASCADE,
  shift_handoff_id TEXT NOT NULL,
  shift_id TEXT NOT NULL,
  from_caregiver_id TEXT NOT NULL,
  to_caregiver_id TEXT NOT NULL,
  schedule_snapshot_id TEXT NOT NULL,
  completed_json TEXT NOT NULL,
  observed_json TEXT NOT NULL,
  unresolved_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('awaiting_caregiver_approval', 'available_to_next_caregiver', 'dismissed', 'acknowledged')),
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  PRIMARY KEY (run_id, shift_handoff_id),
  UNIQUE (run_id, idempotency_key),
  FOREIGN KEY (run_id, shift_id) REFERENCES care_demo_shifts(run_id, shift_id) ON DELETE CASCADE,
  FOREIGN KEY (run_id, from_caregiver_id) REFERENCES care_demo_caregivers(run_id, caregiver_id),
  FOREIGN KEY (run_id, to_caregiver_id) REFERENCES care_demo_caregivers(run_id, caregiver_id),
  FOREIGN KEY (run_id, schedule_snapshot_id) REFERENCES care_demo_schedule_snapshots(run_id, snapshot_id)
);

CREATE TABLE IF NOT EXISTS care_demo_handoff_acknowledgements (
  run_id TEXT NOT NULL REFERENCES care_demo_runs(run_id) ON DELETE CASCADE,
  acknowledgement_id TEXT NOT NULL,
  shift_handoff_id TEXT NOT NULL,
  caregiver_id TEXT NOT NULL,
  acknowledged_at TEXT NOT NULL,
  PRIMARY KEY (run_id, acknowledgement_id),
  UNIQUE (run_id, shift_handoff_id, caregiver_id),
  FOREIGN KEY (run_id, shift_handoff_id) REFERENCES care_demo_shift_handoffs(run_id, shift_handoff_id) ON DELETE CASCADE,
  FOREIGN KEY (run_id, caregiver_id) REFERENCES care_demo_caregivers(run_id, caregiver_id)
);

CREATE INDEX IF NOT EXISTS idx_demo_shifts_run_status_start
  ON care_demo_shifts(run_id, coverage_status, starts_at);
CREATE INDEX IF NOT EXISTS idx_demo_coverage_run_status_created
  ON care_demo_coverage_proposals(run_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_visit_events_run_shift_time
  ON care_demo_visit_events(run_id, shift_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_demo_shift_handoffs_run_status_created
  ON care_demo_shift_handoffs(run_id, status, created_at DESC);

PRAGMA optimize;
