DROP INDEX IF EXISTS idx_demo_team_inquiry_run_status;

ALTER TABLE care_demo_team_inquiries RENAME TO care_demo_team_inquiries_legacy;

CREATE TABLE care_demo_team_inquiries (
  run_id TEXT NOT NULL REFERENCES care_demo_runs(run_id) ON DELETE CASCADE,
  inquiry_id TEXT NOT NULL,
  resident_id TEXT NOT NULL,
  caregiver_id TEXT NOT NULL,
  inquiry_type TEXT NOT NULL CHECK (inquiry_type IN ('visit_verification', 'shift_readiness', 'visit_outcome')),
  prompt TEXT NOT NULL CHECK (length(prompt) BETWEEN 12 AND 240),
  status TEXT NOT NULL CHECK (status IN ('awaiting_coordinator_approval', 'response_received', 'resolved', 'dismissed')),
  response_code TEXT CHECK (response_code IN ('arrived_verification_failed', 'delayed', 'cannot_attend', 'no_response', 'ready_for_visit', 'visit_record_submitted')),
  response_detail TEXT,
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  responded_at TEXT,
  resolved_at TEXT,
  PRIMARY KEY (run_id, inquiry_id),
  UNIQUE (run_id, idempotency_key),
  FOREIGN KEY (run_id, caregiver_id) REFERENCES care_demo_caregivers(run_id, caregiver_id)
);

INSERT INTO care_demo_team_inquiries
SELECT * FROM care_demo_team_inquiries_legacy;

DROP TABLE care_demo_team_inquiries_legacy;

CREATE INDEX idx_demo_team_inquiry_run_status
  ON care_demo_team_inquiries(run_id, status, created_at DESC);

PRAGMA optimize;
