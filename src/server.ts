import {
  getCareEvidenceArgsSchema,
  getCareStoryArgsSchema,
  getResidentContextArgsSchema,
  prepareCareTeamReviewArgsSchema,
  prepareCaregiverCheckInArgsSchema,
  prepareResidentCheckInArgsSchema,
  requestDeviceHealthSnapshotArgsSchema,
  scenarioSchema,
  type CareEvent,
  type CareState,
  type CareStory,
  type ResidentResponseCode,
  type Scenario
} from "./schemas";

type DbRun = {
  run_id: string; resident_id: string; display_name: string; timezone: string; simulated_time: string; scenario: Scenario;
  severity: "routine" | "attention" | "urgent"; evidence_version: number; care_plan_version: string;
  care_plan_effective_at: string; care_plan_authorized_by: string; care_plan_authorization_role: string;
};
type DbDose = { dose_id: string; resident_id: string; label: string; scheduled_time: string; window_label: string; compartment: string; status: "ready" | "upcoming" | "confirmed" | "missed" | "blocked"; confirmed_at: string | null; };
type DbDevice = { device_id: string; resident_id: string; name: string; device_type: "medication_dispenser" | "fall_sensor" | "blood_pressure_cuff"; status: "online" | "offline" | "attention"; battery_percent: number; firmware: string; capabilities: string; door_state: "closed" | "open" | "not_applicable"; last_seen: string; sensor_health: "nominal" | "attention" | "unavailable"; applied_plan_version: string | null; };
type DbInventory = { resident_id: string; units_remaining: number; daily_cadence: number; updated_at: string; };
type DbEvent = Omit<CareEvent, "id"> & { event_id: string; };
type DbAction = { action_id: string; resident_id: string; channel: "call" | "visit" | "message"; reason: string; status: "awaiting_human_approval" | "approved_in_demo" | "dismissed"; evidence_snapshot_id: string | null; idempotency_key: string; created_at: string; resolved_at: string | null; };
type DbResidentCheckIn = { check_in_id: string; resident_id: string; prompt: string; status: "awaiting_resident" | "responded"; response_code: ResidentResponseCode | null; evidence_snapshot_id: string; idempotency_key: string; created_at: string; responded_at: string | null; };
type DbSnapshot = { snapshot_id: string; resident_id: string; evidence_version: number; created_at: string; };
type DbProfile = { resident_id: string; age: number; living_arrangement: string; support_schedule: string; relevant_history_json: string; baseline_json: string; preferences_json: string; source: string; updated_at: string; };
type DbMonitoringRule = { rule_id: string; resident_id: string; category: string; title: string; instruction: string; threshold_description: string; authorized_by: string; plan_version: string; };
type DbHandoff = { handoff_id: string; resident_id: string; review_type: "nurse_review" | "shift_handoff"; period_hours: 24 | 72; reason: string; evidence_snapshot_id: string; status: "awaiting_human_approval" | "approved_in_demo" | "dismissed"; idempotency_key: string; created_at: string; resolved_at: string | null; };

const residentId = "rose-demo";
const demoRunHeader = "x-grapevine-demo-run";
const demoRunPattern = /^run_[a-zA-Z0-9_-]{12,72}$/;

export const scenarioConfigs = {
  on_schedule: { time: "2026-08-31T08:14:00-04:00", severity: "routine", dose: "ready", device: "online", door: "closed", sensorHealth: "nominal", lastSeen: "2026-08-31T08:14:00-04:00", summary: "Morning window verified", detail: "Schedule, duplicate-release lock, and door sensor checks passed." },
  missed_window: { time: "2026-08-31T09:36:00-04:00", severity: "attention", dose: "missed", device: "online", door: "closed", sensorHealth: "nominal", lastSeen: "2026-08-31T09:36:00-04:00", summary: "Medication window elapsed", detail: "No removal confirmation was recorded. The compartment remains locked." },
  care_story: { time: "2026-09-02T09:42:00-04:00", severity: "attention", dose: "missed", device: "online", door: "closed", sensorHealth: "nominal", lastSeen: "2026-09-02T09:42:00-04:00", summary: "Second monitoring-plan signal in 72 hours", detail: "A second morning medication window lacks confirmation. Rose's signed plan asks the care circle to review repeated gaps; this is not an emergency determination." },
  door_fault: { time: "2026-08-31T08:14:00-04:00", severity: "urgent", dose: "blocked", device: "attention", door: "open", sensorHealth: "attention", lastSeen: "2026-08-31T08:14:00-04:00", summary: "Release blocked by door sensor", detail: "The outer door is open. All compartments remain mechanically secured." },
  device_offline: { time: "2026-08-31T08:29:00-04:00", severity: "attention", dose: "blocked", device: "offline", door: "closed", sensorHealth: "unavailable", lastSeen: "2026-08-31T08:14:00-04:00", summary: "Care station connection lost", detail: "No new telemetry is available. The physical device retains its local schedule and safety lock." }
} as const;

const jsonHeaders = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "permissions-policy": "camera=(), microphone=(), geolocation=()" };
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: jsonHeaders }); }

async function readJson(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > 4096) throw new Error("Request body is too large.");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 4096) throw new Error("Request body is too large.");
  if (!text) return {};
  try { return JSON.parse(text) as Record<string, unknown>; } catch { return {}; }
}

export function isValidDemoRunId(value: string | null): value is string { return typeof value === "string" && demoRunPattern.test(value); }
function eventSource(scenario: Scenario) { return scenario === "device_offline" ? "Connectivity monitor · deterministic simulation" : "Care Station GC-01 · deterministic ruleset v1.2"; }
function plusMinutes(value: string, minutes: number) { const date = new Date(value); date.setMinutes(date.getMinutes() + minutes); return date.toISOString(); }

function evidenceInsert(db: D1Database, runId: string, event: Omit<DbEvent, "event_id">) {
  return db.prepare(`INSERT INTO care_demo_events
    (run_id, event_id, resident_id, event_type, severity, summary, detail, source, occurred_at, actor_type, actor_id, evidence_type, observed_at, recorded_at, trust_boundary, plan_version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(runId, `evt_${crypto.randomUUID()}`, event.resident_id, event.event_type, event.severity, event.summary, event.detail, event.source, event.occurred_at, event.actor_type, event.actor_id, event.evidence_type, event.observed_at, event.recorded_at, event.trust_boundary, event.plan_version);
}
function versionBump(db: D1Database, runId: string, updatedAt: string) { return db.prepare("UPDATE care_demo_runs SET evidence_version = evidence_version + 1, updated_at = ? WHERE run_id = ?").bind(updatedAt, runId); }

async function resetDemoRun(db: D1Database, runId: string, scenario: Scenario) {
  const next = scenarioConfigs[scenario];
  const now = new Date().toISOString();
  await db.batch([
    db.prepare("DELETE FROM care_demo_handoffs WHERE run_id = ?").bind(runId),
    db.prepare("DELETE FROM care_demo_monitoring_rules WHERE run_id = ?").bind(runId),
    db.prepare("DELETE FROM care_demo_profiles WHERE run_id = ?").bind(runId),
    db.prepare("DELETE FROM care_demo_device_checks WHERE run_id = ?").bind(runId),
    db.prepare("DELETE FROM care_demo_resident_check_ins WHERE run_id = ?").bind(runId),
    db.prepare("DELETE FROM care_demo_evidence_snapshots WHERE run_id = ?").bind(runId),
    db.prepare("DELETE FROM care_demo_actions WHERE run_id = ?").bind(runId),
    db.prepare("DELETE FROM care_demo_events WHERE run_id = ?").bind(runId),
    db.prepare("DELETE FROM care_demo_inventory WHERE run_id = ?").bind(runId),
    db.prepare("DELETE FROM care_demo_devices WHERE run_id = ?").bind(runId),
    db.prepare("DELETE FROM care_demo_doses WHERE run_id = ?").bind(runId),
    db.prepare(`INSERT INTO care_demo_runs
      (run_id, resident_id, display_name, timezone, simulated_time, scenario, severity, created_at, updated_at, evidence_version, care_plan_version, care_plan_effective_at, care_plan_authorized_by, care_plan_authorization_role)
      VALUES (?, ?, 'Rose', 'America/New_York', ?, ?, ?, ?, ?, 1, 'v4', '2026-08-31T07:00:00-04:00', 'Nurse Ava', 'Care team RN')
      ON CONFLICT(run_id) DO UPDATE SET simulated_time = excluded.simulated_time, scenario = excluded.scenario, severity = excluded.severity, updated_at = excluded.updated_at, evidence_version = 1, care_plan_version = excluded.care_plan_version, care_plan_effective_at = excluded.care_plan_effective_at, care_plan_authorized_by = excluded.care_plan_authorized_by, care_plan_authorization_role = excluded.care_plan_authorization_role`)
      .bind(runId, residentId, next.time, scenario, next.severity, now, now),
    db.prepare(`INSERT INTO care_demo_doses (run_id, dose_id, resident_id, label, scheduled_time, window_label, compartment, status, confirmed_at) VALUES
      (?, 'dose-am', ?, 'Morning dose', '08:00', '7:30–9:00 AM', 'M–AM', ?, NULL),
      (?, 'dose-noon', ?, 'Midday dose', '12:00', '11:30 AM–1:00 PM', 'M–NOON', 'upcoming', NULL),
      (?, 'dose-pm', ?, 'Evening dose', '20:00', '7:30–9:00 PM', 'M–PM', 'upcoming', NULL)`)
      .bind(runId, residentId, next.dose, runId, residentId, runId, residentId),
    db.prepare(`INSERT INTO care_demo_devices
      (run_id, device_id, resident_id, name, device_type, status, battery_percent, firmware, capabilities, door_state, last_seen, sensor_health, applied_plan_version) VALUES
      (?, 'device-pillbox', ?, 'Care Station GC-01', 'medication_dispenser', ?, 86, '1.2.0-demo', '["schedule.read","compartment.release.local_only","inventory.read","door.read","attestation.local","diagnostic.request"]', ?, ?, ?, 'v4'),
      (?, 'device-fall', ?, 'Room Motion Sensor', 'fall_sensor', 'online', 72, '0.8.2-demo', '["presence.read","fall_signal.read","diagnostic.request"]', 'not_applicable', '2026-08-31T08:13:20-04:00', 'nominal', NULL),
      (?, 'device-bp', ?, 'Connected BP Cuff', 'blood_pressure_cuff', 'online', 64, '0.5.1-demo', '["measurement.provenance","diagnostic.request"]', 'not_applicable', '2026-08-30T18:42:00-04:00', 'nominal', NULL)`)
      .bind(runId, residentId, next.device, next.door, next.lastSeen, next.sensorHealth, runId, residentId, runId, residentId),
    db.prepare("INSERT INTO care_demo_inventory (run_id, resident_id, units_remaining, daily_cadence, updated_at) VALUES (?, ?, 24, 3, ?)").bind(runId, residentId, next.time),
    db.prepare(`INSERT INTO care_demo_profiles
      (run_id, resident_id, age, living_arrangement, support_schedule, relevant_history_json, baseline_json, preferences_json, source, updated_at)
      VALUES (?, ?, 79, 'Lives independently in an accessible apartment', 'In-home support weekdays from 10:00 AM to noon', ?, ?, ?, 'Care Plan v4 · fictional care-team record', ?)`)
      .bind(runId, residentId,
        JSON.stringify(["Hypertension managed by her care team", "Mild memory difficulties", "Previous fall noted in the care history"]),
        JSON.stringify(["Usually up between 7:00 and 7:30 AM", "Usually confirms morning medication by 8:30 AM", "Noon meal delivery is normally acknowledged", "Morning room movement is usually observed"]),
        JSON.stringify(["Call before an in-person visit", "Use large, direct language", "Daughter is the primary family contact"]), next.time),
    db.prepare(`INSERT INTO care_demo_monitoring_rules
      (run_id, rule_id, resident_id, category, title, instruction, threshold_description, authorized_by, plan_version) VALUES
      (?, 'rule-med-gap', ?, 'medication_routine', 'Review repeated confirmation gaps', 'Ask Rose first after one unconfirmed window. Prepare care-team review when two gaps occur within 72 hours.', 'Two unconfirmed medication windows within 72 hours', 'Nurse Ava · Care team RN', 'v4'),
      (?, 'rule-activity', ?, 'daily_routine', 'Compare activity with Rose’s baseline', 'Treat movement changes as context, not proof of illness. Combine them with other evidence before preparing human review.', 'Meaningful change from Rose’s documented morning routine', 'Nurse Ava · Care team RN', 'v4'),
      (?, 'rule-device', ?, 'device_health', 'Review stale device evidence', 'Request a non-clinical diagnostic, preserve last-seen time, and prepare human follow-up if evidence remains stale.', 'Device unavailable for more than 15 minutes', 'Nurse Ava · Care team RN', 'v4')`)
      .bind(runId, residentId, runId, residentId, runId, residentId),
    db.prepare(`INSERT INTO care_demo_events
      (run_id, event_id, resident_id, event_type, severity, summary, detail, source, occurred_at, actor_type, actor_id, evidence_type, observed_at, recorded_at, trust_boundary, plan_version) VALUES
      (?, 'scenario-current', ?, ?, ?, ?, ?, ?, ?, 'device', 'device-pillbox', 'observation', ?, ?, 'device_attested_simulation', 'v4'),
      (?, 'seed-evening-confirmed', ?, 'dose_confirmed', 'routine', 'Evening dose confirmed', 'Local biometric attestation accepted; no fingerprint data left the device.', 'Care Station GC-01 · local attestation', '2026-08-30T20:07:00-04:00', 'resident', 'rose-demo', 'observation', '2026-08-30T20:07:00-04:00', '2026-08-30T20:07:00-04:00', 'local_attestation_only', 'v4'),
      (?, 'seed-plan-record', ?, 'care_plan_authorized', 'routine', 'Care Plan v4 authorized', 'The plan provenance record is signed by the care-team role; medication details are intentionally excluded.', 'Nurse Ava · care-team record', '2026-08-31T07:00:00-04:00', 'care_team', 'nurse-ava', 'plan_record', '2026-08-31T07:00:00-04:00', '2026-08-31T07:00:00-04:00', 'signed_human_plan_record', 'v4'),
      (?, 'seed-inventory-forecast', ?, 'inventory_forecast', 'routine', 'Inventory forecast refreshed', 'Twenty-four units remain; estimated eight days at the current plan cadence.', 'Care Station GC-01 · compartment sensor', '2026-08-30T12:05:00-04:00', 'device', 'device-pillbox', 'observation', '2026-08-30T12:05:00-04:00', '2026-08-30T12:05:00-04:00', 'simulated_compartment_sensor', 'v4')`)
      .bind(runId, residentId, `scenario_${scenario}`, next.severity, next.summary, next.detail, eventSource(scenario), next.time, next.time, next.time, runId, residentId, runId, residentId, runId, residentId)
  ]);
  if (scenario === "care_story") {
    await db.batch([
      db.prepare("DELETE FROM care_demo_events WHERE run_id = ? AND event_id IN ('seed-evening-confirmed', 'seed-inventory-forecast')").bind(runId),
      db.prepare(`INSERT INTO care_demo_events
        (run_id, event_id, resident_id, event_type, severity, summary, detail, source, occurred_at, actor_type, actor_id, evidence_type, observed_at, recorded_at, trust_boundary, plan_version) VALUES
        (?, 'story-d1-am', ?, 'dose_confirmed', 'routine', 'Day 1 morning medication confirmed', 'Local confirmation matched Rose’s documented morning routine.', 'Care Station GC-01 · local attestation', '2026-08-31T08:11:00-04:00', 'resident', 'rose-demo', 'observation', '2026-08-31T08:11:00-04:00', '2026-08-31T08:11:00-04:00', 'local_attestation_only', 'v4'),
        (?, 'story-d1-noon', ?, 'routine_activity', 'routine', 'Day 1 noon routine observed', 'Meal delivery was acknowledged and room movement remained consistent with Rose’s documented baseline.', 'Room Motion Sensor · simulated presence', '2026-08-31T12:08:00-04:00', 'device', 'device-fall', 'observation', '2026-08-31T12:08:00-04:00', '2026-08-31T12:08:00-04:00', 'simulated_presence_not_welfare_proof', 'v4'),
        (?, 'story-d1-pm', ?, 'dose_confirmed', 'routine', 'Day 1 evening medication confirmed', 'Local confirmation was recorded during the scheduled window.', 'Care Station GC-01 · local attestation', '2026-08-31T20:04:00-04:00', 'resident', 'rose-demo', 'observation', '2026-08-31T20:04:00-04:00', '2026-08-31T20:04:00-04:00', 'local_attestation_only', 'v4'),
        (?, 'story-d2-am-gap', ?, 'medication_window_unconfirmed', 'attention', 'Day 2 morning window ended without confirmation', 'The dispenser did not record removal. This does not establish whether medication was taken.', 'Care Station GC-01 · deterministic ruleset v1.2', '2026-09-01T09:02:00-04:00', 'device', 'device-pillbox', 'observation', '2026-09-01T09:02:00-04:00', '2026-09-01T09:02:00-04:00', 'device_attested_simulation', 'v4'),
        (?, 'story-d2-response', ?, 'resident_self_report', 'routine', 'Rose reported that she was okay', 'Rose answered a bounded check-in. Her self-report did not verify medication ingestion.', 'Rose’s station · explicit resident selection', '2026-09-01T09:14:00-04:00', 'resident', 'rose-demo', 'self_report', '2026-09-01T09:14:00-04:00', '2026-09-01T09:14:00-04:00', 'resident_self_report_not_clinical_verification', 'v4'),
        (?, 'story-d2-activity', ?, 'routine_activity', 'routine', 'Day 2 afternoon routine observed', 'Room movement and meal acknowledgment returned to Rose’s documented pattern.', 'Room Motion Sensor · simulated presence', '2026-09-01T13:16:00-04:00', 'device', 'device-fall', 'observation', '2026-09-01T13:16:00-04:00', '2026-09-01T13:16:00-04:00', 'simulated_presence_not_welfare_proof', 'v4'),
        (?, 'story-d2-pm', ?, 'dose_confirmed', 'routine', 'Day 2 evening medication confirmed', 'Local confirmation was recorded during the scheduled window.', 'Care Station GC-01 · local attestation', '2026-09-01T20:06:00-04:00', 'resident', 'rose-demo', 'observation', '2026-09-01T20:06:00-04:00', '2026-09-01T20:06:00-04:00', 'local_attestation_only', 'v4'),
        (?, 'story-d3-activity', ?, 'baseline_deviation', 'attention', 'Day 3 morning activity started later than Rose’s baseline', 'First room movement was observed at 9:31 AM rather than Rose’s usual 7:00–7:30 AM range. Cause is unknown.', 'Room Motion Sensor · simulated presence', '2026-09-02T09:31:00-04:00', 'device', 'device-fall', 'observation', '2026-09-02T09:31:00-04:00', '2026-09-02T09:31:00-04:00', 'simulated_presence_not_diagnosis', 'v4')`)
        .bind(runId, residentId, runId, residentId, runId, residentId, runId, residentId, runId, residentId, runId, residentId, runId, residentId, runId, residentId),
      db.prepare(`INSERT INTO care_demo_resident_check_ins
        (run_id, check_in_id, resident_id, prompt, status, response_code, evidence_snapshot_id, idempotency_key, created_at, responded_at)
        VALUES (?, 'story-check-in', ?, 'Your care circle wants to check in. Are you okay?', 'responded', 'im_okay', 'historical-story-snapshot', 'historical-story-check-in', '2026-09-01T09:12:00-04:00', '2026-09-01T09:14:00-04:00')`)
        .bind(runId, residentId)
    ]);
  }
}

async function ensureDemoRun(db: D1Database, runId: string) {
  const existing = await db.prepare("SELECT run_id FROM care_demo_runs WHERE run_id = ?").bind(runId).first<{ run_id: string }>();
  if (!existing) await resetDemoRun(db, runId, "on_schedule");
  else await db.prepare("UPDATE care_demo_runs SET updated_at = ? WHERE run_id = ?").bind(new Date().toISOString(), runId).run();
}

function buildCareStory(run: DbRun, events: DbEvent[]): CareStory {
  const longitudinal = run.scenario === "care_story";
  const horizonHours: 24 | 72 = longitudinal ? 72 : 24;
  const routineConfirmations = events.filter((event) => event.event_type === "dose_confirmed").length;
  const unconfirmedWindows = events.filter((event) => event.event_type === "medication_window_unconfirmed" || event.event_type === "scenario_missed_window" || (event.event_id === "scenario-current" && ["missed_window", "care_story"].includes(run.scenario))).length;
  const residentCheckIns = events.filter((event) => event.event_type === "resident_self_report").length;
  const routineActivitySignals = events.filter((event) => event.event_type === "routine_activity").length;
  const deviceInterruptions = events.filter((event) => event.event_type === "scenario_device_offline" || event.event_type === "device_offline").length;
  const startsAt = longitudinal ? "2026-08-31T07:00:00-04:00" : plusMinutes(run.simulated_time, -24 * 60);
  const summary = longitudinal
    ? "Rose’s routine was largely consistent across three days. One earlier medication window was unconfirmed; Rose later reported she was okay and routine activity resumed. A second confirmation gap and later-than-baseline morning activity now match her care plan’s human-review criteria. Neither observation establishes ingestion, illness, or an emergency."
    : run.scenario === "missed_window"
      ? "One medication window is unconfirmed. Rose’s medication and welfare status remain unknown until additional human evidence is contributed."
      : "Available observations remain broadly consistent with Rose’s documented routine; individual device events are not clinical conclusions.";
  return {
    horizon_hours: horizonHours,
    starts_at: startsAt,
    ends_at: run.simulated_time,
    routine_confirmations: routineConfirmations,
    unconfirmed_windows: unconfirmedWindows,
    resident_check_ins: residentCheckIns,
    routine_activity_signals: routineActivitySignals,
    device_interruptions: deviceInterruptions,
    summary,
    unresolved: longitudinal
      ? ["Whether either unconfirmed window reflects medication ingestion", "Why Rose’s Day 3 morning activity began later than her documented baseline"]
      : run.scenario === "missed_window" ? ["Whether medication was taken", "Whether Rose needs assistance"] : [],
    baseline_comparisons: [
      { signal: "Morning medication routine", baseline: "Usually confirmed by 8:30 AM", observed: longitudinal ? "Two windows lacked confirmation within 72 hours" : run.scenario === "missed_window" ? "One window lacked confirmation" : "Current window follows the documented schedule", interpretation: longitudinal ? "Matches the signed plan’s threshold for human review; not proof of non-adherence" : "Compare with the authorized plan before preparing a human next step", evidence_status: longitudinal || run.scenario === "missed_window" ? "unresolved" : "consistent" },
      { signal: "Morning activity", baseline: "Usually begins between 7:00 and 7:30 AM", observed: longitudinal ? "First Day 3 movement at 9:31 AM" : "No meaningful change recorded in this scenario", interpretation: longitudinal ? "A person-specific change worth contextual review; cause is unknown" : "No baseline deviation established", evidence_status: longitudinal ? "changed" : "consistent" },
      { signal: "Resident report", baseline: "Rose can answer simple, direct check-ins", observed: residentCheckIns ? "Rose reported she was okay" : "No resident response in the current evidence", interpretation: residentCheckIns ? "Useful self-report; does not verify medication ingestion" : "Resident evidence may be requested when the workflow allows", evidence_status: residentCheckIns ? "consistent" : "unresolved" }
    ]
  };
}

async function loadCareState(db: D1Database, runId: string): Promise<CareState | null> {
  const run = await db.prepare("SELECT * FROM care_demo_runs WHERE run_id = ?").bind(runId).first<DbRun>();
  if (!run) return null;
  const [doses, devices, inventory, events, residentCheckIns, actions, profile, monitoringRules, handoffs] = await Promise.all([
    db.prepare("SELECT * FROM care_demo_doses WHERE run_id = ? ORDER BY scheduled_time").bind(runId).all<DbDose>(),
    db.prepare("SELECT * FROM care_demo_devices WHERE run_id = ? ORDER BY name").bind(runId).all<DbDevice>(),
    db.prepare("SELECT * FROM care_demo_inventory WHERE run_id = ?").bind(runId).first<DbInventory>(),
    db.prepare("SELECT * FROM care_demo_events WHERE run_id = ? ORDER BY occurred_at DESC, event_id DESC LIMIT 20").bind(runId).all<DbEvent>(),
    db.prepare("SELECT * FROM care_demo_resident_check_ins WHERE run_id = ? ORDER BY created_at DESC LIMIT 6").bind(runId).all<DbResidentCheckIn>(),
    db.prepare("SELECT * FROM care_demo_actions WHERE run_id = ? ORDER BY created_at DESC LIMIT 12").bind(runId).all<DbAction>(),
    db.prepare("SELECT * FROM care_demo_profiles WHERE run_id = ?").bind(runId).first<DbProfile>(),
    db.prepare("SELECT * FROM care_demo_monitoring_rules WHERE run_id = ? ORDER BY rule_id").bind(runId).all<DbMonitoringRule>(),
    db.prepare("SELECT * FROM care_demo_handoffs WHERE run_id = ? ORDER BY created_at DESC LIMIT 8").bind(runId).all<DbHandoff>()
  ]);
  if (!inventory || !profile) return null;
  const publicDevices = devices.results.map(({ device_id, capabilities, ...device }) => ({ id: device_id, ...device, capabilities: JSON.parse(capabilities) as string[] }));
  const pillbox = publicDevices.find((device) => device.id === "device-pillbox");
  return {
    fictional: true, demo_run_id: runId, evidence_version: run.evidence_version,
    resident: { id: run.resident_id, display_name: run.display_name, timezone: run.timezone, simulated_time: run.simulated_time, scenario: run.scenario, severity: run.severity },
    profile: { resident_id: profile.resident_id, age: profile.age, living_arrangement: profile.living_arrangement, support_schedule: profile.support_schedule, relevant_history: JSON.parse(profile.relevant_history_json) as string[], baseline: JSON.parse(profile.baseline_json) as string[], preferences: JSON.parse(profile.preferences_json) as string[], source: profile.source, updated_at: profile.updated_at },
    monitoring_plan: monitoringRules.results.map(({ rule_id, ...rule }) => ({ id: rule_id, ...rule })),
    care_story: buildCareStory(run, events.results),
    doses: doses.results.map(({ dose_id, ...dose }) => ({ id: dose_id, ...dose })), devices: publicDevices, inventory,
    events: events.results.map(({ event_id, observed_at, recorded_at, ...event }) => ({ id: event_id, ...event, observed_at: observed_at ?? event.occurred_at, recorded_at: recorded_at ?? event.occurred_at })),
    resident_check_ins: residentCheckIns.results.map(({ check_in_id, ...checkIn }) => ({ id: check_in_id, ...checkIn })),
    actions: actions.results.map(({ action_id, ...action }) => ({ id: action_id, ...action })),
    handoffs: handoffs.results.map(({ handoff_id, ...handoff }) => ({ id: handoff_id, ...handoff })),
    care_plan: { version: run.care_plan_version, effective_at: run.care_plan_effective_at, authorized_by: run.care_plan_authorized_by, authorization_role: run.care_plan_authorization_role, device_applied_version: pillbox?.applied_plan_version ?? null, alignment: pillbox?.applied_plan_version === run.care_plan_version ? "aligned" : "mismatch" },
    safety_contract: {
      ai_may: ["Read structured care evidence and Rose’s authorized context", "Compare observations with Rose’s documented baseline", "Request bounded resident evidence", "Request a non-clinical device diagnostic", "Stage caregiver or care-team review for human approval"],
      ai_may_not: ["Answer for Rose", "Prescribe or change medication", "Release a dose or impersonate biometric confirmation", "Diagnose, contact emergency services, or notify anyone autonomously"],
      emergency_notice: "This demonstration is not an emergency service. In a real emergency, contact local emergency services."
    }
  };
}

async function createEvidenceSnapshot(db: D1Database, runId: string, body: Record<string, unknown>) {
  const parsed = getCareEvidenceArgsSchema.safeParse(body);
  if (!parsed.success || parsed.data.resident_id !== residentId) return json({ error: "Invalid evidence request." }, 400);
  const run = await db.prepare("SELECT * FROM care_demo_runs WHERE run_id = ?").bind(runId).first<DbRun>();
  const state = await loadCareState(db, runId);
  if (!run || !state) return json({ error: "Resident not found." }, 404);
  const snapshotId = `snap_${crypto.randomUUID()}`;
  await db.prepare("INSERT INTO care_demo_evidence_snapshots (run_id, snapshot_id, resident_id, evidence_version, created_at) VALUES (?, ?, ?, ?, ?)").bind(runId, snapshotId, residentId, run.evidence_version, run.simulated_time).run();
  const eventLimit = parsed.data.event_limit ?? 5;
  return json({
    fictional: true, evidence_snapshot_id: snapshotId, evidence_version: run.evidence_version, observed_at: run.simulated_time,
    events: state.events.slice(0, eventLimit).map(({ id, event_type, actor_type, actor_id, evidence_type, observed_at, summary, trust_boundary, plan_version }) => ({ id, event_type, actor_type, actor_id, evidence_type, observed_at, summary, trust_boundary, plan_version })),
    uncertainty: run.scenario === "device_offline" ? "Device telemetry is stale; current resident status is unknown." : run.scenario === "missed_window" ? "Medication removal was not confirmed. Ingestion and welfare remain unknown." : "No unresolved evidence gap in the selected demo scenario.",
    next_step: run.scenario === "missed_window" && !state.resident_check_ins.length ? "A bounded resident check-in may be prepared from this snapshot." : "Use only capabilities currently exposed by the page."
  });
}

async function validateSnapshot(db: D1Database, runId: string, snapshotId: string) {
  const [run, snapshot] = await Promise.all([
    db.prepare("SELECT evidence_version FROM care_demo_runs WHERE run_id = ?").bind(runId).first<{ evidence_version: number }>(),
    db.prepare("SELECT * FROM care_demo_evidence_snapshots WHERE run_id = ? AND snapshot_id = ?").bind(runId, snapshotId).first<DbSnapshot>()
  ]);
  return Boolean(run && snapshot && snapshot.resident_id === residentId && snapshot.evidence_version === run.evidence_version);
}

async function confirmDose(db: D1Database, runId: string, doseId: string) {
  const run = await db.prepare("SELECT * FROM care_demo_runs WHERE run_id = ?").bind(runId).first<DbRun>();
  const dose = await db.prepare("SELECT * FROM care_demo_doses WHERE run_id = ? AND dose_id = ?").bind(runId, doseId).first<DbDose>();
  if (!run || !dose) return json({ error: "Demo record not found." }, 404);
  const update = await db.prepare(`UPDATE care_demo_doses SET status = 'confirmed', confirmed_at = ? WHERE run_id = ? AND dose_id = ? AND status = 'ready' AND EXISTS (SELECT 1 FROM care_demo_devices WHERE run_id = ? AND device_id = 'device-pillbox' AND status = 'online' AND door_state = 'closed')`).bind(run.simulated_time, runId, doseId, runId).run();
  if ((update.meta.changes ?? 0) !== 1) return json({ error: "The deterministic device controller blocked release because its safety conditions were not met." }, 409);
  await db.batch([
    db.prepare("UPDATE care_demo_inventory SET units_remaining = max(0, units_remaining - 1), updated_at = ? WHERE run_id = ?").bind(run.simulated_time, runId),
    evidenceInsert(db, runId, { resident_id: residentId, event_type: "dose_confirmed", severity: "routine", summary: `${dose.label} confirmed`, detail: "A simulated local biometric attestation released one scheduled compartment. No biometric data left the device.", source: "Care Station GC-01 · simulated local attestation", occurred_at: run.simulated_time, actor_type: "resident", actor_id: residentId, evidence_type: "observation", observed_at: run.simulated_time, recorded_at: run.simulated_time, trust_boundary: "local_attestation_only", plan_version: run.care_plan_version }),
    versionBump(db, runId, run.simulated_time)
  ]);
  return json({ state: await loadCareState(db, runId) });
}

async function prepareResidentCheckIn(db: D1Database, runId: string, body: Record<string, unknown>) {
  const parsed = prepareResidentCheckInArgsSchema.safeParse(body);
  if (!parsed.success || parsed.data.resident_id !== residentId) return json({ error: "Invalid resident check-in." }, 400);
  const input = parsed.data;
  const duplicate = await db.prepare("SELECT * FROM care_demo_resident_check_ins WHERE run_id = ? AND idempotency_key = ?").bind(runId, input.idempotency_key).first<DbResidentCheckIn>();
  if (duplicate) return json({ check_in: { id: duplicate.check_in_id, ...duplicate }, external_side_effect: false, duplicate_prevented: true });
  const run = await db.prepare("SELECT * FROM care_demo_runs WHERE run_id = ?").bind(runId).first<DbRun>();
  if (!run) return json({ error: "Resident not found." }, 404);
  if (run.scenario !== "missed_window") return json({ error: "A resident evidence request is available only when a missed-window uncertainty is active." }, 409);
  if (!(await validateSnapshot(db, runId, input.evidence_snapshot_id))) return json({ error: "Evidence changed. Review current evidence before preparing a resident check-in.", stale_evidence: true }, 409);
  const existing = await db.prepare("SELECT check_in_id FROM care_demo_resident_check_ins WHERE run_id = ? LIMIT 1").bind(runId).first<{ check_in_id: string }>();
  if (existing) return json({ error: "The resident evidence loop has already started for this scenario." }, 409);
  const checkInId = `rci_${crypto.randomUUID()}`;
  await db.batch([
    db.prepare(`INSERT INTO care_demo_resident_check_ins (run_id, check_in_id, resident_id, prompt, status, response_code, evidence_snapshot_id, idempotency_key, created_at, responded_at) VALUES (?, ?, ?, ?, 'awaiting_resident', NULL, ?, ?, ?, NULL)`).bind(runId, checkInId, residentId, input.prompt, input.evidence_snapshot_id, input.idempotency_key, run.simulated_time),
    evidenceInsert(db, runId, { resident_id: residentId, event_type: "resident_check_in_prepared", severity: "attention", summary: "Resident check-in prepared", detail: "A bounded question is visible on Rose's station. The agent cannot answer it or contact Rose outside this page.", source: "WebMCP tool · resident response required", occurred_at: run.simulated_time, actor_type: "agent", actor_id: "page-agent", evidence_type: "prepared_action", observed_at: run.simulated_time, recorded_at: run.simulated_time, trust_boundary: "agent_prepared_human_surface", plan_version: run.care_plan_version }),
    versionBump(db, runId, run.simulated_time)
  ]);
  const checkIn = await db.prepare("SELECT * FROM care_demo_resident_check_ins WHERE run_id = ? AND check_in_id = ?").bind(runId, checkInId).first<DbResidentCheckIn>();
  return json({ check_in: checkIn ? { id: checkIn.check_in_id, ...checkIn } : null, resident_response_required: true, external_side_effect: false, duplicate_prevented: false });
}

async function respondResidentCheckIn(db: D1Database, runId: string, checkInId: string, body: Record<string, unknown>) {
  const responseCode = body.response_code;
  if (responseCode !== "im_okay" && responseCode !== "not_sure" && responseCode !== "contact_caregiver") return json({ error: "Invalid resident response." }, 400);
  const run = await db.prepare("SELECT * FROM care_demo_runs WHERE run_id = ?").bind(runId).first<DbRun>();
  if (!run) return json({ error: "Resident not found." }, 404);
  const respondedAt = plusMinutes(run.simulated_time, 2);
  const update = await db.prepare(`UPDATE care_demo_resident_check_ins SET status = 'responded', response_code = ?, responded_at = ? WHERE run_id = ? AND check_in_id = ? AND status = 'awaiting_resident'`).bind(responseCode, respondedAt, runId, checkInId).run();
  if ((update.meta.changes ?? 0) !== 1) {
    const existing = await db.prepare("SELECT check_in_id FROM care_demo_resident_check_ins WHERE run_id = ? AND check_in_id = ?").bind(runId, checkInId).first<{ check_in_id: string }>();
    return existing ? json({ state: await loadCareState(db, runId), already_responded: true }) : json({ error: "Resident check-in not found." }, 404);
  }
  const response = {
    im_okay: { summary: "Rose reports that she is okay", detail: "Rose selected ‘I'm okay.’ This self-report does not resolve the medication-removal or ingestion state." },
    not_sure: { summary: "Rose reports uncertainty", detail: "Rose selected ‘I'm not sure.’ Medication state and welfare interpretation remain unresolved for human review." },
    contact_caregiver: { summary: "Rose requests caregiver contact", detail: "Rose selected ‘I'd like my caregiver to contact me.’ No message or call was sent automatically." }
  }[responseCode];
  await db.batch([
    db.prepare("UPDATE care_demo_runs SET simulated_time = ?, evidence_version = evidence_version + 1, updated_at = ? WHERE run_id = ?").bind(respondedAt, respondedAt, runId),
    evidenceInsert(db, runId, { resident_id: residentId, event_type: "resident_self_report", severity: responseCode === "im_okay" ? "routine" : "attention", summary: response.summary, detail: response.detail, source: "Rose's station · explicit resident selection", occurred_at: respondedAt, actor_type: "resident", actor_id: residentId, evidence_type: "self_report", observed_at: respondedAt, recorded_at: respondedAt, trust_boundary: "resident_self_report_not_clinical_verification", plan_version: run.care_plan_version })
  ]);
  return json({ state: await loadCareState(db, runId), already_responded: false });
}

async function prepareAction(db: D1Database, runId: string, body: Record<string, unknown>) {
  const parsed = prepareCaregiverCheckInArgsSchema.safeParse(body);
  if (!parsed.success || parsed.data.resident_id !== residentId) return json({ error: "Invalid staged action." }, 400);
  const input = parsed.data;
  const duplicate = await db.prepare("SELECT * FROM care_demo_actions WHERE run_id = ? AND idempotency_key = ?").bind(runId, input.idempotency_key).first<DbAction>();
  if (duplicate) return json({ action: { id: duplicate.action_id, ...duplicate }, approval_required: true, external_side_effect: false, duplicate_prevented: true });
  const run = await db.prepare("SELECT * FROM care_demo_runs WHERE run_id = ?").bind(runId).first<DbRun>();
  if (!run) return json({ error: "Resident not found." }, 404);
  if (!(await validateSnapshot(db, runId, input.evidence_snapshot_id))) return json({ error: "Evidence changed. Review current evidence before preparing a caregiver check-in.", stale_evidence: true }, 409);
  if (run.scenario === "missed_window") {
    const response = await db.prepare("SELECT check_in_id FROM care_demo_resident_check_ins WHERE run_id = ? AND status = 'responded' LIMIT 1").bind(runId).first<{ check_in_id: string }>();
    if (!response) return json({ error: "Resolve the bounded resident check-in before preparing caregiver outreach." }, 409);
  }
  const pending = await db.prepare("SELECT action_id FROM care_demo_actions WHERE run_id = ? AND status = 'awaiting_human_approval' LIMIT 1").bind(runId).first<{ action_id: string }>();
  if (pending) return json({ error: "A caregiver action is already awaiting human review." }, 409);
  const pendingHandoff = await db.prepare("SELECT handoff_id FROM care_demo_handoffs WHERE run_id = ? AND status = 'awaiting_human_approval' LIMIT 1").bind(runId).first<{ handoff_id: string }>();
  if (pendingHandoff) return json({ error: "A care-team handoff is already awaiting human review." }, 409);
  const actionId = `act_${crypto.randomUUID()}`;
  await db.batch([
    db.prepare(`INSERT INTO care_demo_actions (run_id, action_id, resident_id, channel, reason, status, idempotency_key, created_at, resolved_at, evidence_snapshot_id) VALUES (?, ?, ?, ?, ?, 'awaiting_human_approval', ?, ?, NULL, ?)`).bind(runId, actionId, residentId, input.channel, input.reason, input.idempotency_key, run.simulated_time, input.evidence_snapshot_id),
    evidenceInsert(db, runId, { resident_id: residentId, event_type: "caregiver_check_in_prepared", severity: run.severity, summary: "Caregiver check-in prepared", detail: `A ${input.channel} check-in was staged. No call, visit, or message was initiated.`, source: "WebMCP tool · human approval required", occurred_at: run.simulated_time, actor_type: "agent", actor_id: "page-agent", evidence_type: "prepared_action", observed_at: run.simulated_time, recorded_at: run.simulated_time, trust_boundary: "agent_prepared_human_approval_required", plan_version: run.care_plan_version }),
    versionBump(db, runId, run.simulated_time)
  ]);
  const action = await db.prepare("SELECT * FROM care_demo_actions WHERE run_id = ? AND action_id = ?").bind(runId, actionId).first<DbAction>();
  return json({ action: action ? { id: action.action_id, ...action } : null, approval_required: true, external_side_effect: false, duplicate_prevented: false });
}

async function resolveAction(db: D1Database, runId: string, actionId: string, body: Record<string, unknown>) {
  const resolution = body.resolution;
  if (resolution !== "approved_in_demo" && resolution !== "dismissed") return json({ error: "Invalid resolution." }, 400);
  const run = await db.prepare("SELECT * FROM care_demo_runs WHERE run_id = ?").bind(runId).first<DbRun>();
  if (!run) return json({ error: "Care workspace not found." }, 404);
  const updated = await db.prepare(`UPDATE care_demo_actions SET status = ?, resolved_at = ? WHERE run_id = ? AND action_id = ? AND status = 'awaiting_human_approval'`).bind(resolution, run.simulated_time, runId, actionId).run();
  if ((updated.meta.changes ?? 0) === 0) {
    const existing = await db.prepare("SELECT action_id FROM care_demo_actions WHERE run_id = ? AND action_id = ?").bind(runId, actionId).first<{ action_id: string }>();
    return existing ? json({ state: await loadCareState(db, runId), external_side_effect: false, already_resolved: true }) : json({ error: "Prepared action not found." }, 404);
  }
  await db.batch([
    evidenceInsert(db, runId, { resident_id: residentId, event_type: "prepared_action_reviewed", severity: "routine", summary: resolution === "approved_in_demo" ? "Prepared check-in approved in demo" : "Prepared check-in dismissed", detail: resolution === "approved_in_demo" ? "Human approval was recorded in this simulation. No external communication was sent." : "The staged action was dismissed without external side effects.", source: "Caregiver workspace · explicit human decision", occurred_at: run.simulated_time, actor_type: "caregiver", actor_id: "miles-demo", evidence_type: "human_decision", observed_at: run.simulated_time, recorded_at: run.simulated_time, trust_boundary: "explicit_caregiver_review", plan_version: run.care_plan_version }),
    versionBump(db, runId, run.simulated_time)
  ]);
  return json({ state: await loadCareState(db, runId), external_side_effect: false, already_resolved: false });
}

async function requestDeviceHealthSnapshot(db: D1Database, runId: string, body: Record<string, unknown>) {
  const parsed = requestDeviceHealthSnapshotArgsSchema.safeParse(body);
  if (!parsed.success || parsed.data.resident_id !== residentId) return json({ error: "Invalid device diagnostic request." }, 400);
  const input = parsed.data;
  const duplicate = await db.prepare("SELECT check_id FROM care_demo_device_checks WHERE run_id = ? AND idempotency_key = ?").bind(runId, input.idempotency_key).first<{ check_id: string }>();
  const [run, device] = await Promise.all([
    db.prepare("SELECT * FROM care_demo_runs WHERE run_id = ?").bind(runId).first<DbRun>(),
    db.prepare("SELECT * FROM care_demo_devices WHERE run_id = ? AND device_id = ?").bind(runId, input.device_id).first<DbDevice>()
  ]);
  if (!run || !device) return json({ error: "Registered device not found." }, 404);
  const diagnostic = { device_id: device.device_id, status: device.status, sensor_health: device.sensor_health, battery_percent: device.battery_percent, firmware: device.firmware, door_state: device.door_state, last_seen: device.last_seen, applied_plan_version: device.applied_plan_version };
  if (duplicate) return json({ fictional: true, diagnostic, external_side_effect: false, duplicate_prevented: true, evidence_changed: false });
  const observedAt = plusMinutes(run.simulated_time, 1);
  await db.batch([
    db.prepare("INSERT INTO care_demo_device_checks (run_id, check_id, device_id, idempotency_key, observed_at) VALUES (?, ?, ?, ?, ?)").bind(runId, `dchk_${crypto.randomUUID()}`, device.device_id, input.idempotency_key, observedAt),
    evidenceInsert(db, runId, { resident_id: residentId, event_type: "device_health_snapshot", severity: device.status === "online" ? "routine" : "attention", summary: `${device.name} diagnostic recorded`, detail: device.status === "online" ? "A fresh non-clinical device-health snapshot was recorded." : "The device did not reconnect; the diagnostic preserves the last-seen timestamp and reports telemetry as unavailable.", source: `${device.name} · grapevine.care.device.v1`, occurred_at: observedAt, actor_type: "device", actor_id: device.device_id, evidence_type: "diagnostic", observed_at: observedAt, recorded_at: observedAt, trust_boundary: "non_clinical_device_diagnostic", plan_version: device.applied_plan_version }),
    versionBump(db, runId, observedAt)
  ]);
  return json({ fictional: true, diagnostic, external_side_effect: false, duplicate_prevented: false, evidence_changed: true, next_step: "Evidence changed. Call get_care_evidence again before preparing an action." });
}

async function prepareCareTeamReview(db: D1Database, runId: string, body: Record<string, unknown>) {
  const parsed = prepareCareTeamReviewArgsSchema.safeParse(body);
  if (!parsed.success || parsed.data.resident_id !== residentId) return json({ error: "Invalid care-team review." }, 400);
  const input = parsed.data;
  const duplicate = await db.prepare("SELECT * FROM care_demo_handoffs WHERE run_id = ? AND idempotency_key = ?").bind(runId, input.idempotency_key).first<DbHandoff>();
  if (duplicate) return json({ handoff: { id: duplicate.handoff_id, ...duplicate }, approval_required: true, external_side_effect: false, duplicate_prevented: true });
  const state = await loadCareState(db, runId);
  if (!state) return json({ error: "Care workspace not found." }, 404);
  if (!(await validateSnapshot(db, runId, input.evidence_snapshot_id))) return json({ error: "Evidence changed. Review the current care story before preparing a handoff.", stale_evidence: true }, 409);
  if (state.resident.scenario !== "care_story" || state.care_story.unconfirmed_windows < 2) return json({ error: "The authorized monitoring-plan threshold for a care-team review is not present in this scenario." }, 409);
  const [pendingAction, pendingHandoff] = await Promise.all([
    db.prepare("SELECT action_id FROM care_demo_actions WHERE run_id = ? AND status = 'awaiting_human_approval' LIMIT 1").bind(runId).first<{ action_id: string }>(),
    db.prepare("SELECT handoff_id FROM care_demo_handoffs WHERE run_id = ? AND status = 'awaiting_human_approval' LIMIT 1").bind(runId).first<{ handoff_id: string }>()
  ]);
  if (pendingAction || pendingHandoff) return json({ error: "Another human decision is already awaiting review." }, 409);
  const handoffId = `handoff_${crypto.randomUUID()}`;
  const label = input.review_type === "nurse_review" ? "Nurse review" : "Shift handoff";
  await db.batch([
    db.prepare(`INSERT INTO care_demo_handoffs
      (run_id, handoff_id, resident_id, review_type, period_hours, reason, evidence_snapshot_id, status, idempotency_key, created_at, resolved_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'awaiting_human_approval', ?, ?, NULL)`)
      .bind(runId, handoffId, residentId, input.review_type, input.period_hours, input.reason, input.evidence_snapshot_id, input.idempotency_key, state.resident.simulated_time),
    evidenceInsert(db, runId, { resident_id: residentId, event_type: "care_team_review_prepared", severity: "attention", summary: `${label} prepared`, detail: `A ${input.period_hours}-hour evidence package was staged for visible caregiver approval. Nothing was sent. No diagnosis, plan change, or emergency determination was made.`, source: "WebMCP tool · human approval required", occurred_at: state.resident.simulated_time, actor_type: "agent", actor_id: "page-agent", evidence_type: "prepared_action", observed_at: state.resident.simulated_time, recorded_at: state.resident.simulated_time, trust_boundary: "agent_prepared_care_team_review", plan_version: state.care_plan.version }),
    versionBump(db, runId, state.resident.simulated_time)
  ]);
  const handoff = await db.prepare("SELECT * FROM care_demo_handoffs WHERE run_id = ? AND handoff_id = ?").bind(runId, handoffId).first<DbHandoff>();
  return json({ handoff: handoff ? { id: handoff.handoff_id, ...handoff } : null, care_brief: state.care_story, approval_required: true, external_side_effect: false, duplicate_prevented: false });
}

async function resolveCareTeamReview(db: D1Database, runId: string, handoffId: string, body: Record<string, unknown>) {
  const resolution = body.resolution;
  if (resolution !== "approved_in_demo" && resolution !== "dismissed") return json({ error: "Invalid resolution." }, 400);
  const run = await db.prepare("SELECT * FROM care_demo_runs WHERE run_id = ?").bind(runId).first<DbRun>();
  const handoff = await db.prepare("SELECT * FROM care_demo_handoffs WHERE run_id = ? AND handoff_id = ?").bind(runId, handoffId).first<DbHandoff>();
  if (!run || !handoff) return json({ error: "Prepared handoff not found." }, 404);
  const updated = await db.prepare("UPDATE care_demo_handoffs SET status = ?, resolved_at = ? WHERE run_id = ? AND handoff_id = ? AND status = 'awaiting_human_approval'").bind(resolution, run.simulated_time, runId, handoffId).run();
  if ((updated.meta.changes ?? 0) === 0) return json({ state: await loadCareState(db, runId), external_side_effect: false, already_resolved: true });
  await db.batch([
    evidenceInsert(db, runId, { resident_id: residentId, event_type: "care_team_review_decided", severity: "routine", summary: resolution === "approved_in_demo" ? "Care-team review approved in demo" : "Prepared care-team review dismissed", detail: resolution === "approved_in_demo" ? "A human approved the simulated handoff. This prototype did not transmit it to a care provider." : "The prepared handoff was dismissed without transmission.", source: "Caregiver workspace · explicit human decision", occurred_at: run.simulated_time, actor_type: "caregiver", actor_id: "miles-demo", evidence_type: "human_decision", observed_at: run.simulated_time, recorded_at: run.simulated_time, trust_boundary: "explicit_caregiver_review", plan_version: run.care_plan_version }),
    versionBump(db, runId, run.simulated_time)
  ]);
  return json({ state: await loadCareState(db, runId), external_side_effect: false, already_resolved: false });
}

export async function handleApi(request: Request, env: Env) {
  const url = new URL(request.url); const path = url.pathname; const runId = request.headers.get(demoRunHeader);
  if (!isValidDemoRunId(runId)) return json({ error: "A valid isolated demo run is required." }, 400);
  await ensureDemoRun(env.DB, runId);
  if (request.method === "GET" && path === "/api/care/state") {
    if (url.searchParams.has("resident_id") && url.searchParams.get("resident_id") !== residentId) return json({ error: "Care workspace not found." }, 404);
    const state = await loadCareState(env.DB, runId); return state ? json(state) : json({ error: "Care workspace not found." }, 404);
  }
  if (request.method === "POST" && path === "/api/care/scenario") {
    const body = await readJson(request); const parsed = scenarioSchema.safeParse(body.scenario);
    if (!parsed.success) return json({ error: "Unknown demo scenario." }, 400);
    await resetDemoRun(env.DB, runId, parsed.data); return json({ state: await loadCareState(env.DB, runId) });
  }
  if (request.method === "POST" && path === "/api/care/evidence-snapshot") return createEvidenceSnapshot(env.DB, runId, await readJson(request));
  if (request.method === "POST" && path === "/api/care/resident-check-ins") return prepareResidentCheckIn(env.DB, runId, await readJson(request));
  const residentResponseMatch = path.match(/^\/api\/care\/resident-check-ins\/([^/]+)\/respond$/);
  if (request.method === "POST" && residentResponseMatch) return respondResidentCheckIn(env.DB, runId, decodeURIComponent(residentResponseMatch[1]), await readJson(request));
  const doseMatch = path.match(/^\/api\/care\/doses\/([^/]+)\/confirm$/);
  if (request.method === "POST" && doseMatch) return confirmDose(env.DB, runId, decodeURIComponent(doseMatch[1]));
  if (request.method === "POST" && path === "/api/care/actions") return prepareAction(env.DB, runId, await readJson(request));
  const actionMatch = path.match(/^\/api\/care\/actions\/([^/]+)\/resolve$/);
  if (request.method === "POST" && actionMatch) return resolveAction(env.DB, runId, decodeURIComponent(actionMatch[1]), await readJson(request));
  if (request.method === "POST" && path === "/api/care/device-health-snapshots") return requestDeviceHealthSnapshot(env.DB, runId, await readJson(request));
  if (request.method === "POST" && path === "/api/care/handoffs") return prepareCareTeamReview(env.DB, runId, await readJson(request));
  const handoffMatch = path.match(/^\/api\/care\/handoffs\/([^/]+)\/resolve$/);
  if (request.method === "POST" && handoffMatch) return resolveCareTeamReview(env.DB, runId, decodeURIComponent(handoffMatch[1]), await readJson(request));
  return json({ error: "Not found." }, 404);
}

export default {
  async fetch(request: Request, env: Env) {
    try { const url = new URL(request.url); if (url.pathname.startsWith("/api/")) return await handleApi(request, env); return (env as Env & { ASSETS: Fetcher }).ASSETS.fetch(request); }
    catch (error) { const message = error instanceof Error && error.message === "Request body is too large." ? error.message : "The demo could not complete that request."; return json({ error: message }, message.includes("large") ? 413 : 500); }
  }
} satisfies ExportedHandler<Env>;
