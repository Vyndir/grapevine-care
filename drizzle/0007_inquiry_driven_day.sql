CREATE TABLE IF NOT EXISTS care_demo_team_inquiries (
  run_id TEXT NOT NULL REFERENCES care_demo_runs(run_id) ON DELETE CASCADE,
  inquiry_id TEXT NOT NULL,
  resident_id TEXT NOT NULL,
  caregiver_id TEXT NOT NULL,
  inquiry_type TEXT NOT NULL CHECK (inquiry_type IN ('visit_verification')),
  prompt TEXT NOT NULL CHECK (length(prompt) BETWEEN 12 AND 240),
  status TEXT NOT NULL CHECK (status IN ('awaiting_coordinator_approval', 'response_received', 'resolved', 'dismissed')),
  response_code TEXT CHECK (response_code IN ('arrived_verification_failed', 'delayed', 'cannot_attend', 'no_response')),
  response_detail TEXT,
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  responded_at TEXT,
  resolved_at TEXT,
  PRIMARY KEY (run_id, inquiry_id),
  UNIQUE (run_id, idempotency_key),
  FOREIGN KEY (run_id, caregiver_id) REFERENCES care_demo_caregivers(run_id, caregiver_id)
);

CREATE INDEX IF NOT EXISTS idx_demo_team_inquiry_run_status
  ON care_demo_team_inquiries(run_id, status, created_at DESC);

PRAGMA optimize;
