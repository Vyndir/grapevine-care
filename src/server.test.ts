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
    const contextResponse = await call(runA, "/api/care/shift-context", { method: "POST", body: JSON.stringify({ shift_id: "shift-wed-pm" }) });
    const context = await contextResponse.json() as { schedule_snapshot_id: string };
    const candidateResponse = await call(runA, "/api/care/coverage-candidates", { method: "POST", body: JSON.stringify({ shift_id: "shift-wed-pm" }) });
    const candidateResult = await candidateResponse.json() as { candidates: Array<{ caregiver: { id: string }; eligible: boolean; checks: unknown[] }> };
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

  it("rejects unsafe channels and oversized bodies", async () => {
    await state(runA);
    const unsafe = await call(runA, "/api/care/actions", { method: "POST", body: JSON.stringify({ resident_id: "rose-demo", channel: "dispatch_emergency_services", reason: "Attempt an unsafe external action.", evidence_snapshot_id: "snapshot-invalid-001", idempotency_key: "unsafe-action-001" }) });
    expect(unsafe.status).toBe(400);
    const oversized = await call(runA, "/api/care/actions", { method: "POST", body: JSON.stringify({ payload: "x".repeat(5000) }) });
    expect(oversized.status).toBe(413);
  });
});
