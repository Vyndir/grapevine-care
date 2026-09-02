import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { CareState, CareTeamHandoff, PreparedAction } from "./schemas";

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
      return Response.json({ state });
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

beforeEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); installFetch(); });

describe("Grapevine Care", () => {
  it("opens with the caregiver job and keeps Rose's large-touch view one click away", async () => {
    const tools = installModelContext();
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Keep Rose’s care moving—without losing context." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Caregiver cockpit" })).toHaveClass("active");
    await waitFor(() => expect(tools.has("get_shift_context") && tools.has("get_coverage_candidates") && tools.has("prepare_shift_coverage")).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: "Reset demo" }));
    fireEvent.click(await screen.findByRole("button", { name: "Rose’s view" }));
    expect(await screen.findByRole("heading", { name: "Good morning, Rose." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Verify locally/i })).toBeEnabled();
    await waitFor(() => expect(tools.size).toBe(7));
    expect([...tools.keys()].sort()).toEqual(["get_care_evidence", "get_care_overview", "get_care_story", "get_inventory_forecast", "get_medication_schedule", "get_resident_context", "prepare_caregiver_check_in"]);
    expect(screen.getByText(/Aug 29 · 7:42 PM/i)).toBeInTheDocument();
    expect(screen.getByText("Test local attestation")).toBeInTheDocument();
  });

  it("shows explicit uncertainty after the missed-window scenario", async () => {
    render(<App />);
    await screen.findByText("Keep Rose’s care moving—without losing context.");
    fireEvent.click(screen.getByRole("button", { name: "Missed window" }));
    expect(await screen.findByRole("heading", { name: "Rose’s care routine needs attention" })).toBeInTheDocument();
    expect(screen.getByText(/without assuming ingestion/i)).toBeInTheDocument();
  });

  it("lets the agent prepare a bounded question that only Rose can answer", async () => {
    const tools = installModelContext();
    render(<App />);
    await screen.findByText("Keep Rose’s care moving—without losing context.");
    fireEvent.click(screen.getByRole("button", { name: "Missed window" }));
    await waitFor(() => expect(tools.has("prepare_resident_check_in")).toBe(true));
    const evidence = await tools.get("get_care_evidence")!.execute({ resident_id: "rose-demo" }) as { evidence_snapshot_id: string };
    await act(async () => { await tools.get("prepare_resident_check_in")!.execute({ resident_id: "rose-demo", prompt: "Your care circle wants to check in. Are you okay?", evidence_snapshot_id: evidence.evidence_snapshot_id, idempotency_key: "resident-check-001" }); });
    fireEvent.click(screen.getByRole("button", { name: "Rose’s view" }));
    expect(await screen.findByRole("heading", { name: "Your care circle wants to check in. Are you okay?" })).toBeInTheDocument();
    expect(tools.has("prepare_resident_check_in")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "I'm okay" }));
    expect(await screen.findByText("Thank you, Rose.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset demo" }));
    await waitFor(() => expect(tools.has("prepare_caregiver_check_in")).toBe(true));
  });

  it("stages agent outreach and stops at human review", async () => {
    const tools = installModelContext();
    render(<App />);
    await screen.findByText("Keep Rose’s care moving—without losing context.");
    fireEvent.click(screen.getByRole("button", { name: "Reset demo" }));
    await waitFor(() => expect(tools.has("prepare_caregiver_check_in")).toBe(true));
    const evidence = await tools.get("get_care_evidence")!.execute({ resident_id: "rose-demo" }) as { evidence_snapshot_id: string };
    await act(async () => { await tools.get("prepare_caregiver_check_in")!.execute({ resident_id: "rose-demo", channel: "call", reason: "The current evidence needs caregiver review.", evidence_snapshot_id: evidence.evidence_snapshot_id, idempotency_key: "test-action-001" }); });
    expect(await screen.findByRole("dialog", { name: "Review caregiver check-in" })).toBeInTheDocument();
    expect(screen.getByText("Nothing has been sent or transmitted")).toBeInTheDocument();
  });

  it("turns a compressed 72-hour episode into baseline-aware WebMCP context and a human-gated nurse review", async () => {
    const tools = installModelContext();
    render(<App />);
    await screen.findByText("Keep Rose’s care moving—without losing context.");
    fireEvent.click(screen.getByRole("button", { name: "72-hour story" }));
    expect(await screen.findByRole("heading", { name: "How Rose has been doing, relative to Rose" })).toBeInTheDocument();
    expect(screen.getByText(/Two care-plan signals now require human review/i)).toBeInTheDocument();
    await waitFor(() => expect(tools.has("get_resident_context") && tools.has("get_care_story") && tools.has("prepare_care_team_review")).toBe(true));
    const story = await tools.get("get_care_story")!.execute({ resident_id: "rose-demo", horizon: "72_hours" }) as { story: { unconfirmed_windows: number } };
    expect(story.story.unconfirmed_windows).toBe(2);
    const day = await tools.get("get_care_story")!.execute({ resident_id: "rose-demo", horizon: "24_hours" }) as { story: { horizon_hours: number; summary: string } };
    expect(day.story.horizon_hours).toBe(24);
    expect(day.story.summary).toContain("24-hour slice");
    const evidence = await tools.get("get_care_evidence")!.execute({ resident_id: "rose-demo" }) as { evidence_snapshot_id: string };
    await act(async () => { await tools.get("prepare_care_team_review")!.execute({ resident_id: "rose-demo", review_type: "nurse_review", period_hours: 72, reason: "Two monitoring-plan signals require qualified human review without a clinical conclusion.", evidence_snapshot_id: evidence.evidence_snapshot_id, idempotency_key: "story-review-001" }); });
    expect(await screen.findByRole("dialog", { name: "Review nurse review" })).toBeInTheDocument();
    expect(screen.getByText(/Nothing has been sent or transmitted/i)).toBeInTheDocument();
  });

  it("makes device capability boundaries visible", async () => {
    render(<App />);
    await screen.findByText("Keep Rose’s care moving—without losing context.");
    fireEvent.click(screen.getByRole("button", { name: "Devices & MCP" }));
    expect(screen.getByRole("heading", { name: "A safe control plane for connected care" })).toBeInTheDocument();
    expect(screen.getByText("compartment.release.local_only")).toBeInTheDocument();
    expect(screen.getByText("Release medication")).toBeInTheDocument();
  });
});
