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
  "care_demo_device_checks",
  "care_demo_profiles",
  "care_demo_monitoring_rules",
  "care_demo_handoffs",
  "care_demo_caregivers",
  "care_demo_caregiver_availability",
  "care_demo_caregiver_readiness",
  "care_demo_shifts",
  "care_demo_schedule_snapshots",
  "care_demo_coverage_proposals",
  "care_demo_visit_events",
  "care_demo_shift_handoffs",
  "care_demo_handoff_acknowledgements"
] as const;

export type CareTable = (typeof careTables)[number];
