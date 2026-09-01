PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS care_demo_runs (
  run_id TEXT PRIMARY KEY,
  resident_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  timezone TEXT NOT NULL,
  simulated_time TEXT NOT NULL,
  scenario TEXT NOT NULL CHECK (scenario IN ('on_schedule', 'missed_window', 'door_fault', 'device_offline')),
  severity TEXT NOT NULL CHECK (severity IN ('routine', 'attention', 'urgent')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS care_demo_doses (
  run_id TEXT NOT NULL REFERENCES care_demo_runs(run_id) ON DELETE CASCADE,
  dose_id TEXT NOT NULL,
  resident_id TEXT NOT NULL,
  label TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  window_label TEXT NOT NULL,
  compartment TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ready', 'upcoming', 'confirmed', 'missed', 'blocked')),
  confirmed_at TEXT,
  PRIMARY KEY (run_id, dose_id)
);

CREATE TABLE IF NOT EXISTS care_demo_devices (
  run_id TEXT NOT NULL REFERENCES care_demo_runs(run_id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  resident_id TEXT NOT NULL,
  name TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('medication_dispenser', 'fall_sensor', 'blood_pressure_cuff')),
  status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'attention')),
  battery_percent INTEGER NOT NULL CHECK (battery_percent BETWEEN 0 AND 100),
  firmware TEXT NOT NULL,
  capabilities TEXT NOT NULL,
  door_state TEXT NOT NULL CHECK (door_state IN ('closed', 'open', 'not_applicable')),
  last_seen TEXT NOT NULL,
  PRIMARY KEY (run_id, device_id)
);

CREATE TABLE IF NOT EXISTS care_demo_inventory (
  run_id TEXT PRIMARY KEY REFERENCES care_demo_runs(run_id) ON DELETE CASCADE,
  resident_id TEXT NOT NULL,
  units_remaining INTEGER NOT NULL CHECK (units_remaining >= 0),
  daily_cadence INTEGER NOT NULL CHECK (daily_cadence > 0),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS care_demo_events (
  run_id TEXT NOT NULL REFERENCES care_demo_runs(run_id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  resident_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('routine', 'attention', 'urgent')),
  summary TEXT NOT NULL,
  detail TEXT NOT NULL,
  source TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  PRIMARY KEY (run_id, event_id)
);

CREATE TABLE IF NOT EXISTS care_demo_actions (
  run_id TEXT NOT NULL REFERENCES care_demo_runs(run_id) ON DELETE CASCADE,
  action_id TEXT NOT NULL,
  resident_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('call', 'visit', 'message')),
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 8 AND 240),
  status TEXT NOT NULL CHECK (status IN ('awaiting_human_approval', 'approved_in_demo', 'dismissed')),
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  PRIMARY KEY (run_id, action_id),
  UNIQUE (run_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_demo_doses_run_time ON care_demo_doses(run_id, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_demo_devices_run_type ON care_demo_devices(run_id, device_type);
CREATE INDEX IF NOT EXISTS idx_demo_events_run_time ON care_demo_events(run_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_actions_run_time ON care_demo_actions(run_id, created_at DESC);

PRAGMA optimize;
