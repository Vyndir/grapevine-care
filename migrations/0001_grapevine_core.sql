CREATE TABLE IF NOT EXISTS spots (
  place_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  hours TEXT NOT NULL,
  popular_times_now TEXT NOT NULL,
  rating REAL NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  is_seeded INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL,
  trust_score REAL NOT NULL DEFAULT 0.8,
  place_id TEXT NOT NULL,
  location_name TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  offered TEXT NOT NULL,
  online INTEGER NOT NULL DEFAULT 0,
  checked_in_at TEXT NOT NULL,
  last_active TEXT NOT NULL,
  FOREIGN KEY (place_id) REFERENCES spots(place_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  requester_label TEXT NOT NULL,
  place_id TEXT NOT NULL,
  spot_name TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (
    request_type IN (
      'route_status',
      'flood_depth',
      'supply_access',
      'hazard_report',
      'custom'
    )
  ),
  question TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (
    status IN ('pending_approval', 'sent', 'answered', 'rated')
  ),
  answer_value TEXT,
  answer_note TEXT,
  photo_url TEXT,
  stars INTEGER CHECK (stars IS NULL OR (stars >= 1 AND stars <= 5)),
  created_at TEXT NOT NULL,
  answered_at TEXT,
  FOREIGN KEY (source_id) REFERENCES sources(id),
  FOREIGN KEY (place_id) REFERENCES spots(place_id)
);

CREATE INDEX IF NOT EXISTS idx_sources_place_online
  ON sources(place_id, online, checked_in_at);

CREATE INDEX IF NOT EXISTS idx_sessions_source_status
  ON sessions(source_id, status, created_at);

INSERT INTO spots (
  place_id,
  name,
  address,
  hours,
  popular_times_now,
  rating,
  lat,
  lng,
  is_seeded,
  updated_at
) VALUES (
  'demo-watauga-relief-corridor',
  'Watauga Relief Corridor',
  'Boone Staging Hub to Mountain Shelter B, Watauga County, NC',
  'Regional route feed: passable',
  'Network update delayed; field verification required',
  0.62,
  36.2168,
  -81.6746,
  1,
  '2026-08-29T12:00:00.000Z'
) ON CONFLICT(place_id) DO UPDATE SET
  name = excluded.name,
  address = excluded.address,
  hours = excluded.hours,
  popular_times_now = excluded.popular_times_now,
  rating = excluded.rating,
  lat = excluded.lat,
  lng = excluded.lng,
  is_seeded = excluded.is_seeded,
  updated_at = excluded.updated_at;

INSERT INTO sources (
  id,
  handle,
  trust_score,
  place_id,
  location_name,
  lat,
  lng,
  offered,
  online,
  checked_in_at,
  last_active
) VALUES
  (
    'src-boone-field',
    'boone-field-team',
    0.91,
    'demo-watauga-relief-corridor',
    'Watauga Relief Corridor',
    36.2168,
    -81.6746,
    '["route_status","supply_access","hazard_report"]',
    1,
    '2026-08-29T16:54:00.000Z',
    '2026-08-29T16:54:00.000Z'
  ),
  (
    'src-mountain-convoy',
    'mountain-convoy-3',
    0.86,
    'demo-watauga-relief-corridor',
    'Watauga Relief Corridor',
    36.2190,
    -81.6800,
    '["route_status","supply_access","hazard_report"]',
    1,
    '2026-08-29T16:56:00.000Z',
    '2026-08-29T16:56:00.000Z'
  )
ON CONFLICT(id) DO UPDATE SET
  trust_score = excluded.trust_score,
  place_id = excluded.place_id,
  location_name = excluded.location_name,
  lat = excluded.lat,
  lng = excluded.lng,
  offered = excluded.offered,
  online = excluded.online,
  checked_in_at = excluded.checked_in_at,
  last_active = excluded.last_active;
