-- Keep historical source IDs as aliases, but expose only the most recently active
-- check-in for each handle at a place.
UPDATE sources AS older
SET online = 0
WHERE EXISTS (
  SELECT 1
  FROM sources AS newer
  WHERE newer.place_id = older.place_id
    AND lower(trim(newer.handle)) = lower(trim(older.handle))
    AND (
      newer.last_active > older.last_active
      OR (
        newer.last_active = older.last_active
        AND newer.checked_in_at > older.checked_in_at
      )
      OR (
        newer.last_active = older.last_active
        AND newer.checked_in_at = older.checked_in_at
        AND newer.rowid > older.rowid
      )
    )
);
