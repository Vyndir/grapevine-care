import {
  prepareCaregiverCheckInArgsSchema,
  scenarioSchema,
  type CareState,
  type Scenario
} from "./schemas";

type DbRun = {
  run_id: string;
  resident_id: string;
  display_name: string;
  timezone: string;
  simulated_time: string;
  scenario: Scenario;
  severity: "routine" | "attention" | "urgent";
};
type DbDose = { dose_id: string; resident_id: string; label: string; scheduled_time: string; window_label: string; compartment: string; status: "ready" | "upcoming" | "confirmed" | "missed" | "blocked"; confirmed_at: string | null; };
type DbDevice = { device_id: string; resident_id: string; name: string; device_type: "medication_dispenser" | "fall_sensor" | "blood_pressure_cuff"; status: "online" | "offline" | "attention"; battery_percent: number; firmware: string; capabilities: string; door_state: "closed" | "open" | "not_applicable"; last_seen: string; };
type DbInventory = { resident_id: string; units_remaining: number; daily_cadence: number; updated_at: string; };
type DbEvent = { event_id: string; resident_id: string; event_type: string; severity: "routine" | "attention" | "urgent"; summary: string; detail: string; source: string; occurred_at: string; };
type DbAction = { action_id: string; resident_id: string; channel: "call" | "visit" | "message"; reason: string; status: "awaiting_human_approval" | "approved_in_demo" | "dismissed"; idempotency_key: string; created_at: string; resolved_at: string | null; };

const residentId = "rose-demo";
const demoRunHeader = "x-grapevine-demo-run";
const demoRunPattern = /^run_[a-zA-Z0-9_-]{12,72}$/;

export const scenarioConfigs = {
  on_schedule: { time: "2026-08-31T08:14:00-04:00", severity: "routine", dose: "ready", device: "online", door: "closed", lastSeen: "2026-08-31T08:14:00-04:00", summary: "Morning window verified", detail: "Schedule, duplicate-release lock, and door sensor checks passed." },
  missed_window: { time: "2026-08-31T09:36:00-04:00", severity: "attention", dose: "missed", device: "online", door: "closed", lastSeen: "2026-08-31T09:36:00-04:00", summary: "Medication window elapsed", detail: "No removal confirmation was recorded. The compartment remains locked." },
  door_fault: { time: "2026-08-31T08:14:00-04:00", severity: "urgent", dose: "blocked", device: "attention", door: "open", lastSeen: "2026-08-31T08:14:00-04:00", summary: "Release blocked by door sensor", detail: "The outer door is open. All compartments remain mechanically secured." },
  device_offline: { time: "2026-08-31T08:29:00-04:00", severity: "attention", dose: "blocked", device: "offline", door: "closed", lastSeen: "2026-08-31T08:14:00-04:00", summary: "Care station connection lost", detail: "No new telemetry is available. The physical device retains its local schedule and safety lock." }
} as const;

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "permissions-policy": "camera=(), microphone=(), geolocation=()"
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

async function readJson(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > 4096) throw new Error("Request body is too large.");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 4096) throw new Error("Request body is too large.");
  if (!text) return {};
  try { return JSON.parse(text) as Record<string, unknown>; } catch { return {}; }
}

export function isValidDemoRunId(value: string | null): value is string {
  return typeof value === "string" && demoRunPattern.test(value);
}

function eventSource(scenario: Scenario) {
  return scenario === "device_offline"
    ? "Connectivity monitor · deterministic simulation"
    : "Care Station GC-01 · deterministic ruleset v1.1";
}

async function resetDemoRun(db: D1Database, runId: string, scenario: Scenario) {
  const next = scenarioConfigs[scenario];
  const now = new Date().toISOString();
  await db.batch([
    db.prepare("DELETE FROM care_demo_actions WHERE run_id = ?").bind(runId),
    db.prepare("DELETE FROM care_demo_events WHERE run_id = ?").bind(runId),
    db.prepare("DELETE FROM care_demo_inventory WHERE run_id = ?").bind(runId),
    db.prepare("DELETE FROM care_demo_devices WHERE run_id = ?").bind(runId),
    db.prepare("DELETE FROM care_demo_doses WHERE run_id = ?").bind(runId),
    db.prepare(`INSERT INTO care_demo_runs (run_id, resident_id, display_name, timezone, simulated_time, scenario, severity, created_at, updated_at)
      VALUES (?, ?, 'Rose', 'America/New_York', ?, ?, ?, ?, ?)
      ON CONFLICT(run_id) DO UPDATE SET simulated_time = excluded.simulated_time, scenario = excluded.scenario, severity = excluded.severity, updated_at = excluded.updated_at`)
      .bind(runId, residentId, next.time, scenario, next.severity, now, now),
    db.prepare(`INSERT INTO care_demo_doses (run_id, dose_id, resident_id, label, scheduled_time, window_label, compartment, status, confirmed_at) VALUES
      (?, 'dose-am', ?, 'Morning dose', '08:00', '7:30–9:00 AM', 'M–AM', ?, NULL),
      (?, 'dose-noon', ?, 'Midday dose', '12:00', '11:30 AM–1:00 PM', 'M–NOON', 'upcoming', NULL),
      (?, 'dose-pm', ?, 'Evening dose', '20:00', '7:30–9:00 PM', 'M–PM', 'upcoming', NULL)`)
      .bind(runId, residentId, next.dose, runId, residentId, runId, residentId),
    db.prepare(`INSERT INTO care_demo_devices (run_id, device_id, resident_id, name, device_type, status, battery_percent, firmware, capabilities, door_state, last_seen) VALUES
      (?, 'device-pillbox', ?, 'Care Station GC-01', 'medication_dispenser', ?, 86, '1.1.0-demo', '["schedule.read","compartment.release.local_only","inventory.read","door.read","attestation.local"]', ?, ?),
      (?, 'device-fall', ?, 'Room Motion Sensor', 'fall_sensor', 'online', 72, '0.8.2-demo', '["presence.read","fall_signal.read","welfare_check.prepare"]', 'not_applicable', '2026-08-31T08:13:20-04:00'),
      (?, 'device-bp', ?, 'Connected BP Cuff', 'blood_pressure_cuff', 'online', 64, '0.5.1-demo', '["measurement.read","measurement.provenance"]', 'not_applicable', '2026-08-30T18:42:00-04:00')`)
      .bind(runId, residentId, next.device, next.door, next.lastSeen, runId, residentId, runId, residentId),
    db.prepare("INSERT INTO care_demo_inventory (run_id, resident_id, units_remaining, daily_cadence, updated_at) VALUES (?, ?, 24, 3, ?)")
      .bind(runId, residentId, next.time),
    db.prepare(`INSERT INTO care_demo_events (run_id, event_id, resident_id, event_type, severity, summary, detail, source, occurred_at) VALUES
      (?, 'scenario-current', ?, ?, ?, ?, ?, ?, ?),
      (?, 'seed-evening-confirmed', ?, 'dose_confirmed', 'routine', 'Evening dose confirmed', 'Local biometric attestation accepted; no fingerprint data left the device.', 'Care Station GC-01 · local attestation', '2026-08-30T20:07:00-04:00'),
      (?, 'seed-inventory-forecast', ?, 'inventory_forecast', 'routine', 'Inventory forecast refreshed', 'Twenty-four units remain; estimated eight days at the current plan cadence.', 'Care Station GC-01 · compartment sensor', '2026-08-30T12:05:00-04:00')`)
      .bind(runId, residentId, `scenario_${scenario}`, next.severity, next.summary, next.detail, eventSource(scenario), next.time, runId, residentId, runId, residentId)
  ]);
}

async function ensureDemoRun(db: D1Database, runId: string) {
  const existing = await db.prepare("SELECT run_id FROM care_demo_runs WHERE run_id = ?").bind(runId).first<{ run_id: string }>();
  if (!existing) await resetDemoRun(db, runId, "on_schedule");
  else await db.prepare("UPDATE care_demo_runs SET updated_at = ? WHERE run_id = ?").bind(new Date().toISOString(), runId).run();
}

async function loadCareState(db: D1Database, runId: string): Promise<CareState | null> {
  const run = await db.prepare("SELECT * FROM care_demo_runs WHERE run_id = ?").bind(runId).first<DbRun>();
  if (!run) return null;
  const [doses, devices, inventory, events, actions] = await Promise.all([
    db.prepare("SELECT * FROM care_demo_doses WHERE run_id = ? ORDER BY scheduled_time").bind(runId).all<DbDose>(),
    db.prepare("SELECT * FROM care_demo_devices WHERE run_id = ? ORDER BY name").bind(runId).all<DbDevice>(),
    db.prepare("SELECT * FROM care_demo_inventory WHERE run_id = ?").bind(runId).first<DbInventory>(),
    db.prepare("SELECT * FROM care_demo_events WHERE run_id = ? ORDER BY occurred_at DESC LIMIT 20").bind(runId).all<DbEvent>(),
    db.prepare("SELECT * FROM care_demo_actions WHERE run_id = ? ORDER BY created_at DESC LIMIT 12").bind(runId).all<DbAction>()
  ]);
  if (!inventory) return null;
  return {
    fictional: true,
    demo_run_id: runId,
    resident: { id: run.resident_id, display_name: run.display_name, timezone: run.timezone, simulated_time: run.simulated_time, scenario: run.scenario, severity: run.severity },
    doses: doses.results.map(({ dose_id, ...dose }) => ({ id: dose_id, ...dose })),
    devices: devices.results.map(({ device_id, capabilities, ...device }) => ({ id: device_id, ...device, capabilities: JSON.parse(capabilities) as string[] })),
    inventory,
    events: events.results.map(({ event_id, ...event }) => ({ id: event_id, ...event })),
    actions: actions.results.map(({ action_id, ...action }) => ({ id: action_id, ...action })),
    safety_contract: {
      ai_may: ["Read structured care evidence", "Explain uncertainty and provenance", "Stage a caregiver check-in for review"],
      ai_may_not: ["Prescribe or change medication", "Release a dose or impersonate biometric confirmation", "Diagnose, contact emergency services, or notify anyone autonomously"],
      emergency_notice: "This demonstration is not an emergency service. In a real emergency, contact local emergency services."
    }
  };
}

async function addEvent(db: D1Database, runId: string, input: Omit<DbEvent, "event_id">) {
  await db.prepare(`INSERT INTO care_demo_events (run_id, event_id, resident_id, event_type, severity, summary, detail, source, occurred_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(runId, `evt_${crypto.randomUUID()}`, input.resident_id, input.event_type, input.severity, input.summary, input.detail, input.source, input.occurred_at).run();
}

async function confirmDose(db: D1Database, runId: string, doseId: string) {
  const run = await db.prepare("SELECT * FROM care_demo_runs WHERE run_id = ?").bind(runId).first<DbRun>();
  const dose = await db.prepare("SELECT * FROM care_demo_doses WHERE run_id = ? AND dose_id = ?").bind(runId, doseId).first<DbDose>();
  if (!run || !dose) return json({ error: "Demo record not found." }, 404);
  const update = await db.prepare(`UPDATE care_demo_doses SET status = 'confirmed', confirmed_at = ?
    WHERE run_id = ? AND dose_id = ? AND status = 'ready'
      AND EXISTS (SELECT 1 FROM care_demo_devices WHERE run_id = ? AND device_id = 'device-pillbox' AND status = 'online' AND door_state = 'closed')`)
    .bind(run.simulated_time, runId, doseId, runId).run();
  if ((update.meta.changes ?? 0) !== 1) {
    return json({ error: "The deterministic device controller blocked release because its safety conditions were not met." }, 409);
  }
  await db.batch([
    db.prepare("UPDATE care_demo_inventory SET units_remaining = max(0, units_remaining - 1), updated_at = ? WHERE run_id = ?").bind(run.simulated_time, runId),
    db.prepare(`INSERT INTO care_demo_events (run_id, event_id, resident_id, event_type, severity, summary, detail, source, occurred_at)
      VALUES (?, ?, ?, 'dose_confirmed', 'routine', ?, 'A simulated local biometric attestation released one scheduled compartment. No biometric data left the device.', 'Care Station GC-01 · simulated local attestation', ?)`)
      .bind(runId, `evt_${crypto.randomUUID()}`, residentId, `${dose.label} confirmed`, run.simulated_time)
  ]);
  return json({ state: await loadCareState(db, runId) });
}

async function prepareAction(db: D1Database, runId: string, body: Record<string, unknown>) {
  const parsed = prepareCaregiverCheckInArgsSchema.safeParse(body);
  if (!parsed.success || parsed.data.resident_id !== residentId) return json({ error: "Invalid staged action." }, 400);
  const input = parsed.data;
  const run = await db.prepare("SELECT * FROM care_demo_runs WHERE run_id = ?").bind(runId).first<DbRun>();
  if (!run) return json({ error: "Resident not found." }, 404);
  const actionId = `act_${crypto.randomUUID()}`;
  const inserted = await db.prepare(`INSERT OR IGNORE INTO care_demo_actions
    (run_id, action_id, resident_id, channel, reason, status, idempotency_key, created_at, resolved_at)
    VALUES (?, ?, ?, ?, ?, 'awaiting_human_approval', ?, ?, NULL)`)
    .bind(runId, actionId, residentId, input.channel, input.reason, input.idempotency_key, run.simulated_time).run();
  const action = await db.prepare("SELECT * FROM care_demo_actions WHERE run_id = ? AND idempotency_key = ?").bind(runId, input.idempotency_key).first<DbAction>();
  if (!action) return json({ error: "The staged action could not be recorded." }, 500);
  const duplicatePrevented = (inserted.meta.changes ?? 0) === 0;
  if (!duplicatePrevented) {
    await addEvent(db, runId, { resident_id: residentId, event_type: "caregiver_check_in_prepared", severity: run.severity, summary: "Caregiver check-in prepared", detail: `A ${action.channel} check-in was staged. No call, visit, or message was initiated.`, source: "WebMCP tool · human approval required", occurred_at: run.simulated_time });
  }
  const { action_id, ...publicAction } = action;
  return json({ action: { id: action_id, ...publicAction }, approval_required: true, external_side_effect: false, duplicate_prevented: duplicatePrevented });
}

async function resolveAction(db: D1Database, runId: string, actionId: string, body: Record<string, unknown>) {
  const resolution = body.resolution;
  if (resolution !== "approved_in_demo" && resolution !== "dismissed") return json({ error: "Invalid resolution." }, 400);
  const run = await db.prepare("SELECT * FROM care_demo_runs WHERE run_id = ?").bind(runId).first<DbRun>();
  if (!run) return json({ error: "Care workspace not found." }, 404);
  const updated = await db.prepare(`UPDATE care_demo_actions SET status = ?, resolved_at = ?
    WHERE run_id = ? AND action_id = ? AND status = 'awaiting_human_approval'`)
    .bind(resolution, run.simulated_time, runId, actionId).run();
  if ((updated.meta.changes ?? 0) === 0) {
    const existing = await db.prepare("SELECT action_id FROM care_demo_actions WHERE run_id = ? AND action_id = ?").bind(runId, actionId).first<{ action_id: string }>();
    if (!existing) return json({ error: "Prepared action not found." }, 404);
    return json({ state: await loadCareState(db, runId), external_side_effect: false, already_resolved: true });
  }
  await addEvent(db, runId, { resident_id: residentId, event_type: "prepared_action_reviewed", severity: "routine", summary: resolution === "approved_in_demo" ? "Prepared check-in approved in demo" : "Prepared check-in dismissed", detail: resolution === "approved_in_demo" ? "Human approval was recorded in this simulation. No external communication was sent." : "The staged action was dismissed without external side effects.", source: "Caregiver workspace · explicit human decision", occurred_at: run.simulated_time });
  return json({ state: await loadCareState(db, runId), external_side_effect: false, already_resolved: false });
}

export async function handleApi(request: Request, env: Env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const runId = request.headers.get(demoRunHeader);
  if (!isValidDemoRunId(runId)) return json({ error: "A valid isolated demo run is required." }, 400);
  await ensureDemoRun(env.DB, runId);
  if (request.method === "GET" && path === "/api/care/state") {
    if (url.searchParams.has("resident_id") && url.searchParams.get("resident_id") !== residentId) return json({ error: "Care workspace not found." }, 404);
    const state = await loadCareState(env.DB, runId);
    return state ? json(state) : json({ error: "Care workspace not found." }, 404);
  }
  if (request.method === "POST" && path === "/api/care/scenario") {
    const body = await readJson(request);
    const parsed = scenarioSchema.safeParse(body.scenario);
    if (!parsed.success) return json({ error: "Unknown demo scenario." }, 400);
    await resetDemoRun(env.DB, runId, parsed.data);
    return json({ state: await loadCareState(env.DB, runId) });
  }
  const doseMatch = path.match(/^\/api\/care\/doses\/([^/]+)\/confirm$/);
  if (request.method === "POST" && doseMatch) return confirmDose(env.DB, runId, decodeURIComponent(doseMatch[1]));
  if (request.method === "POST" && path === "/api/care/actions") return prepareAction(env.DB, runId, await readJson(request));
  const actionMatch = path.match(/^\/api\/care\/actions\/([^/]+)\/resolve$/);
  if (request.method === "POST" && actionMatch) return resolveAction(env.DB, runId, decodeURIComponent(actionMatch[1]), await readJson(request));
  return json({ error: "Not found." }, 404);
}

export default {
  async fetch(request: Request, env: Env) {
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/")) return await handleApi(request, env);
      return (env as Env & { ASSETS: Fetcher }).ASSETS.fetch(request);
    } catch (error) {
      const message = error instanceof Error && error.message === "Request body is too large." ? error.message : "The demo could not complete that request.";
      return json({ error: message }, message.includes("large") ? 413 : 500);
    }
  }
} satisfies ExportedHandler<Env>;
