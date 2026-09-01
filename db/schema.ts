// Canonical D1 schema reference. Runtime queries use prepared statements in src/server.ts.
export const careTables = [
  "care_demo_runs",
  "care_demo_doses",
  "care_demo_devices",
  "care_demo_inventory",
  "care_demo_events",
  "care_demo_actions",
  "care_demo_evidence_snapshots",
  "care_demo_resident_check_ins",
  "care_demo_device_checks"
] as const;

export type CareTable = (typeof careTables)[number];
