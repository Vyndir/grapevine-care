import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { CareState, PreparedAction } from "./schemas";

type RegisteredTool = WebMCPTool;

const baseState: CareState = {
  fictional: true,
  resident: { id: "rose-demo", display_name: "Rose", timezone: "America/New_York", simulated_time: "2026-08-31T08:14:00-04:00", scenario: "on_schedule", severity: "routine" },
  doses: [
    { id: "dose-am", resident_id: "rose-demo", label: "Morning dose", scheduled_time: "08:00", window_label: "7:30–9:00 AM", compartment: "M–AM", status: "ready", confirmed_at: null },
    { id: "dose-noon", resident_id: "rose-demo", label: "Midday dose", scheduled_time: "12:00", window_label: "11:30 AM–1:00 PM", compartment: "M–NOON", status: "upcoming", confirmed_at: null },
    { id: "dose-pm", resident_id: "rose-demo", label: "Evening dose", scheduled_time: "20:00", window_label: "7:30–9:00 PM", compartment: "M–PM", status: "upcoming", confirmed_at: null }
  ],
  devices: [
    { id: "device-pillbox", resident_id: "rose-demo", name: "Care Station GC-01", device_type: "medication_dispenser", status: "online", battery_percent: 86, firmware: "1.0.0-demo", capabilities: ["schedule.read", "compartment.release.local_only"], door_state: "closed", last_seen: "2026-08-31T08:14:00-04:00" }
  ],
  inventory: { resident_id: "rose-demo", units_remaining: 24, daily_cadence: 3, updated_at: "2026-08-31T08:14:00-04:00" },
  events: [{ id: "evt-1", resident_id: "rose-demo", event_type: "window_verified", severity: "routine", summary: "Morning window verified", detail: "All deterministic checks passed.", source: "Care Station GC-01", occurred_at: "2026-08-31T08:14:00-04:00" }],
  actions: [],
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
      if (body.scenario === "missed_window") state = { ...state, resident: { ...state.resident, scenario: "missed_window", severity: "attention" }, doses: state.doses.map((dose, index) => index === 0 ? { ...dose, status: "missed" } : dose), events: [{ ...state.events[0], id: "evt-missed", severity: "attention", summary: "Medication window elapsed" }, ...state.events] };
      return Response.json({ state });
    }
    if (url === "/api/care/actions") {
      const action: PreparedAction = { id: "action-1", resident_id: "rose-demo", channel: body.channel as PreparedAction["channel"], reason: String(body.reason), status: "awaiting_human_approval", idempotency_key: String(body.idempotency_key), created_at: state.resident.simulated_time, resolved_at: null };
      state = { ...state, actions: [action] };
      return Response.json({ action, approval_required: true, external_side_effect: false });
    }
    if (url.includes("/resolve")) { state = { ...state, actions: state.actions.map((action) => ({ ...action, status: "dismissed" })) }; return Response.json({ state, external_side_effect: false }); }
    if (url.includes("/confirm")) { state = { ...state, doses: state.doses.map((dose, index) => index === 0 ? { ...dose, status: "confirmed" } : dose), inventory: { ...state.inventory, units_remaining: 23 } }; return Response.json({ state }); }
    return Response.json({ error: "Not found" }, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => { vi.restoreAllMocks(); installFetch(); });

describe("Grapevine Care", () => {
  it("presents a large-touch resident flow and registers six bounded tools", async () => {
    const tools = installModelContext();
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Good morning, Rose." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hold to verify/i })).toBeEnabled();
    await waitFor(() => expect(tools.size).toBe(6));
    expect([...tools.keys()].sort()).toEqual(["get_care_evidence", "get_care_overview", "get_device_capabilities", "get_inventory_forecast", "get_medication_schedule", "prepare_caregiver_check_in"]);
  });

  it("shows explicit uncertainty after the missed-window scenario", async () => {
    render(<App />);
    await screen.findByText("Good morning, Rose.");
    fireEvent.click(screen.getByRole("button", { name: "Missed window" }));
    fireEvent.click(screen.getByRole("button", { name: "Caregiver" }));
    expect(await screen.findByRole("heading", { name: "Rose’s care routine needs attention" })).toBeInTheDocument();
    expect(screen.getByText(/ingestion and welfare remain unknown/i)).toBeInTheDocument();
  });

  it("stages agent outreach and stops at human review", async () => {
    const tools = installModelContext();
    render(<App />);
    await waitFor(() => expect(tools.size).toBe(6));
    await act(async () => { await tools.get("prepare_caregiver_check_in")!.execute({ resident_id: "rose-demo", channel: "call", reason: "The missed confirmation needs caregiver review.", idempotency_key: "test-action-001" }); });
    expect(await screen.findByRole("dialog", { name: "Review caregiver check-in" })).toBeInTheDocument();
    expect(screen.getByText("No one has been contacted")).toBeInTheDocument();
  });

  it("makes device capability boundaries visible", async () => {
    render(<App />);
    await screen.findByText("Good morning, Rose.");
    fireEvent.click(screen.getByRole("button", { name: "Devices & MCP" }));
    expect(screen.getByRole("heading", { name: "A safe control plane for connected care" })).toBeInTheDocument();
    expect(screen.getByText("compartment.release.local_only")).toBeInTheDocument();
    expect(screen.getByText("Release medication")).toBeInTheDocument();
  });
});
