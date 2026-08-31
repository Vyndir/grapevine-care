// Canonical D1 schema reference. Runtime queries use prepared statements in src/server.ts.
export const careTables = [
  "care_residents",
  "care_doses",
  "care_devices",
  "care_inventory",
  "care_events",
  "care_actions"
] as const;

export type CareTable = (typeof careTables)[number];
