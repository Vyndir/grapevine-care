// Canonical D1 schema reference. Runtime queries use prepared statements in src/server.ts.
export const careTables = [
  "care_demo_runs",
  "care_demo_doses",
  "care_demo_devices",
  "care_demo_inventory",
  "care_demo_events",
  "care_demo_actions"
] as const;

export type CareTable = (typeof careTables)[number];
