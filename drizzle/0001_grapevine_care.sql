CREATE TABLE IF NOT EXISTS care_residents (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  timezone TEXT NOT NULL,
  simulated_time TEXT NOT NULL,
  scenario TEXT NOT NULL CHECK (scenario IN ('on_schedule', 'missed_window', 'door_fault', 'device_offline')),
  severity TEXT NOT NULL CHECK (severity IN ('routine', 'attention', 'urgent'))
);

CREATE TABLE IF NOT EXISTS care_doses (
  id TEXT PRIMARY KEY,
  resident_id TEXT NOT NULL REFERENCES care_residents(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  window_label TEXT NOT NULL,
  compartment TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ready', 'upcoming', 'confirmed', 'missed', 'blocked')),
  confirmed_at TEXT
);

CREATE TABLE IF NOT EXISTS care_devices (
  id TEXT PRIMARY KEY,
  resident_id TEXT NOT NULL REFERENCES care_residents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('medication_dispenser', 'fall_sensor', 'blood_pressure_cuff')),
  status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'attention')),
  battery_percent INTEGER NOT NULL CHECK (battery_percent BETWEEN 0 AND 100),
  firmware TEXT NOT NULL,
  capabilities TEXT NOT NULL,
  door_state TEXT NOT NULL CHECK (door_state IN ('closed', 'open', 'not_applicable')),
  last_seen TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS care_inventory (
  resident_id TEXT PRIMARY KEY REFERENCES care_residents(id) ON DELETE CASCADE,
  units_remaining INTEGER NOT NULL CHECK (units_remaining >= 0),
  daily_cadence INTEGER NOT NULL CHECK (daily_cadence > 0),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS care_events (
  id TEXT PRIMARY KEY,
  resident_id TEXT NOT NULL REFERENCES care_residents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('routine', 'attention', 'urgent')),
  summary TEXT NOT NULL,
  detail TEXT NOT NULL,
  source TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS care_actions (
  id TEXT PRIMARY KEY,
  resident_id TEXT NOT NULL REFERENCES care_residents(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('call', 'visit', 'message')),
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 8 AND 240),
  status TEXT NOT NULL CHECK (status IN ('awaiting_human_approval', 'approved_in_demo', 'dismissed')),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_care_doses_resident_time ON care_doses(resident_id, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_care_devices_resident_type ON care_devices(resident_id, device_type);
CREATE INDEX IF NOT EXISTS idx_care_events_resident_time ON care_events(resident_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_care_actions_resident_time ON care_actions(resident_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_care_actions_idempotency ON care_actions(idempotency_key);

INSERT OR REPLACE INTO care_residents (id, display_name, timezone, simulated_time, scenario, severity)
VALUES ('rose-demo', 'Rose', 'America/New_York', '2026-08-31T08:14:00-04:00', 'on_schedule', 'routine');

INSERT OR REPLACE INTO care_doses (id, resident_id, label, scheduled_time, window_label, compartment, status, confirmed_at) VALUES
  ('dose-am', 'rose-demo', 'Morning dose', '08:00', '7:30–9:00 AM', 'M–AM', 'ready', NULL),
  ('dose-noon', 'rose-demo', 'Midday dose', '12:00', '11:30 AM–1:00 PM', 'M–NOON', 'upcoming', NULL),
  ('dose-pm', 'rose-demo', 'Evening dose', '20:00', '7:30–9:00 PM', 'M–PM', 'upcoming', NULL);

INSERT OR REPLACE INTO care_devices (id, resident_id, name, device_type, status, battery_percent, firmware, capabilities, door_state, last_seen) VALUES
  ('device-pillbox', 'rose-demo', 'Care Station GC-01', 'medication_dispenser', 'online', 86, '1.0.0-demo', '["schedule.read","compartment.release.local_only","inventory.read","door.read","attestation.local"]', 'closed', '2026-08-31T08:14:00-04:00'),
  ('device-fall', 'rose-demo', 'Room Motion Sensor', 'fall_sensor', 'online', 72, '0.8.2-demo', '["presence.read","fall_signal.read","welfare_check.prepare"]', 'not_applicable', '2026-08-31T08:13:20-04:00'),
  ('device-bp', 'rose-demo', 'Connected BP Cuff', 'blood_pressure_cuff', 'online', 64, '0.5.1-demo', '["measurement.read","measurement.provenance"]', 'not_applicable', '2026-08-30T18:42:00-04:00');

INSERT OR REPLACE INTO care_inventory (resident_id, units_remaining, daily_cadence, updated_at)
VALUES ('rose-demo', 24, 3, '2026-08-31T08:14:00-04:00');

DELETE FROM care_events WHERE resident_id = 'rose-demo';
INSERT INTO care_events (id, resident_id, event_type, severity, summary, detail, source, occurred_at) VALUES
  ('evt-seed-003', 'rose-demo', 'window_verified', 'routine', 'Morning window verified', 'Schedule, duplicate-release lock, and door sensor checks passed.', 'Care Station GC-01 · deterministic ruleset v1.0', '2026-08-31T08:14:00-04:00'),
  ('evt-seed-002', 'rose-demo', 'dose_confirmed', 'routine', 'Evening dose confirmed', 'Local biometric attestation accepted; no fingerprint data left the device.', 'Care Station GC-01 · local attestation', '2026-08-30T20:07:00-04:00'),
  ('evt-seed-001', 'rose-demo', 'inventory_forecast', 'routine', 'Inventory forecast refreshed', 'Twenty-four units remain; estimated eight days at the current plan cadence.', 'Care Station GC-01 · compartment sensor', '2026-08-30T12:05:00-04:00');

DELETE FROM care_actions WHERE resident_id = 'rose-demo';
PRAGMA optimize;
