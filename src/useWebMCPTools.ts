import { useEffect, useMemo, useState } from "react";
import {
  getCareEvidenceArgsSchema,
  getCareOverviewArgsSchema,
  getDeviceCapabilitiesArgsSchema,
  getInventoryForecastArgsSchema,
  getMedicationScheduleArgsSchema,
  parseArgs,
  prepareCaregiverCheckInArgsSchema,
  prepareResidentCheckInArgsSchema,
  requestDeviceHealthSnapshotArgsSchema,
  toolInputSchemas,
  type CareState
} from "./schemas";
import type { CareActions } from "./useCare";

const baseAnnotations = { readOnlyHint: false, untrustedContentHint: true };
export type WebMCPWorkspace = "resident" | "caregiver" | "system";
export type WebMCPToolsState = { supported: boolean; registered: boolean; error: Error | null; count: number; availableNames: string[]; };
type Registration = { supported: boolean; registered: boolean; error: Error | null; };

function useWebMCPTool(tool: WebMCPTool | null): Registration {
  const [state, setState] = useState<Registration>({ supported: false, registered: false, error: null });
  useEffect(() => {
    const modelContext = document.modelContext;
    if (!modelContext || !tool) { setState({ supported: Boolean(modelContext), registered: false, error: null }); return; }
    const controller = new AbortController();
    setState({ supported: true, registered: false, error: null });
    void modelContext.registerTool(tool, { signal: controller.signal })
      .then(() => { if (!controller.signal.aborted) setState({ supported: true, registered: true, error: null }); })
      .catch((caught: unknown) => { if (!controller.signal.aborted) setState({ supported: true, registered: false, error: caught instanceof Error ? caught : new Error("WebMCP tool registration failed.") }); });
    return () => controller.abort();
  }, [tool]);
  return state;
}

export function expectedToolNames(state: CareState | null, workspace: WebMCPWorkspace) {
  if (!state) return [];
  const names = ["get_care_overview", "get_medication_schedule", "get_care_evidence"];
  const residentCheckIn = state.resident_check_ins[0];
  const pendingAction = state.actions.some((action) => action.status === "awaiting_human_approval");
  const workflowLocked = residentCheckIn?.status === "awaiting_resident" || pendingAction;
  if (state.resident.scenario === "on_schedule" && !workflowLocked) names.push("get_inventory_forecast");
  if ((workspace === "system" || state.resident.scenario === "device_offline" || state.resident.scenario === "door_fault") && !workflowLocked) names.push("get_device_capabilities", "request_device_health_snapshot");
  if (state.resident.scenario === "missed_window" && !residentCheckIn && !pendingAction) names.push("prepare_resident_check_in");
  const residentResolved = residentCheckIn?.status === "responded";
  if (!pendingAction && !workflowLocked && (state.resident.scenario !== "missed_window" || residentResolved)) names.push("prepare_caregiver_check_in");
  return names;
}

export function useWebMCPTools(actions: CareActions, state: CareState | null, workspace: WebMCPWorkspace): WebMCPToolsState {
  const tools = useMemo(() => ({
    overview: {
      name: "get_care_overview", title: "Get care overview",
      description: "Read Rose's fictional care status, active medication window, device health, unresolved workflow state, plan provenance, and safety boundaries. This does not provide medical advice.",
      inputSchema: toolInputSchemas.getCareOverview, annotations: { ...baseAnnotations, readOnlyHint: true },
      async execute(args: unknown) {
        const { resident_id } = parseArgs(getCareOverviewArgsSchema, args); const current = await actions.getState();
        if (current.resident.id !== resident_id) throw new Error("Resident not found in this demo.");
        return { fictional: true, resident: current.resident, current_dose: current.doses.find((dose) => ["ready", "missed", "blocked"].includes(dose.status)) ?? null, devices: current.devices.map(({ id, device_type, status, last_seen }) => ({ id, device_type, status, last_seen })), resident_check_in: current.resident_check_ins[0] ?? null, unresolved_action: current.actions.find((action) => action.status === "awaiting_human_approval") ?? null, care_plan: current.care_plan, safety_contract: current.safety_contract };
      }
    } satisfies WebMCPTool,
    schedule: {
      name: "get_medication_schedule", title: "Get medication schedule",
      description: "Read fictional medication windows and confirmation states. Medication names and dosing instructions are excluded; this tool cannot change the plan or release a compartment.",
      inputSchema: toolInputSchemas.getMedicationSchedule, annotations: { ...baseAnnotations, readOnlyHint: true },
      async execute(args: unknown) {
        const { resident_id, horizon = "today" } = parseArgs(getMedicationScheduleArgsSchema, args); const current = await actions.getState();
        if (current.resident.id !== resident_id) throw new Error("Resident not found in this demo.");
        return { fictional: true, resident_id, horizon, schedule: current.doses, plan_version: current.care_plan.version, controller_policy: "Only the local device controller and resident confirmation can release the eligible compartment." };
      }
    } satisfies WebMCPTool,
    inventory: {
      name: "get_inventory_forecast", title: "Get inventory forecast",
      description: "Calculate a transparent reminder from simulated compartment count and plan cadence. This is not a prescription, refill order, or pharmacy request.",
      inputSchema: toolInputSchemas.getInventoryForecast, annotations: { ...baseAnnotations, readOnlyHint: true },
      async execute(args: unknown) {
        const { resident_id, threshold_days = 10 } = parseArgs(getInventoryForecastArgsSchema, args); const current = await actions.getState();
        if (current.resident.id !== resident_id) throw new Error("Resident not found in this demo.");
        const days = Math.floor(current.inventory.units_remaining / current.inventory.daily_cadence);
        return { fictional: true, units_remaining: current.inventory.units_remaining, daily_cadence: current.inventory.daily_cadence, estimated_days_remaining: days, threshold_days, below_threshold: days <= threshold_days, provenance: { actor_type: "device", actor_id: "device-pillbox", observed_at: current.inventory.updated_at, calculation: "floor(units_remaining / daily_cadence)" } };
      }
    } satisfies WebMCPTool,
    devices: {
      name: "get_device_capabilities", title: "Get device capabilities",
      description: "List devices registered through the care adapter, including status, least-privilege capabilities, plan version, diagnostic health, and last-seen time.",
      inputSchema: toolInputSchemas.getDeviceCapabilities, annotations: { ...baseAnnotations, readOnlyHint: true },
      async execute(args: unknown) {
        const { resident_id, device_type } = parseArgs(getDeviceCapabilitiesArgsSchema, args); const current = await actions.getState();
        if (current.resident.id !== resident_id) throw new Error("Resident not found in this demo.");
        return { fictional: true, adapter_contract: "grapevine.care.device.v1", devices: current.devices.filter((device) => !device_type || device.device_type === device_type), safety_rule: "No agent-facing capability can release medication, change a care plan, or return biometric data." };
      }
    } satisfies WebMCPTool,
    evidence: {
      name: "get_care_evidence", title: "Get current care evidence",
      description: "Create a current evidence snapshot and return a compact chain of custody: who contributed each record, when, evidence class, trust boundary, and unresolved uncertainty. Later preparation tools require this snapshot.",
      inputSchema: toolInputSchemas.getCareEvidence, annotations: { ...baseAnnotations, readOnlyHint: true },
      async execute(args: unknown) { return actions.getEvidenceSnapshot(parseArgs(getCareEvidenceArgsSchema, args)); }
    } satisfies WebMCPTool,
    residentCheckIn: {
      name: "prepare_resident_check_in", title: "Prepare resident check-in",
      description: "Place one bounded, non-clinical question on Rose's visible station. The agent cannot answer for Rose, contact her elsewhere, release medication, or interpret her response as clinical verification. Requires a current evidence snapshot.",
      inputSchema: toolInputSchemas.prepareResidentCheckIn, annotations: baseAnnotations,
      async execute(args: unknown) { return actions.prepareResidentCheckIn(parseArgs(prepareResidentCheckInArgsSchema, args)); }
    } satisfies WebMCPTool,
    prepare: {
      name: "prepare_caregiver_check_in", title: "Prepare caregiver check-in",
      description: "Stage a fictional caregiver call, visit, or message for visible human review. Nothing is sent. Requires a current evidence snapshot and, during a missed window, Rose's bounded response first.",
      inputSchema: toolInputSchemas.prepareCaregiverCheckIn, annotations: baseAnnotations,
      async execute(args: unknown) { return actions.prepareAction(parseArgs(prepareCaregiverCheckInArgsSchema, args)); }
    } satisfies WebMCPTool,
    deviceHealth: {
      name: "request_device_health_snapshot", title: "Request device health snapshot",
      description: "Request a fresh non-clinical diagnostic from a registered simulated device. Returns connectivity, sensor health, battery, firmware, door state, last seen, and applied plan version—never medication release or clinical readings.",
      inputSchema: toolInputSchemas.requestDeviceHealthSnapshot, annotations: baseAnnotations,
      async execute(args: unknown) { return actions.requestDeviceHealthSnapshot(parseArgs(requestDeviceHealthSnapshotArgsSchema, args)); }
    } satisfies WebMCPTool
  }), [actions]);

  const availableNames = expectedToolNames(state, workspace);
  const enabled = useMemo(() => new Set(availableNames), [availableNames.join("|")]);
  const registrations = [
    useWebMCPTool(enabled.has(tools.overview.name) ? tools.overview : null),
    useWebMCPTool(enabled.has(tools.schedule.name) ? tools.schedule : null),
    useWebMCPTool(enabled.has(tools.inventory.name) ? tools.inventory : null),
    useWebMCPTool(enabled.has(tools.devices.name) ? tools.devices : null),
    useWebMCPTool(enabled.has(tools.evidence.name) ? tools.evidence : null),
    useWebMCPTool(enabled.has(tools.residentCheckIn.name) ? tools.residentCheckIn : null),
    useWebMCPTool(enabled.has(tools.prepare.name) ? tools.prepare : null),
    useWebMCPTool(enabled.has(tools.deviceHealth.name) ? tools.deviceHealth : null)
  ];
  const activeRegistrations = registrations.filter((_, index) => enabled.has([tools.overview, tools.schedule, tools.inventory, tools.devices, tools.evidence, tools.residentCheckIn, tools.prepare, tools.deviceHealth][index].name));
  return { supported: registrations.some((item) => item.supported), registered: activeRegistrations.length > 0 && activeRegistrations.every((item) => item.registered), error: activeRegistrations.find((item) => item.error)?.error ?? null, count: activeRegistrations.filter((item) => item.registered).length, availableNames };
}
