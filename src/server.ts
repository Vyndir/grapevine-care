import { scenarioSchema, type CareState, type Scenario } from "./schemas";

type DbResident = { id: string; display_name: string; timezone: string; simulated_time: string; scenario: Scenario; severity: "routine" | "attention" | "urgent"; };
type DbDose = { id: string; resident_id: string; label: string; scheduled_time: string; window_label: string; compartment: string; status: "ready" | "upcoming" | "confirmed" | "missed" | "blocked"; confirmed_at: string | null; };
type DbDevice = { id: string; resident_id: string; name: string; device_type: "medication_dispenser" | "fall_sensor" | "blood_pressure_cuff"; status: "online" | "offline" | "attention"; battery_percent: number; firmware: string; capabilities: string; door_state: "closed" | "open" | "not_applicable"; last_seen: string; };
type DbInventory = { resident_id: string; units_remaining: number; daily_cadence: number; updated_at: string; };
type DbEvent = { id: string; resident_id: string; event_type: string; severity: "routine" | "attention" | "urgent"; summary: string; detail: string; source: string; occurred_at: string; };
type DbAction = { id: string; resident_id: string; channel: "call" | "visit" | "message"; reason: string; status: "awaiting_human_approval" | "approved_in_demo" | "dismissed"; idempotency_key: string; created_at: string; resolved_at: string | null; };

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer"
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

async function readJson(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 4096) throw new Error("Request body is too large.");
  try { return await request.json() as Record<string, unknown>; } catch { return {}; }
}

function safeText(value: unknown, max = 240) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function loadCareState(db: D1Database, residentId = "rose-demo"): Promise<CareState | null> {
  const resident = await db.prepare("SELECT * FROM care_residents WHERE id = ?").bind(residentId).first<DbResident>();
  if (!resident) return null;
  const [doses, devices, inventory, events, actions] = await Promise.all([
    db.prepare("SELECT * FROM care_doses WHERE resident_id = ? ORDER BY scheduled_time").bind(residentId).all<DbDose>(),
    db.prepare("SELECT * FROM care_devices WHERE resident_id = ? ORDER BY name").bind(residentId).all<DbDevice>(),
    db.prepare("SELECT * FROM care_inventory WHERE resident_id = ?").bind(residentId).first<DbInventory>(),
    db.prepare("SELECT * FROM care_events WHERE resident_id = ? ORDER BY occurred_at DESC LIMIT 20").bind(residentId).all<DbEvent>(),
    db.prepare("SELECT * FROM care_actions WHERE resident_id = ? ORDER BY created_at DESC LIMIT 12").bind(residentId).all<DbAction>()
  ]);
  if (!inventory) return null;
  return {
    fictional: true,
    resident,
    doses: doses.results,
    devices: devices.results.map((device) => ({ ...device, capabilities: JSON.parse(device.capabilities) as string[] })),
    inventory,
    events: events.results,
    actions: actions.results,
    safety_contract: {
      ai_may: ["Read structured care evidence", "Explain uncertainty and provenance", "Stage a caregiver check-in for review"],
      ai_may_not: ["Prescribe or change medication", "Release a dose or impersonate biometric confirmation", "Diagnose, contact emergency services, or notify anyone autonomously"],
      emergency_notice: "This demonstration is not an emergency service. In a real emergency, contact local emergency services."
    }
  };
}

async function addEvent(db: D1Database, input: Omit<DbEvent, "id">) {
  await db.prepare(`INSERT INTO care_events (id, resident_id, event_type, severity, summary, detail, source, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(`evt_${crypto.randomUUID()}`, input.resident_id, input.event_type, input.severity, input.summary, input.detail, input.source, input.occurred_at).run();
}

async function setScenario(db: D1Database, scenario: Scenario) {
  const configs = {
    on_schedule: { time: "2026-08-31T08:14:00-04:00", severity: "routine", dose: "ready", device: "online", door: "closed", summary: "Morning window verified", detail: "Schedule, duplicate-release lock, and door sensor checks passed." },
    missed_window: { time: "2026-08-31T09:36:00-04:00", severity: "attention", dose: "missed", device: "online", door: "closed", summary: "Medication window elapsed", detail: "No removal confirmation was recorded. The compartment remains locked." },
    door_fault: { time: "2026-08-31T08:14:00-04:00", severity: "urgent", dose: "blocked", device: "attention", door: "open", summary: "Release blocked by door sensor", detail: "The outer door is open. All compartments remain mechanically secured." },
    device_offline: { time: "2026-08-31T08:29:00-04:00", severity: "attention", dose: "blocked", device: "offline", door: "closed", summary: "Care station connection lost", detail: "No new telemetry is available. The physical device retains its local schedule and safety lock." }
  } as const;
  const next = configs[scenario];
  await db.batch([
    db.prepare("UPDATE care_residents SET simulated_time = ?, scenario = ?, severity = ? WHERE id = 'rose-demo'").bind(next.time, scenario, next.severity),
    db.prepare("UPDATE care_doses SET status = CASE WHEN id = 'dose-am' THEN ? ELSE 'upcoming' END, confirmed_at = NULL WHERE resident_id = 'rose-demo'").bind(next.dose),
    db.prepare("UPDATE care_devices SET status = ?, door_state = ? WHERE id = 'device-pillbox'").bind(next.device, next.door),
    db.prepare("DELETE FROM care_actions WHERE resident_id = 'rose-demo'"),
    db.prepare("DELETE FROM care_events WHERE resident_id = 'rose-demo' AND event_type LIKE 'scenario_%'")
  ]);
  await addEvent(db, { resident_id: "rose-demo", event_type: `scenario_${scenario}`, severity: next.severity, summary: next.summary, detail: next.detail, source: scenario === "device_offline" ? "Connectivity monitor · deterministic simulation" : "Care Station GC-01 · deterministic ruleset v1.0", occurred_at: next.time });
}

async function confirmDose(db: D1Database, doseId: string) {
  const dose = await db.prepare("SELECT * FROM care_doses WHERE id = ? AND resident_id = 'rose-demo'").bind(doseId).first<DbDose>();
  const device = await db.prepare("SELECT * FROM care_devices WHERE id = 'device-pillbox'").first<DbDevice>();
  const resident = await db.prepare("SELECT * FROM care_residents WHERE id = 'rose-demo'").first<DbResident>();
  if (!dose || !device || !resident) return json({ error: "Demo record not found." }, 404);
  if (dose.status !== "ready" || device.status !== "online" || device.door_state !== "closed") {
    return json({ error: "The deterministic device controller blocked release because its safety conditions were not met." }, 409);
  }
  await db.batch([
    db.prepare("UPDATE care_doses SET status = 'confirmed', confirmed_at = ? WHERE id = ?").bind(resident.simulated_time, doseId),
    db.prepare("UPDATE care_inventory SET units_remaining = max(0, units_remaining - 1), updated_at = ? WHERE resident_id = 'rose-demo'").bind(resident.simulated_time)
  ]);
  await addEvent(db, { resident_id: "rose-demo", event_type: "dose_confirmed", severity: "routine", summary: `${dose.label} confirmed`, detail: "A simulated local biometric attestation released one scheduled compartment. No biometric data left the device.", source: "Care Station GC-01 · simulated local attestation", occurred_at: resident.simulated_time });
  return json({ state: await loadCareState(db) });
}

async function prepareAction(db: D1Database, body: Record<string, unknown>) {
  const residentId = safeText(body.resident_id, 64);
  const channel = body.channel;
  const reason = safeText(body.reason);
  const key = safeText(body.idempotency_key, 80);
  if (residentId !== "rose-demo" || !["call", "visit", "message"].includes(String(channel)) || reason.length < 8 || key.length < 8) return json({ error: "Invalid staged action." }, 400);
  const existing = await db.prepare("SELECT * FROM care_actions WHERE idempotency_key = ?").bind(key).first<DbAction>();
  if (existing) return json({ action: existing, approval_required: true, duplicate_prevented: true });
  const resident = await db.prepare("SELECT * FROM care_residents WHERE id = ?").bind(residentId).first<DbResident>();
  if (!resident) return json({ error: "Resident not found." }, 404);
  const action: DbAction = { id: `act_${crypto.randomUUID()}`, resident_id: residentId, channel: channel as DbAction["channel"], reason, status: "awaiting_human_approval", idempotency_key: key, created_at: resident.simulated_time, resolved_at: null };
  await db.prepare("INSERT INTO care_actions (id, resident_id, channel, reason, status, idempotency_key, created_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(action.id, action.resident_id, action.channel, action.reason, action.status, action.idempotency_key, action.created_at, action.resolved_at).run();
  await addEvent(db, { resident_id: residentId, event_type: "caregiver_check_in_prepared", severity: resident.severity, summary: "Caregiver check-in prepared", detail: `A ${action.channel} check-in was staged. No call, visit, or message was initiated.`, source: "WebMCP tool · human approval required", occurred_at: resident.simulated_time });
  return json({ action, approval_required: true, external_side_effect: false });
}

async function resolveAction(db: D1Database, actionId: string, body: Record<string, unknown>) {
  const resolution = body.resolution;
  if (resolution !== "approved_in_demo" && resolution !== "dismissed") return json({ error: "Invalid resolution." }, 400);
  const action = await db.prepare("SELECT * FROM care_actions WHERE id = ?").bind(actionId).first<DbAction>();
  if (!action) return json({ error: "Prepared action not found." }, 404);
  await db.prepare("UPDATE care_actions SET status = ?, resolved_at = ? WHERE id = ? AND status = 'awaiting_human_approval'").bind(resolution, new Date().toISOString(), actionId).run();
  await addEvent(db, { resident_id: action.resident_id, event_type: "prepared_action_reviewed", severity: "routine", summary: resolution === "approved_in_demo" ? "Prepared check-in approved in demo" : "Prepared check-in dismissed", detail: resolution === "approved_in_demo" ? "Human approval was recorded in this simulation. No external communication was sent." : "The staged action was dismissed without external side effects.", source: "Caregiver workspace · explicit human decision", occurred_at: new Date().toISOString() });
  return json({ state: await loadCareState(db), external_side_effect: false });
}

async function handleApi(request: Request, env: Env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method === "GET" && path === "/api/care/state") {
    const state = await loadCareState(env.DB, url.searchParams.get("resident_id") ?? "rose-demo");
    return state ? json(state) : json({ error: "Care workspace not found." }, 404);
  }
  if (request.method === "POST" && path === "/api/care/scenario") {
    const body = await readJson(request);
    const parsed = scenarioSchema.safeParse(body.scenario);
    if (!parsed.success) return json({ error: "Unknown demo scenario." }, 400);
    await setScenario(env.DB, parsed.data);
    return json({ state: await loadCareState(env.DB) });
  }
  const doseMatch = path.match(/^\/api\/care\/doses\/([^/]+)\/confirm$/);
  if (request.method === "POST" && doseMatch) return confirmDose(env.DB, decodeURIComponent(doseMatch[1]));
  if (request.method === "POST" && path === "/api/care/actions") return prepareAction(env.DB, await readJson(request));
  const actionMatch = path.match(/^\/api\/care\/actions\/([^/]+)\/resolve$/);
  if (request.method === "POST" && actionMatch) return resolveAction(env.DB, decodeURIComponent(actionMatch[1]), await readJson(request));
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
