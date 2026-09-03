import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { CareTeamDayView } from "./CareTeamDayView";
import type { CareState, CareTeamHandoff, PreparedAction } from "./schemas";
import type { CareActions } from "./useCare";

type RegisteredTool = WebMCPTool;

const baseState: CareState = {
  fictional: true,
  demo_run_id: "run_testfrontend0001",
  evidence_version: 1,
  resident: { id: "rose-demo", display_name: "Rose", timezone: "America/New_York", simulated_time: "2026-08-31T08:14:00-04:00", scenario: "on_schedule", severity: "routine" },
  profile: { resident_id: "rose-demo", age: 79, living_arrangement: "Lives independently", support_schedule: "Weekday in-home support", relevant_history: ["Mild memory difficulties"], baseline: ["Morning medication usually confirmed by 8:30 AM"], preferences: ["Call before visiting"], source: "Care Plan v4", updated_at: "2026-08-31T08:14:00-04:00" },
  monitoring_plan: [{ id: "rule-med-gap", resident_id: "rose-demo", category: "medication_routine", title: "Review repeated confirmation gaps", instruction: "Ask Rose first, then prepare human review if two gaps occur within 72 hours.", threshold_description: "Two unconfirmed windows within 72 hours", authorized_by: "Nurse Ava", plan_version: "v4" }],
  care_story: { horizon_hours: 24, starts_at: "2026-08-30T08:14:00-04:00", ends_at: "2026-08-31T08:14:00-04:00", routine_confirmations: 1, unconfirmed_windows: 0, resident_check_ins: 0, routine_activity_signals: 0, device_interruptions: 0, summary: "Routine evidence remains consistent with Rose’s baseline.", unresolved: [], baseline_comparisons: [{ signal: "Morning medication routine", baseline: "Usually confirmed by 8:30 AM", observed: "Current window follows schedule", interpretation: "No baseline deviation established", evidence_status: "consistent" }] },
  doses: [
    { id: "dose-am", resident_id: "rose-demo", label: "Morning dose", scheduled_time: "08:00", window_label: "7:30–9:00 AM", compartment: "M–AM", status: "ready", confirmed_at: null },
    { id: "dose-noon", resident_id: "rose-demo", label: "Midday dose", scheduled_time: "12:00", window_label: "11:30 AM–1:00 PM", compartment: "M–NOON", status: "upcoming", confirmed_at: null },
    { id: "dose-pm", resident_id: "rose-demo", label: "Evening dose", scheduled_time: "20:00", window_label: "7:30–9:00 PM", compartment: "M–PM", status: "upcoming", confirmed_at: null }
  ],
  devices: [
    { id: "device-pillbox", resident_id: "rose-demo", name: "Care Station GC-01", device_type: "medication_dispenser", status: "online", battery_percent: 86, firmware: "1.2.0-demo", capabilities: ["schedule.read", "compartment.release.local_only"], door_state: "closed", last_seen: "2026-08-31T08:14:00-04:00", sensor_health: "nominal", applied_plan_version: "v4" }
  ],
  inventory: { resident_id: "rose-demo", units_remaining: 24, daily_cadence: 3, updated_at: "2026-08-31T08:14:00-04:00" },
  events: [
    { id: "evt-1", resident_id: "rose-demo", event_type: "window_verified", severity: "routine", summary: "Morning window verified", detail: "All deterministic checks passed.", source: "Care Station GC-01", occurred_at: "2026-08-31T08:14:00-04:00", actor_type: "device", actor_id: "device-pillbox", evidence_type: "observation", observed_at: "2026-08-31T08:14:00-04:00", recorded_at: "2026-08-31T08:14:00-04:00", trust_boundary: "device_attested_simulation", plan_version: "v4" },
    { id: "evt-confirmed", resident_id: "rose-demo", event_type: "dose_confirmed", severity: "routine", summary: "Evening dose confirmed", detail: "Local confirmation recorded.", source: "Test local attestation", occurred_at: "2026-08-29T19:42:00-04:00", actor_type: "resident", actor_id: "rose-demo", evidence_type: "observation", observed_at: "2026-08-29T19:42:00-04:00", recorded_at: "2026-08-29T19:42:00-04:00", trust_boundary: "local_attestation_only", plan_version: "v4" }
  ],
  resident_check_ins: [],
  actions: [],
  handoffs: [],
  caregivers: [
    { id: "caregiver-maya", display_name: "Maya Chen", role: "Home care aide", previous_resident_visits: 18, last_resident_shift_at: "2026-08-31T20:00:00-04:00", scheduled_weekly_hours: 32, preferred_max_hours: 40, projected_hours: 35, current_assignment_summary: "Called out", availability: { from: "2026-09-02T17:00:00-04:00", until: "2026-09-02T20:00:00-04:00", status: "unavailable", reason: "Maya called out." }, readiness: { core_training_current: true, role_qualification_current: true, resident_orientation_complete: true, acknowledged_care_plan_version: "v4" } },
    { id: "caregiver-jordan", display_name: "Jordan Lee", role: "Home care aide", previous_resident_visits: 4, last_resident_shift_at: "2026-08-25T20:00:00-04:00", scheduled_weekly_hours: 36, preferred_max_hours: 40, projected_hours: 39, current_assignment_summary: "Available", availability: { from: "2026-09-02T16:00:00-04:00", until: "2026-09-02T22:00:00-04:00", status: "available", reason: "Full window" }, readiness: { core_training_current: true, role_qualification_current: true, resident_orientation_complete: true, acknowledged_care_plan_version: "v4" } },
    { id: "caregiver-luis", display_name: "Luis Rivera", role: "Home care aide", previous_resident_visits: 11, last_resident_shift_at: "2026-08-30T20:00:00-04:00", scheduled_weekly_hours: 31, preferred_max_hours: 40, projected_hours: 34, current_assignment_summary: "Prior assignment ends 4:35 PM", availability: { from: "2026-09-02T16:35:00-04:00", until: "2026-09-02T22:00:00-04:00", status: "partial", reason: "Travel window is infeasible." }, readiness: { core_training_current: true, role_qualification_current: true, resident_orientation_complete: true, acknowledged_care_plan_version: "v4" } },
    { id: "caregiver-elena", display_name: "Elena Brooks", role: "Home care aide", previous_resident_visits: 0, last_resident_shift_at: null, scheduled_weekly_hours: 24, preferred_max_hours: 40, projected_hours: 27, current_assignment_summary: "Available", availability: { from: "2026-09-02T16:00:00-04:00", until: "2026-09-02T22:00:00-04:00", status: "available", reason: "Full window" }, readiness: { core_training_current: true, role_qualification_current: true, resident_orientation_complete: false, acknowledged_care_plan_version: "v3" } }
  ],
  shifts: [
    { id: "shift-wed-am", resident_id: "rose-demo", starts_at: "2026-09-02T09:00:00-04:00", ends_at: "2026-09-02T12:00:00-04:00", required_role: "Home care aide", required_orientation_plan_version: "v4", original_caregiver_id: "caregiver-jordan", assigned_caregiver_id: "caregiver-jordan", next_caregiver_id: "caregiver-maya", coverage_status: "covered", visit_status: "completed", handoff_status: "acknowledged", disruption_reason: null, version: 1 },
    { id: "shift-wed-pm", resident_id: "rose-demo", starts_at: "2026-09-02T17:00:00-04:00", ends_at: "2026-09-02T20:00:00-04:00", required_role: "Home care aide", required_orientation_plan_version: "v4", original_caregiver_id: "caregiver-maya", assigned_caregiver_id: null, next_caregiver_id: "caregiver-luis", coverage_status: "coverage_needed", visit_status: "not_started", handoff_status: "not_ready", disruption_reason: "Maya called out at 2:15 PM.", version: 1 }
  ],
  coverage_proposals: [],
  visit_events: [],
  shift_handoffs: [],
  handoff_acknowledgements: [],
  care_plan: { version: "v4", effective_at: "2026-08-31T07:00:00-04:00", authorized_by: "Nurse Ava", authorization_role: "Care team RN", device_applied_version: "v4", alignment: "aligned" },
  safety_contract: { ai_may: ["Read evidence"], ai_may_not: ["Release medication", "Diagnose", "Contact emergency services"], emergency_notice: "Contact local emergency services in an emergency." }
};

function installModelContext() {
  const tools = new Map<string, RegisteredTool>();
  Object.defineProperty(document, "modelContext", { configurable: true, value: { async registerTool(tool: RegisteredTool, options: { signal?: AbortSignal } = {}) { tools.set(tool.name, tool); options.signal?.addEventListener("abort", () => { if (tools.get(tool.name) === tool) tools.delete(tool.name); }); } } });
  return tools;
}

function installFetch() {
  let state = structuredClone(baseState);
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    if (url.startsWith("/api/care/state")) return Response.json(state);
    if (url === "/api/care/scenario") {
      if (body.scenario === "on_schedule") state = structuredClone(baseState);
      if (body.scenario === "coverage_callout") state = { ...structuredClone(baseState), resident: { ...baseState.resident, scenario: "coverage_callout", severity: "attention", simulated_time: "2026-09-02T14:15:00-04:00" } };
      if (body.scenario === "missed_window") state = { ...state, evidence_version: 1, resident: { ...state.resident, scenario: "missed_window", severity: "attention" }, doses: state.doses.map((dose, index) => index === 0 ? { ...dose, status: "missed" } : dose), resident_check_ins: [], actions: [], events: [{ ...state.events[0], id: "evt-missed", severity: "attention", summary: "Medication window elapsed" }, ...state.events] };
      if (body.scenario === "care_story") state = { ...state, evidence_version: 1, resident: { ...state.resident, scenario: "care_story", severity: "attention", simulated_time: "2026-09-02T09:42:00-04:00" }, doses: state.doses.map((dose, index) => index === 0 ? { ...dose, status: "missed" } : dose), resident_check_ins: [{ id: "story-check-in", resident_id: "rose-demo", prompt: "Are you okay?", status: "responded", response_code: "im_okay", evidence_snapshot_id: "historical-story-snapshot", idempotency_key: "historical-story-check-in", created_at: "2026-09-01T09:12:00-04:00", responded_at: "2026-09-01T09:14:00-04:00" }], actions: [], handoffs: [], care_story: { ...state.care_story, horizon_hours: 72, starts_at: "2026-08-31T07:00:00-04:00", ends_at: "2026-09-02T09:42:00-04:00", routine_confirmations: 3, unconfirmed_windows: 2, resident_check_ins: 1, routine_activity_signals: 2, summary: "Rose’s routine was largely consistent across three days. Two care-plan signals now require human review.", unresolved: ["Whether either unconfirmed window reflects medication ingestion"], baseline_comparisons: [{ signal: "Morning activity", baseline: "Usually begins by 7:30 AM", observed: "First movement at 9:31 AM", interpretation: "Person-specific change; cause unknown", evidence_status: "changed" }] }, events: [{ ...state.events[0], id: "story-current", event_type: "medication_window_unconfirmed", severity: "attention", summary: "Second monitoring-plan signal in 72 hours", detail: "A second morning medication window lacks confirmation." }, ...state.events] };
      if (body.scenario === "care_team_day") state = { ...structuredClone(baseState), resident: { ...baseState.resident, scenario: "care_team_day", severity: "attention", simulated_time: "2026-09-02T09:15:00-04:00" }, care_team_day: { step: 0, step_label: "Morning verification", next_event_label: "Assignment readiness", timeline: [{ step: 0, time: "9:15 AM", label: "Morning verification" }, { step: 1, time: "11:30 AM", label: "Assignment readiness" }, { step: 2, time: "2:15 PM", label: "Coverage recovery" }, { step: 3, time: "5:00 PM", label: "Replacement visit" }], residents: [{ id: "rose-demo", display_name: "Rose", age: 79, care_plan_version: "v4", support_setting: "Independent living", headline: "Evening visit currently covered", status: "routine", preferences: ["Call before visiting"], context: ["Mild memory difficulties"] }, { id: "walter-demo", display_name: "Walter", age: 84, care_plan_version: "v2", support_setting: "In-home support", headline: "Orientation needed", status: "routine", preferences: ["Use written reminders"], context: ["Uses a walker"] }, { id: "evelyn-demo", display_name: "Evelyn", age: 81, care_plan_version: "v3", support_setting: "Assisted living", headline: "Visit verification not received", status: "attention", preferences: ["Quiet morning routine"], context: ["Morning support visit"] }], attention_queue: [{ id: "attention-evelyn", resident_id: "evelyn-demo", resident_name: "Evelyn", state: "attention_now", attention_reason: "Scheduled visit began without a verification record", deadline: "Review now", source: "EVV adapter", policy_basis: "Visit verification policy", known: ["Luis is assigned"], unknown: ["Whether Luis is physically absent"], human_owner: "Care coordinator" }], orientation_packets: [], inquiries: [], advance_gate: { allowed: false, blockers: ["Investigate Evelyn’s missing verification record."], requirement: "Address the current block first." } }, shifts: [...structuredClone(baseState.shifts).map((shift) => shift.id === "shift-wed-pm" ? { ...shift, assigned_caregiver_id: "caregiver-maya", coverage_status: "covered" as const, disruption_reason: null } : shift), { id: "shift-evelyn-am", resident_id: "evelyn-demo", starts_at: "2026-09-02T09:00:00-04:00", ends_at: "2026-09-02T12:00:00-04:00", required_role: "home_care_aide", required_orientation_plan_version: "v3", original_caregiver_id: "caregiver-luis", assigned_caregiver_id: "caregiver-luis", next_caregiver_id: null, coverage_status: "covered", visit_status: "in_progress", handoff_status: "not_ready", disruption_reason: null, version: 1 }] };
      return Response.json({ state });
    }
    if (url === "/api/care/team-overview") return Response.json({ fictional: true, simulated_time: state.resident.simulated_time, step: state.care_team_day?.step, step_label: state.care_team_day?.step_label, residents: state.care_team_day?.residents, attention_queue: state.care_team_day?.attention_queue, next_event_label: state.care_team_day?.next_event_label, ordering_basis: "Deterministic deadlines; no medical severity", interpretation_boundary: "Missing evidence remains unknown." });
    if (url === "/api/care/team-inquiries" && state.care_team_day) {
      const inquiry = { id: "inquiry-evelyn-1", resident_id: "evelyn-demo" as const, caregiver_id: "caregiver-luis", inquiry_type: "visit_verification" as const, prompt: String(body.prompt), status: "awaiting_coordinator_approval" as const, response_code: null, response_detail: null, idempotency_key: String(body.idempotency_key), created_at: state.resident.simulated_time, responded_at: null, resolved_at: null };
      state = { ...state, care_team_day: { ...state.care_team_day, inquiries: [inquiry], attention_queue: state.care_team_day.attention_queue.map((item) => item.resident_id === "evelyn-demo" ? { ...item, state: "waiting_on_human" as const } : item), advance_gate: { ...state.care_team_day.advance_gate, blockers: ["Approve the prepared check-in."] } } };
      return Response.json({ inquiry, approval_required: true, external_side_effect: false });
    }
    if (url.includes("/api/care/team-inquiries/") && url.endsWith("/resolve") && state.care_team_day) {
      state = { ...state, care_team_day: { ...state.care_team_day, inquiries: state.care_team_day.inquiries.map((item) => ({ ...item, status: "response_received" as const, response_code: "arrived_verification_failed" as const, response_detail: "Luis reports that he arrived at 9:08 AM and his EVV application failed.", responded_at: state.resident.simulated_time })), advance_gate: { ...state.care_team_day.advance_gate, blockers: ["Review Luis’s response and close the exception."] } } };
      return Response.json({ state, response_received: true, external_side_effect: false });
    }
    if (url.includes("/api/care/team-inquiries/") && url.endsWith("/close") && state.care_team_day) {
      state = { ...state, care_team_day: { ...state.care_team_day, inquiries: state.care_team_day.inquiries.map((item) => ({ ...item, status: "resolved" as const, resolved_at: state.resident.simulated_time })), attention_queue: state.care_team_day.attention_queue.map((item) => item.resident_id === "evelyn-demo" ? { ...item, state: "resolved" as const, attention_reason: "Luis confirmed arrival; the EVV failure was documented" } : item), advance_gate: { ...state.care_team_day.advance_gate, allowed: true, blockers: [] } } };
      return Response.json({ state, external_side_effect: false });
    }
    if (url === "/api/care/team-day/advance" && state.care_team_day) {
      const nextStep = state.care_team_day.step + 1;
      const walterItem = { id: "attention-walter", resident_id: "walter-demo" as const, resident_name: "Walter", state: "waiting_on_human" as const, attention_reason: "Elena is available but not resident-specific assignment-ready", deadline: "Before the 1:00 PM visit", source: "Training registry", policy_basis: "Resident orientation required", known: ["Elena is available"], unknown: ["Orientation incomplete"], human_owner: "Elena" };
      state = { ...state, resident: { ...state.resident, simulated_time: "2026-09-02T11:30:00-04:00" }, care_team_day: { ...state.care_team_day, step: nextStep, step_label: "Assignment readiness", next_event_label: "Coverage recovery", attention_queue: [...state.care_team_day.attention_queue, walterItem], advance_gate: { allowed: false, blockers: ["Elena must acknowledge Walter’s orientation."], requirement: "Address the current block first." } } };
      return Response.json({ state });
    }
    if (url === "/api/care/orientation-packets" && state.care_team_day) {
      const packet = { id: "orientation-walter-1", resident_id: "walter-demo" as const, caregiver_id: "caregiver-elena", care_plan_version: "v2", status: "awaiting_coordinator_outreach" as const, reason: String(body.reason), idempotency_key: String(body.idempotency_key), created_at: state.resident.simulated_time, response_detail: null, responded_at: null, verified_at: null, sections: [{ title: "Meet Walter", detail: "Knock and announce before entering." }] };
      state = { ...state, care_team_day: { ...state.care_team_day, orientation_packets: [packet] } };
      return Response.json({ packet, coordinator_follow_up_required: true, external_side_effect: false });
    }
    if (url.includes("/orientation-packets/") && url.endsWith("/follow-up") && state.care_team_day) {
      state = { ...state, care_team_day: { ...state.care_team_day, orientation_packets: state.care_team_day.orientation_packets.map((packet) => ({ ...packet, status: "response_received" as const, response_detail: "I have Walter’s packet. I reviewed Care Plan v2 and submitted my acknowledgement. Can you verify that you see it?", responded_at: state.resident.simulated_time })) } };
      return Response.json({ state });
    }
    if (url.includes("/orientation-packets/") && url.endsWith("/verify") && state.care_team_day) {
      state = { ...state, care_team_day: { ...state.care_team_day, orientation_packets: state.care_team_day.orientation_packets.map((packet) => ({ ...packet, status: "verified" as const, verified_at: state.resident.simulated_time })), residents: state.care_team_day.residents.map((resident) => resident.id === "walter-demo" ? { ...resident, status: "resolved" as const } : resident), advance_gate: { ...state.care_team_day.advance_gate, allowed: true, blockers: [] } } };
      return Response.json({ state });
    }
    if (url === "/api/care/shift-context") {
      const residentRef = String(body.resident_ref ?? "").toLowerCase();
      const residentIdFromRef = residentRef === "evelyn" || residentRef === "evelyn-demo" ? "evelyn-demo" : residentRef === "walter" || residentRef === "walter-demo" ? "walter-demo" : residentRef === "rose" || residentRef === "rose-demo" ? "rose-demo" : null;
      const shift = body.shift_id ? state.shifts.find((candidate) => candidate.id === body.shift_id) : residentIdFromRef ? [...state.shifts].reverse().find((candidate) => candidate.resident_id === residentIdFromRef) : state.shifts.find((candidate) => candidate.disruption_reason);
      if (!shift || (body.shift_id && body.shift_id !== shift.id)) return Response.json({ error: "Shift not found" }, { status: 404 });
      return Response.json({
        fictional: true,
        resident_id: shift.resident_id,
        shift,
        schedule_snapshot_id: "schedule-snapshot-bootstrap",
        resolved_from: body.shift_id ? "explicit_shift_id" : residentIdFromRef ? "resident_reference" : "active_disrupted_shift"
      });
    }
    if (url === "/api/care/evidence-snapshot") return Response.json({ fictional: true, evidence_snapshot_id: `snapshot-test-version-${state.evidence_version}`, evidence_version: state.evidence_version, observed_at: state.resident.simulated_time, events: state.events.slice(0, 5), uncertainty: "Medication removal was not confirmed. Ingestion and welfare remain unknown.", next_step: "Use an available capability." });
    if (url === "/api/care/resident-check-ins") {
      const checkIn = { id: "resident-check-in-1", resident_id: "rose-demo", prompt: String(body.prompt), status: "awaiting_resident" as const, response_code: null, evidence_snapshot_id: String(body.evidence_snapshot_id), idempotency_key: String(body.idempotency_key), created_at: state.resident.simulated_time, responded_at: null };
      state = { ...state, evidence_version: state.evidence_version + 1, resident_check_ins: [checkIn] };
      return Response.json({ check_in: checkIn, resident_response_required: true, external_side_effect: false });
    }
    if (url.includes("/resident-check-ins/") && url.endsWith("/respond")) {
      state = { ...state, evidence_version: state.evidence_version + 1, resident_check_ins: state.resident_check_ins.map((checkIn) => ({ ...checkIn, status: "responded", response_code: body.response_code as "im_okay", responded_at: state.resident.simulated_time })) };
      return Response.json({ state });
    }
    if (url === "/api/care/actions") {
      const action: PreparedAction = { id: "action-1", resident_id: "rose-demo", channel: body.channel as PreparedAction["channel"], reason: String(body.reason), status: "awaiting_human_approval", evidence_snapshot_id: String(body.evidence_snapshot_id), idempotency_key: String(body.idempotency_key), created_at: state.resident.simulated_time, resolved_at: null };
      state = { ...state, actions: [action] };
      return Response.json({ action, approval_required: true, external_side_effect: false });
    }
    if (url === "/api/care/handoffs") {
      const handoff: CareTeamHandoff = { id: "handoff-1", resident_id: "rose-demo", review_type: body.review_type as CareTeamHandoff["review_type"], period_hours: body.period_hours as 72, reason: String(body.reason), status: "awaiting_human_approval", evidence_snapshot_id: String(body.evidence_snapshot_id), idempotency_key: String(body.idempotency_key), created_at: state.resident.simulated_time, resolved_at: null };
      state = { ...state, handoffs: [handoff] };
      return Response.json({ handoff, approval_required: true, external_side_effect: false });
    }
    if (url.includes("/handoffs/") && url.endsWith("/resolve")) { state = { ...state, handoffs: state.handoffs.map((handoff) => ({ ...handoff, status: "dismissed" })) }; return Response.json({ state, external_side_effect: false }); }
    if (url.includes("/resolve")) { state = { ...state, actions: state.actions.map((action) => ({ ...action, status: "dismissed" })) }; return Response.json({ state, external_side_effect: false }); }
    if (url.includes("/confirm")) { state = { ...state, doses: state.doses.map((dose, index) => index === 0 ? { ...dose, status: "confirmed" } : dose), inventory: { ...state.inventory, units_remaining: 23 } }; return Response.json({ state }); }
    return Response.json({ error: "Not found" }, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); window.history.replaceState({}, "", "/"); installFetch(); });

describe("Grapevine Care", () => {
  it("uses care-team language while the workspace is loading", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
    render(<App />);
    expect(screen.getByRole("heading", { name: "Preparing the Care Team Day" })).toBeInTheDocument();
    expect(screen.getByText("Loading the fictional coordination workspace…")).toBeInTheDocument();
    expect(screen.queryByText(/Preparing Rose/i)).not.toBeInTheDocument();
  });

  it("opens directly into one time-led Care Team Day without a permanent Rose tab", async () => {
    const tools = installModelContext();
    render(<App />);
    expect((await screen.findAllByText("9:15 AM")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Morning verification").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Care Team Day" })).toHaveClass("active");
    expect(screen.queryByRole("button", { name: "Rose’s station" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Demo scenario" })).not.toBeInTheDocument();
    await waitFor(() => expect(tools.has("prepare_team_inquiry")).toBe(true));
  });

  it("blocks simulated time until the current decision is accounted for", async () => {
    render(<App />);
    const tools = installModelContext();
    const advance = await screen.findByRole("button", { name: /Advance to 11:30 AM/i });
    expect(advance).toBeDisabled();
    await waitFor(() => expect(tools.has("prepare_team_inquiry")).toBe(true));
    await act(async () => { await tools.get("prepare_team_inquiry")!.execute({ resident_ref: "Evelyn", caregiver_id: "caregiver-luis", prompt: "Please confirm your status for Evelyn's scheduled morning visit.", idempotency_key: "test-evelyn-inquiry" }); });
    expect(screen.getByRole("button", { name: "Approve simulated check-in" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Approve simulated check-in" }));
    expect(await screen.findByText(/Luis reports that he arrived/i)).toBeInTheDocument();
    expect(advance).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Record disposition and close/i }));
    await waitFor(() => expect(advance).toBeEnabled());
  });

  it("advances only after investigation and then exposes Walter's state-specific tool", async () => {
    const tools = installModelContext();
    render(<App />);
    await screen.findAllByText("9:15 AM");
    fireEvent.click(screen.getByRole("button", { name: /Prepare check-in to Luis/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Approve simulated check-in" }));
    fireEvent.click(await screen.findByRole("button", { name: /Record disposition and close/i }));
    const advance = await screen.findByRole("button", { name: /Advance to 11:30 AM/i });
    await waitFor(() => expect(advance).toBeEnabled());
    fireEvent.click(advance);
    expect(await screen.findByText("Assignment readiness")).toBeInTheDocument();
    await waitFor(() => expect(tools.has("prepare_assignment_orientation")).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: /Prepare packet and follow-up/i }));
    expect(await screen.findByRole("button", { name: /Send readiness check-in to Elena/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /I’m Elena/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Send readiness check-in to Elena/i }));
    expect(await screen.findByText(/Can you verify that you see it/i)).toBeInTheDocument();
    const nextAdvance = screen.getByRole("button", { name: /Advance to 2:15 PM/i });
    expect(nextAdvance).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Verify receipt and clear Elena/i }));
    expect((await screen.findAllByText(/Elena may proceed with Walter’s visit/i)).length).toBeGreaterThan(0);
    await waitFor(() => expect(nextAdvance).toBeEnabled());
  });

  it("keeps the judge in the coordinator role for Jordan's 5:00 PM readiness", async () => {
    const prepareTeamInquiry = vi.fn(async () => ({ inquiry: {} as never, approval_required: true as const, external_side_effect: false as const }));
    const state: CareState = {
      ...structuredClone(baseState),
      resident: { ...baseState.resident, scenario: "care_team_day", simulated_time: "2026-09-02T17:00:00-04:00" },
      shifts: baseState.shifts.map((shift) => shift.id === "shift-wed-pm" ? { ...shift, assigned_caregiver_id: "caregiver-jordan", coverage_status: "assigned", visit_status: "not_started" } : shift),
      care_team_day: {
        step: 3,
        step_label: "Replacement visit",
        next_event_label: "Visit completion",
        timeline: [{ step: 0, time: "9:15 AM", label: "Morning verification" }, { step: 1, time: "11:30 AM", label: "Assignment readiness" }, { step: 2, time: "2:15 PM", label: "Coverage recovery" }, { step: 3, time: "5:00 PM", label: "Replacement visit" }, { step: 4, time: "7:35 PM", label: "Visit completion" }],
        residents: [{ id: "rose-demo", display_name: "Rose", age: 79, care_plan_version: "v4", support_setting: "Independent living", headline: "Jordan is assigned; readiness check needed", status: "attention", preferences: ["Call before visiting"], context: ["Mild memory difficulties"] }],
        attention_queue: [{ id: "attention-rose-start", resident_id: "rose-demo", resident_name: "Rose", state: "attention_now", attention_reason: "Jordan is assigned; confirm her brief and visit readiness", deadline: "At the 5:00 PM visit", source: "Assignment record", policy_basis: "Current brief acknowledgement", known: ["Jordan is assigned"], unknown: ["Whether Jordan reviewed the current brief"], human_owner: "Care coordinator and Jordan" }],
        orientation_packets: [], inquiries: [], advance_gate: { allowed: false, blockers: ["Prepare a current-brief readiness check-in for Jordan."], requirement: "Address the current block first." }
      }
    };
    render(<CareTeamDayView state={state} actions={{ prepareTeamInquiry } as unknown as CareActions} busy={false} webmcp={{ supported: true, registered: true, error: null, count: 4, availableNames: ["prepare_team_inquiry"] }} onMessage={() => undefined} />);
    expect(screen.queryByRole("button", { name: /I’m Jordan/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Prepare readiness check-in to Jordan/i }));
    await waitFor(() => expect(prepareTeamInquiry).toHaveBeenCalledWith(expect.objectContaining({ resident_ref: "Rose", caregiver_id: "caregiver-jordan" })));
  });

  it("keeps the technical safety contract available without competing with the care workflow", async () => {
    render(<App />);
    await screen.findAllByText("9:15 AM");
    fireEvent.click(screen.getByRole("button", { name: "How WebMCP works" }));
    expect(screen.getByRole("heading", { name: "A safe control plane for connected care" })).toBeInTheDocument();
    expect(screen.getByText("compartment.release.local_only")).toBeInTheDocument();
    expect(screen.getByText("Release medication")).toBeInTheDocument();
  });
});
