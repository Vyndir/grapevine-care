PRAGMA foreign_keys = OFF;

CREATE TABLE care_demo_orientation_packets_follow_up (
  run_id TEXT NOT NULL REFERENCES care_demo_runs(run_id) ON DELETE CASCADE,
  packet_id TEXT NOT NULL,
  resident_id TEXT NOT NULL,
  caregiver_id TEXT NOT NULL,
  care_plan_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('awaiting_coordinator_outreach', 'response_received', 'verified')),
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 12 AND 320),
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  response_detail TEXT,
  responded_at TEXT,
  verified_at TEXT,
  PRIMARY KEY (run_id, packet_id),
  UNIQUE (run_id, idempotency_key),
  FOREIGN KEY (run_id, caregiver_id) REFERENCES care_demo_caregivers(run_id, caregiver_id)
);

INSERT INTO care_demo_orientation_packets_follow_up
  (run_id, packet_id, resident_id, caregiver_id, care_plan_version, status, reason, idempotency_key, created_at, response_detail, responded_at, verified_at)
SELECT run_id, packet_id, resident_id, caregiver_id, care_plan_version,
  CASE status WHEN 'acknowledged' THEN 'verified' ELSE 'awaiting_coordinator_outreach' END,
  reason, idempotency_key, created_at,
  CASE status WHEN 'acknowledged' THEN 'Elena reported that she reviewed Walter orientation and Care Plan v2.' ELSE NULL END,
  acknowledged_at, acknowledged_at
FROM care_demo_orientation_packets;

DROP TABLE care_demo_orientation_packets;
ALTER TABLE care_demo_orientation_packets_follow_up RENAME TO care_demo_orientation_packets;

CREATE INDEX IF NOT EXISTS idx_demo_orientation_run_status
  ON care_demo_orientation_packets(run_id, status, created_at DESC);

PRAGMA foreign_keys = ON;
PRAGMA optimize;
