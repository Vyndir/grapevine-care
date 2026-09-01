// @vitest-environment node

import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import worker from "./server";
import type { CareState, PreparedAction, Scenario } from "./schemas";

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
    await call(runA, "/api/care/actions", { method: "POST", body: JSON.stringify({ resident_id: "rose-demo", channel: "call", reason: "Review the missed confirmation with Rose.", idempotency_key: "reset-action-001" }) });
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
    const body = JSON.stringify({ resident_id: "rose-demo", channel: "call", reason: "Review the missed confirmation with Rose.", idempotency_key: "duplicate-action-001" });
    const first = await (await call(runA, "/api/care/actions", { method: "POST", body })).json() as { action: PreparedAction; duplicate_prevented: boolean };
    const second = await (await call(runA, "/api/care/actions", { method: "POST", body })).json() as { action: PreparedAction; duplicate_prevented: boolean };
    expect(second.action.id).toBe(first.action.id);
    expect(first.duplicate_prevented).toBe(false);
    expect(second.duplicate_prevented).toBe(true);
    expect((await state(runA)).events.filter((event) => event.event_type === "caregiver_check_in_prepared")).toHaveLength(1);
  });

  it("resolves an action once using the simulated timeline", async () => {
    await scenario(runA, "missed_window");
    const prepared = await (await call(runA, "/api/care/actions", { method: "POST", body: JSON.stringify({ resident_id: "rose-demo", channel: "visit", reason: "Review Rose's care evidence in person.", idempotency_key: "resolve-action-001" }) })).json() as { action: PreparedAction };
    const path = `/api/care/actions/${prepared.action.id}/resolve`;
    const first = await (await call(runA, path, { method: "POST", body: JSON.stringify({ resolution: "approved_in_demo" }) })).json() as { already_resolved: boolean; state: CareState };
    const second = await (await call(runA, path, { method: "POST", body: JSON.stringify({ resolution: "approved_in_demo" }) })).json() as { already_resolved: boolean; state: CareState };
    expect(first.already_resolved).toBe(false);
    expect(second.already_resolved).toBe(true);
    expect(second.state.events.filter((event) => event.event_type === "prepared_action_reviewed")).toHaveLength(1);
    expect(second.state.actions[0].resolved_at).toBe("2026-08-31T09:36:00-04:00");
  });

  it("rejects unsafe channels and oversized bodies", async () => {
    await state(runA);
    const unsafe = await call(runA, "/api/care/actions", { method: "POST", body: JSON.stringify({ resident_id: "rose-demo", channel: "dispatch_emergency_services", reason: "Attempt an unsafe external action.", idempotency_key: "unsafe-action-001" }) });
    expect(unsafe.status).toBe(400);
    const oversized = await call(runA, "/api/care/actions", { method: "POST", body: JSON.stringify({ payload: "x".repeat(5000) }) });
    expect(oversized.status).toBe(413);
  });
});
