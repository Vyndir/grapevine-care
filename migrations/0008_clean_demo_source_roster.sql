UPDATE sources
SET online = 0
WHERE source_kind = 'human';

UPDATE sources
SET
  online = 1,
  checked_in_at = CASE id
    WHEN 'src-boone-field' THEN '2030-09-28T13:36:00.000Z'
    ELSE '2030-09-28T13:37:00.000Z'
  END,
  last_active = CASE id
    WHEN 'src-boone-field' THEN '2030-09-28T13:36:00.000Z'
    ELSE '2030-09-28T13:37:00.000Z'
  END
WHERE id IN ('src-boone-field', 'src-mountain-convoy');
