import { useEffect, useMemo, useState } from "react";
import {
  getCareEvidenceArgsSchema,
  getCareOverviewArgsSchema,
  getDeviceCapabilitiesArgsSchema,
  getInventoryForecastArgsSchema,
  getMedicationScheduleArgsSchema,
  parseArgs,
  prepareCaregiverCheckInArgsSchema,
  toolInputSchemas
} from "./schemas";
import type { CareActions } from "./useCare";

const baseAnnotations = { readOnlyHint: false, untrustedContentHint: true };
export type WebMCPToolsState = { supported: boolean; registered: boolean; error: Error | null; count: number; };
type Registration = { supported: boolean; registered: boolean; error: Error | null; };

function useWebMCPTool(tool: WebMCPTool): Registration {
  const [state, setState] = useState<Registration>({ supported: false, registered: false, error: null });
  useEffect(() => {
    const modelContext = document.modelContext;
    if (!modelContext) { setState({ supported: false, registered: false, error: null }); return; }
    const controller = new AbortController();
    setState({ supported: true, registered: false, error: null });
    void modelContext.registerTool(tool, { signal: controller.signal })
      .then(() => { if (!controller.signal.aborted) setState({ supported: true, registered: true, error: null }); })
      .catch((caught: unknown) => { if (!controller.signal.aborted) setState({ supported: true, registered: false, error: caught instanceof Error ? caught : new Error("WebMCP tool registration failed.") }); });
    return () => controller.abort();
  }, [tool]);
  return state;
}

export function useWebMCPTools(actions: CareActions): WebMCPToolsState {
  const tools = useMemo(() => ({
    overview: {
      name: "get_care_overview",
      title: "Get care overview",
      description: "Read Rose's fictional care status, current medication window, connected-device health, unresolved attention signals, and safety boundaries. This does not provide medical advice.",
      inputSchema: toolInputSchemas.getCareOverview,
      annotations: { ...baseAnnotations, readOnlyHint: true },
      async execute(args: unknown) {
        const { resident_id } = parseArgs(getCareOverviewArgsSchema, args);
        const state = await actions.getState();
        if (state.resident.id !== resident_id) throw new Error("Resident not found in this demo.");
        return { fictional: true, resident: state.resident, current_dose: state.doses.find((dose) => ["ready", "missed", "blocked"].includes(dose.status)) ?? null, device_summary: state.devices.map(({ id, name, device_type, status, last_seen }) => ({ id, name, device_type, status, last_seen })), unresolved_action: state.actions.find((action) => action.status === "awaiting_human_approval") ?? null, safety_contract: state.safety_contract };
      }
    } satisfies WebMCPTool,
    schedule: {
      name: "get_medication_schedule",
      title: "Get medication schedule",
      description: "Read the fictional resident's scheduled medication windows and confirmation states. Medication names and dosing instructions are intentionally excluded; the tool cannot change the plan or release a compartment.",
      inputSchema: toolInputSchemas.getMedicationSchedule,
      annotations: { ...baseAnnotations, readOnlyHint: true },
      async execute(args: unknown) {
        const { resident_id, horizon = "today" } = parseArgs(getMedicationScheduleArgsSchema, args);
        const state = await actions.getState();
        if (state.resident.id !== resident_id) throw new Error("Resident not found in this demo.");
        return { fictional: true, resident_id, horizon, schedule: state.doses, controller_policy: "Only the deterministic device controller and local resident confirmation can release the currently eligible compartment." };
      }
    } satisfies WebMCPTool,
    inventory: {
      name: "get_inventory_forecast",
      title: "Get inventory forecast",
      description: "Calculate a transparent inventory reminder from simulated compartment count and plan cadence. This is not a prescription, refill order, or pharmacy request.",
      inputSchema: toolInputSchemas.getInventoryForecast,
      annotations: { ...baseAnnotations, readOnlyHint: true },
      async execute(args: unknown) {
        const { resident_id, threshold_days = 10 } = parseArgs(getInventoryForecastArgsSchema, args);
        const state = await actions.getState();
        if (state.resident.id !== resident_id) throw new Error("Resident not found in this demo.");
        const days = Math.floor(state.inventory.units_remaining / state.inventory.daily_cadence);
        return { fictional: true, units_remaining: state.inventory.units_remaining, daily_cadence: state.inventory.daily_cadence, estimated_days_remaining: days, threshold_days, below_threshold: days <= threshold_days, recommendation: days <= threshold_days ? "A caregiver may want to review refill timing. No order or prescription action has been taken." : "Supply is above the selected reminder threshold.", provenance: { source: "Care Station GC-01 · simulated compartment sensor", observed_at: state.inventory.updated_at, calculation: "floor(units_remaining / daily_cadence)" } };
      }
    } satisfies WebMCPTool,
    devices: {
      name: "get_device_capabilities",
      title: "Get device capabilities",
      description: "List the fictional care devices registered through Grapevine Care's capability adapter, including status, scoped capabilities, provenance, and last-seen time.",
      inputSchema: toolInputSchemas.getDeviceCapabilities,
      annotations: { ...baseAnnotations, readOnlyHint: true },
      async execute(args: unknown) {
        const { resident_id, device_type } = parseArgs(getDeviceCapabilitiesArgsSchema, args);
        const state = await actions.getState();
        if (state.resident.id !== resident_id) throw new Error("Resident not found in this demo.");
        return { fictional: true, adapter_contract: "grapevine.care.device.v1", devices: state.devices.filter((device) => !device_type || device.device_type === device_type), safety_rule: "Capabilities are least-privilege. No agent-facing capability can release medication or return biometric data." };
      }
    } satisfies WebMCPTool,
    evidence: {
      name: "get_care_evidence",
      title: "Get care evidence",
      description: "Read a bounded, provenance-rich timeline of fictional device, resident, and caregiver events so the agent can explain what is known, what is stale, and what remains uncertain.",
      inputSchema: toolInputSchemas.getCareEvidence,
      annotations: { ...baseAnnotations, readOnlyHint: true },
      async execute(args: unknown) {
        const { resident_id, event_limit = 8 } = parseArgs(getCareEvidenceArgsSchema, args);
        const state = await actions.getState();
        if (state.resident.id !== resident_id) throw new Error("Resident not found in this demo.");
        return { fictional: true, observed_at: state.resident.simulated_time, events: state.events.slice(0, event_limit), uncertainty: state.resident.scenario === "device_offline" ? "Device telemetry is stale; current resident status is unknown." : state.resident.scenario === "missed_window" ? "A missed removal confirmation does not prove a missed ingestion or a welfare emergency." : "No unresolved evidence gap in the selected demo scenario." };
      }
    } satisfies WebMCPTool,
    prepare: {
      name: "prepare_caregiver_check_in",
      title: "Prepare caregiver check-in",
      description: "Stage a fictional caregiver call, visit, or message for visible human review. This tool never contacts anyone, dispatches help, or represents approval. Use only after reading current evidence.",
      inputSchema: toolInputSchemas.prepareCaregiverCheckIn,
      annotations: baseAnnotations,
      async execute(args: unknown) {
        const input = parseArgs(prepareCaregiverCheckInArgsSchema, args);
        return actions.prepareAction(input);
      }
    } satisfies WebMCPTool
  }), [actions]);

  const registrations = [useWebMCPTool(tools.overview), useWebMCPTool(tools.schedule), useWebMCPTool(tools.inventory), useWebMCPTool(tools.devices), useWebMCPTool(tools.evidence), useWebMCPTool(tools.prepare)];
  return { supported: registrations.some((item) => item.supported), registered: registrations.length > 0 && registrations.every((item) => item.registered), error: registrations.find((item) => item.error)?.error ?? null, count: registrations.filter((item) => item.registered).length };
}
