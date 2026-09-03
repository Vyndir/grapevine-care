// @vitest-environment node

import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import worker from "./server";
import type { CareState, CareTeamHandoff, PreparedAction, ResidentCheckIn, Scenario } from "./schemas";

class TestStatement {
  constructor(private database: DatabaseSync, private sql: string, private bindings: SQLInputValue[] = []) {}
  bind(...values: unknown[]) { return new TestStatement(this.database, this.sql, values as SQLInputValue[]); }
  async first<T>() { return (this.database.prepare(this.sql).get(...this.bindings) as T | undefined) ?? null; }
  async all<T>() { return { results: this.database.prepare(this.sql).all(...this.bindings) as T[], success: true, meta: {} }; }
  async run() {
    const result = this.database.prepare(this.sql).run(...this.bindings);
    return { results: [], success: true, meta: { changes: Number(result.changes) } };
  }
}

class TestD1 {
  readonly sqlite = new DatabaseSync(":memory:");
  prepare(sql: string) { return new TestStatement(this.sqlite, sql) as unknown as D1PreparedStatement; }
  async batch(statements: D1PreparedStatement[]) {
    this.sqlite.exec("BEGIN IMMEDIATE");
    try {
      const results = [];
      for (const statement of statements) results.push(await (statement as unknown as TestStatement).run());
      this.sqlite.exec("COMMIT");
      return results as unknown as D1Result<unknown>[];
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }
  migrate() {
    this.sqlite.exec(readFileSync(new URL("../drizzle/0001_grapevine_care.sql", import.meta.url), "utf8"));
    this.sqlite.exec(readFileSync(new URL("../drizzle/0002_demo_run_isolation.sql", import.meta.url), "utf8"));
    this.sqlite.exec(readFileSync(new URL("../drizzle/0003_evidence_resolution_loop.sql", import.meta.url), "utf8"));
    this.sqlite.exec(readFileSync(new URL("../drizzle/0004_longitudinal_care_story.sql", import.meta.url), "utf8"));
    this.sqlite.exec(readFileSync(new URL("../drizzle/0005_caregiver_continuity_loop.sql", import.meta.url), "utf8"));
    this.sqlite.exec(readFileSync(new URL("../drizzle/0006_care_team_day.sql", import.meta.url), "utf8"));
    this.sqlite.exec(readFileSync(new URL("../drizzle/0007_inquiry_driven_day.sql", import.meta.url), "utf8"));
    this.sqlite.exec(readFileSync(new URL("../drizzle/0008_orientation_follow_up.sql", import.meta.url), "utf8"));
  }
  close() { this.sqlite.close(); }
}

const runA = "run_serverisolationA01";
const runB = "run_serverisolationB02";
let database: TestD1;
let env: Env;

beforeEach(() => {
  database = new TestD1();
  database.migrate();
  env = { DB: database as unknown as D1Database } as Env;
});

afterEach(() => database.close());

async function call(runId: string | null, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (runId) headers.set("x-grapevine-demo-run", runId);
  if (init.body) headers.set("content-type", "application/json");
  return worker.fetch(new Request(`https://care.test${path}`, { ...init, headers }), env);
}

async function state(runId: string) {
  const response = await call(runId, "/api/care/state?resident_id=rose-demo");
  expect(response.status).toBe(200);
  return response.json() as Promise<CareState>;
}

async function scenario(runId: string, next: Scenario) {
  return call(runId, "/api/care/scenario", { method: "POST", body: JSON.stringify({ scenario: next }) });
}

async function snapshot(runId: string) {
  const response = await call(runId, "/api/care/evidence-snapshot", { method: "POST", body: JSON.stringify({ resident_id: "rose-demo", event_limit: 5 }) });
  expect(response.status).toBe(200);
  return response.json() as Promise<{ evidence_snapshot_id: string; evidence_version: number }>;
}

async function resolveResidentEvidence(runId: string) {
  const current = await snapshot(runId);
  const preparedResponse = await call(runId, "/api/care/resident-check-ins", { method: "POST", body: JSON.stringify({ resident_id: "rose-demo", prompt: "Your care circle wants to check in. Are you okay?", evidence_snapshot_id: current.evidence_snapshot_id, idempotency_key: "resident-loop-001" }) });
  expect(preparedResponse.status).toBe(200);
  const prepared = await preparedResponse.json() as { check_in: ResidentCheckIn };
  const response = await call(runId, `/api/care/resident-check-ins/${prepared.check_in.id}/respond`, { method: "POST", body: JSON.stringify({ response_code: "im_okay" }) });
  expect(response.status).toBe(200);
  return prepared.check_in;
}

describe("Grapevine Care server invariants", () => {
  it("requires a bounded isolated demo-run identifier", async () => {
    expect((await call(null, "/api/care/state")).status).toBe(400);
    expect((await call("shared", "/api/care/state")).status).toBe(400);
    expect((await call(runA, "/api/care/state")).status).toBe(200);
  });

  it("keeps two browser runs independent", async () => {
    await state(runA);
    await state(runB);
    expect((await call(runA, "/api/care/doses/dose-am/confirm", { method: "POST", body: "{}" })).status).toBe(200);
    expect((await state(runA)).inventory.units_remaining).toBe(23);
    expect((await state(runB)).inventory.units_remaining).toBe(24);
    await scenario(runB, "device_offline");
    expect((await state(runA)).resident.scenario).toBe("on_schedule");
    expect((await state(runB)).resident.scenario).toBe("device_offline");
  });

  it("performs a complete deterministic reset", async () => {
    await state(runA);
    await call(runA, "/api/care/doses/dose-am/confirm", { method: "POST", body: "{}" });
    const current = await snapshot(runA);
    await call(runA, "/api/care/actions", { method: "POST", body: JSON.stringify({ resident_id: "rose-demo", channel: "call", reason: "Review the current evidence with Rose.", evidence_snapshot_id: current.evidence_snapshot_id, idempotency_key: "reset-action-001" }) });
    await scenario(runA, "missed_window");
    const reset = await state(runA);
    expect(reset.inventory.units_remaining).toBe(24);
    expect(reset.actions).toEqual([]);
    expect(reset.doses.map((dose) => dose.status)).toEqual(["missed", "upcoming", "upcoming"]);
    expect(reset.events.filter((event) => event.summary === "Morning dose confirmed")).toHaveLength(0);
    expect(reset.events[0].summary).toBe("Medication window elapsed");
  });

  it("blocks duplicate, missed, door-open, and offline release attempts", async () => {
    await state(runA);
    expect((await call(runA, "/api/care/doses/dose-am/confirm", { method: "POST", body: "{}" })).status).toBe(200);
    expect((await call(runA, "/api/care/doses/dose-am/confirm", { method: "POST", body: "{}" })).status).toBe(409);
    expect((await state(runA)).inventory.units_remaining).toBe(23);
    for (const blocked of ["missed_window", "door_fault", "device_offline"] as const) {
      await scenario(runA, blocked);
      expect((await call(runA, "/api/care/doses/dose-am/confirm", { method: "POST", body: "{}" })).status).toBe(409);
      expect((await state(runA)).inventory.units_remaining).toBe(24);
    }
  });

  it("deduplicates prepared actions and their evidence events", async () => {
    await state(runA);
    const current = await snapshot(runA);
    const body = JSON.stringify({ resident_id: "rose-demo", channel: "call", reason: "Review the current evidence with Rose.", evidence_snapshot_id: current.evidence_snapshot_id, idempotency_key: "duplicate-action-001" });
    const first = await (await call(runA, "/api/care/actions", { method: "POST", body })).json() as { action: PreparedAction; duplicate_prevented: boolean };
    const second = await (await call(runA, "/api/care/actions", { method: "POST", body })).json() as { action: PreparedAction; duplicate_prevented: boolean };
    expect(second.action.id).toBe(first.action.id);
    expect(first.duplicate_prevented).toBe(false);
    expect(second.duplicate_prevented).toBe(true);
    expect((await state(runA)).events.filter((event) => event.event_type === "caregiver_check_in_prepared")).toHaveLength(1);
  });

  it("resolves an action once using the simulated timeline", async () => {
    await scenario(runA, "missed_window");
    await resolveResidentEvidence(runA);
    const current = await snapshot(runA);
    const prepared = await (await call(runA, "/api/care/actions", { method: "POST", body: JSON.stringify({ resident_id: "rose-demo", channel: "visit", reason: "Review Rose's care evidence in person.", evidence_snapshot_id: current.evidence_snapshot_id, idempotency_key: "resolve-action-001" }) })).json() as { action: PreparedAction };
    const path = `/api/care/actions/${prepared.action.id}/resolve`;
    const first = await (await call(runA, path, { method: "POST", body: JSON.stringify({ resolution: "approved_in_demo" }) })).json() as { already_resolved: boolean; state: CareState };
    const second = await (await call(runA, path, { method: "POST", body: JSON.stringify({ resolution: "approved_in_demo" }) })).json() as { already_resolved: boolean; state: CareState };
    expect(first.already_resolved).toBe(false);
    expect(second.already_resolved).toBe(true);
    expect(second.state.events.filter((event) => event.event_type === "prepared_action_reviewed")).toHaveLength(1);
    expect(second.state.actions[0].resolved_at).toBe(second.state.resident.simulated_time);
  });

  it("forces re-observation after Rose contributes evidence", async () => {
    await scenario(runA, "missed_window");
    const old = await snapshot(runA);
    const prepared = await (await call(runA, "/api/care/resident-check-ins", { method: "POST", body: JSON.stringify({ resident_id: "rose-demo", prompt: "Your care circle wants to check in. Are you okay?", evidence_snapshot_id: old.evidence_snapshot_id, idempotency_key: "stale-resident-001" }) })).json() as { check_in: ResidentCheckIn };
    await call(runA, `/api/care/resident-check-ins/${prepared.check_in.id}/respond`, { method: "POST", body: JSON.stringify({ response_code: "contact_caregiver" }) });
    const stale = await call(runA, "/api/care/actions", { method: "POST", body: JSON.stringify({ resident_id: "rose-demo", channel: "call", reason: "Rose requested a caregiver check-in.", evidence_snapshot_id: old.evidence_snapshot_id, idempotency_key: "stale-action-001" }) });
    expect(stale.status).toBe(409);
    expect(await stale.json()).toMatchObject({ stale_evidence: true });
    const current = await snapshot(runA);
    expect(current.evidence_version).toBeGreaterThan(old.evidence_version);
    const fresh = await call(runA, "/api/care/actions", { method: "POST", body: JSON.stringify({ resident_id: "rose-demo", channel: "call", reason: "Rose requested a caregiver check-in.", evidence_snapshot_id: current.evidence_snapshot_id, idempotency_key: "fresh-action-001" }) });
    expect(fresh.status).toBe(200);
  });

  it("records Rose's answer as bounded self-report evidence", async () => {
    await scenario(runA, "missed_window");
    await resolveResidentEvidence(runA);
    const current = await state(runA);
    const selfReport = current.events.find((event) => event.event_type === "resident_self_report");
    expect(selfReport).toMatchObject({ actor_type: "resident", actor_id: "rose-demo", evidence_type: "self_report", trust_boundary: "resident_self_report_not_clinical_verification" });
    expect(selfReport?.detail).toContain("does not resolve the medication-removal");
    expect(current.doses[0].status).toBe("missed");
  });

  it("requests idempotent non-clinical device diagnostics without control", async () => {
    await scenario(runA, "device_offline");
    const body = JSON.stringify({ resident_id: "rose-demo", device_id: "device-pillbox", idempotency_key: "device-check-001" });
    const first = await (await call(runA, "/api/care/device-health-snapshots", { method: "POST", body })).json() as { evidence_changed: boolean; diagnostic: { status: string }; duplicate_prevented: boolean };
    const second = await (await call(runA, "/api/care/device-health-snapshots", { method: "POST", body })).json() as { evidence_changed: boolean; duplicate_prevented: boolean };
    expect(first.diagnostic.status).toBe("offline");
    expect(first.evidence_changed).toBe(true);
    expect(second.evidence_changed).toBe(false);
    expect(second.duplicate_prevented).toBe(true);
    expect((await state(runA)).events.filter((event) => event.event_type === "device_health_snapshot")).toHaveLength(1);
  });

  it("builds a baseline-aware 72-hour story from care-team-authored context", async () => {
    await scenario(runA, "care_story");
    const current = await state(runA);
    expect(current.profile).toMatchObject({ age: 79, source: expect.stringContaining("Care Plan v4") });
    expect(current.monitoring_plan).toHaveLength(3);
    expect(current.care_story).toMatchObject({ horizon_hours: 72, unconfirmed_windows: 2, resident_check_ins: 1, device_interruptions: 0 });
    expect(current.care_story.summary).toContain("Neither observation establishes ingestion, illness, or an emergency");
    expect(current.care_story.baseline_comparisons.find((item) => item.signal === "Morning activity")).toMatchObject({ evidence_status: "changed" });
  });

  it("prepares and resolves one snapshot-bound nurse review without transmission", async () => {
    await scenario(runA, "care_story");
    const currentSnapshot = await snapshot(runA);
    const body = JSON.stringify({ resident_id: "rose-demo", review_type: "nurse_review", period_hours: 72, reason: "Two care-plan monitoring signals occurred within 72 hours; qualified human review is requested without a clinical conclusion.", evidence_snapshot_id: currentSnapshot.evidence_snapshot_id, idempotency_key: "care-team-review-001" });
    const first = await (await call(runA, "/api/care/handoffs", { method: "POST", body })).json() as { handoff: CareTeamHandoff; duplicate_prevented: boolean; external_side_effect: boolean };
    const duplicate = await (await call(runA, "/api/care/handoffs", { method: "POST", body })).json() as { handoff: CareTeamHandoff; duplicate_prevented: boolean };
    expect(first.external_side_effect).toBe(false);
    expect(duplicate.duplicate_prevented).toBe(true);
    expect(duplicate.handoff.id).toBe(first.handoff.id);
    const resolved = await (await call(runA, `/api/care/handoffs/${first.handoff.id}/resolve`, { method: "POST", body: JSON.stringify({ resolution: "approved_in_demo" }) })).json() as { state: CareState; external_side_effect: boolean };
    expect(resolved.external_side_effect).toBe(false);
    expect(resolved.state.handoffs[0].status).toBe("approved_in_demo");
    expect(resolved.state.events.some((event) => event.event_type === "care_team_review_decided")).toBe(true);
  });

  it("rejects care-team review before the signed monitoring threshold is present", async () => {
    await state(runA);
    const currentSnapshot = await snapshot(runA);
    const response = await call(runA, "/api/care/handoffs", { method: "POST", body: JSON.stringify({ resident_id: "rose-demo", review_type: "nurse_review", period_hours: 72, reason: "Attempt review before the signed monitoring threshold is present.", evidence_snapshot_id: currentSnapshot.evidence_snapshot_id, idempotency_key: "premature-review-001" }) });
    expect(response.status).toBe(409);
  });

  it("recovers a caregiver call-out through scheduler approval, visit, and acknowledged handoff", async () => {
    await scenario(runA, "coverage_callout");
    const contextResponse = await call(runA, "/api/care/shift-context", { method: "POST", body: JSON.stringify({}) });
    const context = await contextResponse.json() as { shift: { id: string }; resident_id?: string; schedule_snapshot_id: string; resolved_from: string };
    expect(context.shift.id).toBe("shift-wed-pm");
    expect(context.resolved_from).toBe("active_disrupted_shift");
    const candidateResponse = await call(runA, "/api/care/coverage-candidates", { method: "POST", body: "{}" });
    const candidateResult = await candidateResponse.json() as { shift_id: string; resolved_from: string; candidates: Array<{ caregiver: { id: string }; eligible: boolean; checks: unknown[] }> };
    expect(candidateResult).toMatchObject({ shift_id: "shift-wed-pm", resolved_from: "single_active_coverage_need" });
    expect(candidateResult.candidates.filter((candidate) => candidate.eligible).map((candidate) => candidate.caregiver.id)).toEqual(["caregiver-jordan"]);
    expect(candidateResult.candidates.every((candidate) => candidate.checks.length === 8)).toBe(true);
    const prepared = await (await call(runA, "/api/care/coverage-proposals", { method: "POST", body: JSON.stringify({ shift_id: "shift-wed-pm", caregiver_id: "caregiver-jordan", schedule_snapshot_id: context.schedule_snapshot_id, reason: "Jordan passes every explicit eligibility constraint and stays within her stated weekly availability.", idempotency_key: "coverage-loop-001" }) })).json() as { proposal: { id: string }; schedule_changed: boolean };
    expect(prepared.schedule_changed).toBe(false);
    expect((await state(runA)).shifts.find((shift) => shift.id === "shift-wed-pm")?.assigned_caregiver_id).toBeNull();
    await call(runA, `/api/care/coverage-proposals/${prepared.proposal.id}/resolve`, { method: "POST", body: JSON.stringify({ resolution: "approved_in_demo" }) });
    expect((await state(runA)).shifts.find((shift) => shift.id === "shift-wed-pm")?.assigned_caregiver_id).toBe("caregiver-jordan");
    const brief = await call(runA, "/api/care/shift-brief", { method: "POST", body: JSON.stringify({ shift_id: "shift-wed-pm", caregiver_id: "caregiver-jordan" }) });
    expect(brief.status).toBe(200);
    await call(runA, "/api/care/shifts/shift-wed-pm/start", { method: "POST", body: JSON.stringify({ caregiver_id: "caregiver-jordan" }) });
    await call(runA, "/api/care/shifts/shift-wed-pm/complete", { method: "POST", body: JSON.stringify({ caregiver_id: "caregiver-jordan" }) });
    const handoffContext = await (await call(runA, "/api/care/shift-context", { method: "POST", body: JSON.stringify({ shift_id: "shift-wed-pm" }) })).json() as { schedule_snapshot_id: string };
    const preparedHandoff = await (await call(runA, "/api/care/shift-handoffs", { method: "POST", body: JSON.stringify({ shift_id: "shift-wed-pm", to_caregiver_id: "caregiver-luis", schedule_snapshot_id: handoffContext.schedule_snapshot_id, reason: "Preserve completed tasks, bounded observations, and unresolved items for the next assigned caregiver.", idempotency_key: "handoff-loop-001" }) })).json() as { handoff: { id: string }; recipient_has_access: boolean };
    expect(preparedHandoff.recipient_has_access).toBe(false);
    await call(runA, `/api/care/shift-handoffs/${preparedHandoff.handoff.id}/resolve`, { method: "POST", body: JSON.stringify({ resolution: "approved_in_demo" }) });
    await call(runA, `/api/care/shift-handoffs/${preparedHandoff.handoff.id}/acknowledge`, { method: "POST", body: JSON.stringify({ caregiver_id: "caregiver-luis" }) });
    const completed = await state(runA);
    expect(completed.shifts.find((shift) => shift.id === "shift-wed-pm")).toMatchObject({ visit_status: "completed", handoff_status: "acknowledged" });
    expect(completed.handoff_acknowledgements).toHaveLength(1);
  });

  it("rejects an ineligible caregiver and a stale schedule snapshot", async () => {
    await scenario(runA, "coverage_callout");
    const context = await (await call(runA, "/api/care/shift-context", { method: "POST", body: JSON.stringify({ shift_id: "shift-wed-pm" }) })).json() as { schedule_snapshot_id: string };
    const ineligible = await call(runA, "/api/care/coverage-proposals", { method: "POST", body: JSON.stringify({ shift_id: "shift-wed-pm", caregiver_id: "caregiver-elena", schedule_snapshot_id: context.schedule_snapshot_id, reason: "Attempt to select a caregiver who has not completed Rose orientation or acknowledged Care Plan v4.", idempotency_key: "coverage-ineligible-001" }) });
    expect(ineligible.status).toBe(409);
    expect(await ineligible.json()).toMatchObject({ deterministic_exclusions: expect.arrayContaining([expect.stringContaining("orientation")]) });
    const prepared = await (await call(runA, "/api/care/coverage-proposals", { method: "POST", body: JSON.stringify({ shift_id: "shift-wed-pm", caregiver_id: "caregiver-jordan", schedule_snapshot_id: context.schedule_snapshot_id, reason: "Jordan passes every explicit eligibility constraint and stays within her stated weekly availability.", idempotency_key: "coverage-stale-setup" }) })).json() as { proposal: { id: string } };
    await call(runA, `/api/care/coverage-proposals/${prepared.proposal.id}/resolve`, { method: "POST", body: JSON.stringify({ resolution: "dismissed" }) });
    const stale = await call(runA, "/api/care/coverage-proposals", { method: "POST", body: JSON.stringify({ shift_id: "shift-wed-pm", caregiver_id: "caregiver-jordan", schedule_snapshot_id: context.schedule_snapshot_id, reason: "Retry with a stale schedule snapshot after the shift version changed.", idempotency_key: "coverage-stale-001" }) });
    expect(stale.status).toBe(409);
    expect(await stale.json()).toMatchObject({ stale_schedule: true });
  });

  it("runs a deterministic multi-resident care-team day without turning missing evidence into a conclusion", async () => {
    expect((await scenario(runA, "care_team_day")).status).toBe(200);
    let current = await state(runA);
    expect(current.care_team_day?.residents.map((resident) => resident.display_name)).toEqual(["Rose", "Walter", "Evelyn"]);
    expect(current.care_team_day?.attention_queue.find((item) => item.resident_id === "evelyn-demo")).toMatchObject({ state: "attention_now", unknown: ["Whether Luis is physically absent", "Whether Evelyn needs assistance"] });

    const overviewResponse = await call(runA, "/api/care/team-overview", { method: "POST", body: "{}" });
    expect(overviewResponse.status).toBe(200);
    const overview = await overviewResponse.json() as { ordering_basis: string; attention_queue: Array<{ resident_id: string }> };
    expect(overview.ordering_basis).toContain("no medical severity");
    expect(overview.attention_queue.some((item) => item.resident_id === "evelyn-demo")).toBe(true);

    const evelynContext = await (await call(runA, "/api/care/shift-context", { method: "POST", body: JSON.stringify({ resident_ref: "Evelyn" }) })).json() as { shift: { id: string }; resolved_from: string };
    expect(evelynContext).toMatchObject({ shift: { id: "shift-evelyn-am" }, resolved_from: "resident_reference" });

    const blocked = await call(runA, "/api/care/team-day/advance", { method: "POST", body: "{}" });
    expect(blocked.status).toBe(409);
    expect(await blocked.json()).toMatchObject({ blocked_by: [expect.stringContaining("Investigate Evelyn")] });

    const inquiryResponse = await call(runA, "/api/care/team-inquiries", { method: "POST", body: JSON.stringify({ resident_ref: "Evelyn", caregiver_id: "caregiver-luis", prompt: "Please confirm your current status for Evelyn's scheduled morning visit.", idempotency_key: "evelyn-inquiry-001" }) });
    expect(inquiryResponse.status).toBe(200);
    const inquiry = await inquiryResponse.json() as { inquiry: { id: string; status: string }; approval_required: boolean };
    expect(inquiry).toMatchObject({ inquiry: { status: "awaiting_coordinator_approval" }, approval_required: true });
    expect((await call(runA, `/api/care/team-inquiries/${inquiry.inquiry.id}/resolve`, { method: "POST", body: JSON.stringify({ decision: "send_in_demo" }) })).status).toBe(200);
    current = await state(runA);
    expect(current.care_team_day?.inquiries[0]).toMatchObject({ status: "response_received", response_code: "arrived_verification_failed" });
    expect((await call(runA, "/api/care/team-day/advance", { method: "POST", body: "{}" })).status).toBe(409);
    expect((await call(runA, `/api/care/team-inquiries/${inquiry.inquiry.id}/close`, { method: "POST", body: "{}" })).status).toBe(200);
    current = await state(runA);
    expect(current.care_team_day?.advance_gate.allowed).toBe(true);

    expect((await call(runA, "/api/care/team-day/advance", { method: "POST", body: "{}" })).status).toBe(200);
    current = await state(runA);
    expect(current.care_team_day?.step).toBe(1);
    expect(current.care_team_day?.attention_queue.find((item) => item.resident_id === "evelyn-demo")?.state).toBe("resolved");

    const prepared = await (await call(runA, "/api/care/orientation-packets", { method: "POST", body: JSON.stringify({ resident_ref: "Walter", caregiver_id: "caregiver-elena", reason: "Prepare the current resident-specific orientation before assignment readiness.", idempotency_key: "walter-orientation-001" }) })).json() as { packet: { id: string; status: string }; coordinator_follow_up_required: boolean };
    expect(prepared.packet.status).toBe("awaiting_coordinator_outreach");
    expect(prepared.coordinator_follow_up_required).toBe(true);
    const replay = await (await call(runA, "/api/care/orientation-packets", { method: "POST", body: JSON.stringify({ resident_ref: "Walter", caregiver_id: "caregiver-elena", reason: "Prepare the current resident-specific orientation before assignment readiness.", idempotency_key: "walter-orientation-001" }) })).json() as { packet: { id: string }; idempotent_replay: boolean };
    expect(replay).toMatchObject({ packet: { id: prepared.packet.id }, idempotent_replay: true });
    expect((await call(runA, "/api/care/team-day/advance", { method: "POST", body: "{}" })).status).toBe(409);
    expect((await call(runA, `/api/care/orientation-packets/${prepared.packet.id}/follow-up`, { method: "POST", body: "{}" })).status).toBe(200);
    current = await state(runA);
    expect(current.care_team_day?.orientation_packets[0]).toMatchObject({ status: "response_received", response_detail: expect.stringContaining("Can you verify") });
    expect((await call(runA, "/api/care/team-day/advance", { method: "POST", body: "{}" })).status).toBe(409);
    expect((await call(runA, `/api/care/orientation-packets/${prepared.packet.id}/verify`, { method: "POST", body: "{}" })).status).toBe(200);
    current = await state(runA);
    expect(current.care_team_day?.residents.find((resident) => resident.id === "walter-demo")?.status).toBe("resolved");

    await call(runA, "/api/care/team-day/advance", { method: "POST", body: "{}" });
    current = await state(runA);
    expect(current.care_team_day?.step).toBe(2);
    expect(current.shifts.find((shift) => shift.id === "shift-wed-pm")).toMatchObject({ coverage_status: "coverage_needed", assigned_caregiver_id: null });
    expect(current.care_team_day?.attention_queue.find((item) => item.resident_id === "rose-demo")?.attention_reason).toContain("called out");
  });

  it("rejects unsafe channels and oversized bodies", async () => {
    await state(runA);
    const unsafe = await call(runA, "/api/care/actions", { method: "POST", body: JSON.stringify({ resident_id: "rose-demo", channel: "dispatch_emergency_services", reason: "Attempt an unsafe external action.", evidence_snapshot_id: "snapshot-invalid-001", idempotency_key: "unsafe-action-001" }) });
    expect(unsafe.status).toBe(400);
    const oversized = await call(runA, "/api/care/actions", { method: "POST", body: JSON.stringify({ payload: "x".repeat(5000) }) });
    expect(oversized.status).toBe(413);
  });
});
