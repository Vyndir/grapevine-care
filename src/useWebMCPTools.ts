import { useEffect, useMemo, useState } from "react";
import {
  getCareEvidenceArgsSchema,
  getCareTeamOverviewArgsSchema,
  getCareStoryArgsSchema,
  getCareOverviewArgsSchema,
  getResidentContextArgsSchema,
  getDeviceCapabilitiesArgsSchema,
  getInventoryForecastArgsSchema,
  getMedicationScheduleArgsSchema,
  getShiftContextArgsSchema,
  getCoverageCandidatesArgsSchema,
  prepareShiftCoverageArgsSchema,
  getChangesSinceLastShiftArgsSchema,
  getShiftBriefArgsSchema,
  prepareShiftHandoffArgsSchema,
  prepareAssignmentOrientationArgsSchema,
  parseArgs,
  prepareCaregiverCheckInArgsSchema,
  prepareCareTeamReviewArgsSchema,
  prepareResidentCheckInArgsSchema,
  prepareTeamInquiryArgsSchema,
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
  if (state.resident.scenario === "care_team_day") {
    if (workspace === "resident") return ["get_care_overview", "get_medication_schedule", "get_resident_context"];
    const names = ["get_care_team_overview", "get_resident_context", "get_shift_context"];
    const evelynInquiry = state.care_team_day?.inquiries.find((inquiry) => inquiry.resident_id === "evelyn-demo" && inquiry.inquiry_type === "visit_verification");
    if ((state.care_team_day?.step ?? 0) === 0 && !evelynInquiry) names.push("prepare_team_inquiry");
    const walterPacket = state.care_team_day?.orientation_packets.find((packet) => packet.resident_id === "walter-demo");
    if ((state.care_team_day?.step ?? 0) >= 1 && !walterPacket) names.push("prepare_assignment_orientation");
    const roseShift = state.shifts.find((item) => item.id === "shift-wed-pm");
    if (roseShift?.coverage_status === "coverage_needed") names.push("get_coverage_candidates", "prepare_shift_coverage");
    if (roseShift?.assigned_caregiver_id && roseShift.assigned_caregiver_id !== "caregiver-maya" && roseShift.visit_status !== "completed") names.push("get_changes_since_last_shift", "get_shift_brief");
    if (roseShift?.visit_status === "completed" && roseShift.handoff_status === "ready") names.push("prepare_shift_handoff");
    return names;
  }
  if (state.resident.scenario === "coverage_callout") {
    if (workspace === "resident") return ["get_care_overview", "get_medication_schedule", "get_resident_context"];
    const shift = state.shifts.find((item) => Boolean(item.disruption_reason)) ?? state.shifts[0];
    if (!shift) return [];
    const names = ["get_resident_context", "get_care_story", "get_care_evidence", "get_shift_context"];
    if (shift.coverage_status === "coverage_needed") names.push("get_coverage_candidates", "prepare_shift_coverage");
    if (shift.assigned_caregiver_id && shift.visit_status !== "completed") names.push("get_changes_since_last_shift", "get_shift_brief");
    if (shift.visit_status === "completed" && shift.handoff_status === "ready") names.push("prepare_shift_handoff");
    return names;
  }
  const names = ["get_care_overview", "get_medication_schedule", "get_care_evidence"];
  const residentCheckIn = state.resident_check_ins[0];
  const pendingAction = state.actions.some((action) => action.status === "awaiting_human_approval");
  const pendingHandoff = state.handoffs.some((handoff) => handoff.status === "awaiting_human_approval");
  const workflowLocked = residentCheckIn?.status === "awaiting_resident" || pendingAction || pendingHandoff;
  names.push("get_resident_context", "get_care_story");
  if (state.resident.scenario === "on_schedule" && !workflowLocked) names.push("get_inventory_forecast");
  if ((workspace === "system" || state.resident.scenario === "device_offline" || state.resident.scenario === "door_fault") && !workflowLocked) names.push("get_device_capabilities", "request_device_health_snapshot");
  if (state.resident.scenario === "missed_window" && !residentCheckIn && !pendingAction) names.push("prepare_resident_check_in");
  const residentResolved = residentCheckIn?.status === "responded";
  if (!pendingAction && !pendingHandoff && !workflowLocked && state.resident.scenario !== "care_story" && (state.resident.scenario !== "missed_window" || residentResolved)) names.push("prepare_caregiver_check_in");
  if (state.resident.scenario === "care_story" && !workflowLocked) names.push("prepare_care_team_review");
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
    context: {
      name: "get_resident_context", title: "Get authorized resident context",
      description: "Read care-team-supplied context for Rose, Walter, or Evelyn. Pass a natural resident_ref or an ID returned by the team overview. If omitted outside the single-resident view, the tool fails rather than guessing.",
      inputSchema: toolInputSchemas.getResidentContext, annotations: { ...baseAnnotations, readOnlyHint: true },
      async execute(args: unknown) {
        const { resident_id, resident_ref } = parseArgs(getResidentContextArgsSchema, args); const current = await actions.getState();
        const reference = (resident_ref ?? resident_id)?.trim().toLowerCase();
        if (!reference && current.resident.scenario === "care_team_day") throw new Error("Specify Rose, Walter, or Evelyn; the care-team view is ambiguous.");
        const teamResident = current.care_team_day?.residents.find((resident) => resident.id.toLowerCase() === reference || resident.display_name.toLowerCase() === reference);
        if (teamResident && teamResident.id !== current.resident.id) return { fictional: true, resident: teamResident, source: `${teamResident.display_name} Care Plan ${teamResident.care_plan_version} · fictional care-team record`, interpretation_boundary: "This is care-team-supplied coordination context, not a diagnosis or treatment instruction." };
        if (reference && current.resident.id.toLowerCase() !== reference && current.resident.display_name.toLowerCase() !== reference) throw new Error("Resident not found in this demo.");
        return { fictional: true, profile: current.profile, monitoring_plan: current.monitoring_plan, care_plan: current.care_plan, interpretation_boundary: "The care team defines what to monitor. The agent may compare evidence with those instructions but cannot invent clinical significance." };
      }
    } satisfies WebMCPTool,
    story: {
      name: "get_care_story", title: "Get longitudinal care story",
      description: "Summarize Rose’s last 24 or 72 hours relative to her documented baseline and signed monitoring plan. Returns counts, comparisons, provenance, and unresolved questions without diagnosing causes.",
      inputSchema: toolInputSchemas.getCareStory, annotations: { ...baseAnnotations, readOnlyHint: true },
      async execute(args: unknown) {
        const { resident_id, horizon = "72_hours" } = parseArgs(getCareStoryArgsSchema, args); const current = await actions.getState();
        if (current.resident.id !== resident_id) throw new Error("Resident not found in this demo.");
        const requestedHours = horizon === "24_hours" ? 24 : 72;
        const startsAt = new Date(Date.parse(current.resident.simulated_time) - requestedHours * 60 * 60 * 1000).toISOString();
        const recentEvents = current.events.filter((event) => Date.parse(event.observed_at) >= Date.parse(startsAt));
        const story = requestedHours === current.care_story.horizon_hours ? current.care_story : {
          ...current.care_story,
          horizon_hours: requestedHours,
          starts_at: startsAt,
          routine_confirmations: recentEvents.filter((event) => event.event_type === "dose_confirmed").length,
          unconfirmed_windows: recentEvents.filter((event) => event.event_type === "medication_window_unconfirmed" || event.event_type === "scenario_missed_window").length,
          resident_check_ins: recentEvents.filter((event) => event.event_type === "resident_self_report").length,
          routine_activity_signals: recentEvents.filter((event) => event.event_type === "routine_activity").length,
          device_interruptions: recentEvents.filter((event) => event.event_type === "scenario_device_offline" || event.event_type === "device_offline").length,
          summary: "This 24-hour slice contains the latest care-plan signals only. Use the 72-hour view to evaluate the repeated-pattern threshold."
        };
        return { fictional: true, requested_horizon_hours: requestedHours, story, recent_evidence: recentEvents.map(({ id, event_type, severity, summary, detail, actor_type, evidence_type, observed_at, trust_boundary, plan_version }) => ({ id, event_type, severity, summary, detail, actor_type, evidence_type, observed_at, trust_boundary, plan_version })), boundary: "Baseline differences are care-coordination signals, not diagnoses or proof of medication ingestion." };
      }
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
    } satisfies WebMCPTool,
    careTeamReview: {
      name: "prepare_care_team_review", title: "Prepare care-team review",
      description: "Stage a snapshot-bound 24/72-hour nurse review when Rose’s signed monitoring criteria are met. Operational shift handoffs use the assignment-bound prepare_shift_handoff tool. Nothing is transmitted until a caregiver approves the visible draft.",
      inputSchema: toolInputSchemas.prepareCareTeamReview, annotations: baseAnnotations,
      async execute(args: unknown) { return actions.prepareCareTeamReview(parseArgs(prepareCareTeamReviewArgsSchema, args)); }
    } satisfies WebMCPTool,
    shiftContext: {
      name: "get_shift_context", title: "Get shift context",
      description: "Read a caregiver shift and create a version-bound schedule snapshot. Use resident_ref for natural questions about Rose, Walter, or Evelyn; omit both fields only when exactly one disrupted shift is active.",
      inputSchema: toolInputSchemas.getShiftContext, annotations: { ...baseAnnotations, readOnlyHint: true },
      async execute(args: unknown) { return actions.getShiftContext(parseArgs(getShiftContextArgsSchema, args)); }
    } satisfies WebMCPTool,
    careTeamOverview: {
      name: "get_care_team_overview", title: "Get care-team day overview",
      description: "Read the current time block, its single focused decision, completed history, known facts, unknowns, human owners, and the explicit gate blocking simulated-time advancement. This is operational coordination, not medical prioritization.",
      inputSchema: toolInputSchemas.getCareTeamOverview, annotations: { ...baseAnnotations, readOnlyHint: true },
      async execute(args: unknown) { parseArgs(getCareTeamOverviewArgsSchema, args); return actions.getCareTeamOverview(); }
    } satisfies WebMCPTool,
    teamInquiry: {
      name: "prepare_team_inquiry", title: "Prepare caregiver status inquiry",
      description: "Stage a bounded check-in to Evelyn's assigned caregiver, Luis, to investigate missing visit-verification evidence. It does not claim he is absent and sends nothing until the coordinator approves the visible draft.",
      inputSchema: toolInputSchemas.prepareTeamInquiry, annotations: baseAnnotations,
      async execute(args: unknown) { return actions.prepareTeamInquiry(parseArgs(prepareTeamInquiryArgsSchema, args)); }
    } satisfies WebMCPTool,
    assignmentOrientation: {
      name: "prepare_assignment_orientation", title: "Prepare assignment orientation",
      description: "Prepare Walter's resident-specific orientation packet and a readiness follow-up for Elena. The agent cannot send the follow-up, submit Elena's acknowledgement, verify receipt, or clear the visit; those transitions remain visible coordinator and caregiver evidence.",
      inputSchema: toolInputSchemas.prepareAssignmentOrientation, annotations: baseAnnotations,
      async execute(args: unknown) { return actions.prepareAssignmentOrientation(parseArgs(prepareAssignmentOrientationArgsSchema, args)); }
    } satisfies WebMCPTool,
    coverageCandidates: {
      name: "get_coverage_candidates", title: "Get coverage candidates",
      description: "Answer natural coverage questions such as who can cover, why someone is excluded, who knows the resident, or what tradeoffs remain. Omit shift_id to resolve the single active uncovered shift; ambiguous contexts request clarification. Uses explicit availability, qualification, training, resident orientation, care-plan acknowledgement, conflicts, travel, and weekly-hour rules. Returns no opaque score and never changes the schedule.",
      inputSchema: toolInputSchemas.getCoverageCandidates, annotations: { ...baseAnnotations, readOnlyHint: true },
      async execute(args: unknown) { return actions.getCoverageCandidates(parseArgs(getCoverageCandidatesArgsSchema, args)); }
    } satisfies WebMCPTool,
    prepareCoverage: {
      name: "prepare_shift_coverage", title: "Prepare shift coverage",
      description: "Stage one eligible caregiver as the constraint-explained coverage recommendation against a current schedule snapshot. A scheduler must approve before the assignment changes.",
      inputSchema: toolInputSchemas.prepareShiftCoverage, annotations: baseAnnotations,
      async execute(args: unknown) { return actions.prepareShiftCoverage(parseArgs(prepareShiftCoverageArgsSchema, args)); }
    } satisfies WebMCPTool,
    changesSinceLastShift: {
      name: "get_changes_since_last_shift", title: "Get changes since last shift",
      description: "Catch the assigned caregiver up on meaningful, source-bounded changes since they last cared for Rose, while naming what has not changed and avoiding clinical inference.",
      inputSchema: toolInputSchemas.getChangesSinceLastShift, annotations: { ...baseAnnotations, readOnlyHint: true },
      async execute(args: unknown) { return actions.getChangesSinceLastShift(parseArgs(getChangesSinceLastShiftArgsSchema, args)); }
    } satisfies WebMCPTool,
    shiftBrief: {
      name: "get_shift_brief", title: "Get shift brief",
      description: "Brief the currently assigned caregiver on Rose, what matters today, what changed, unresolved items, care-plan provenance, and whom to contact. It cannot assign, diagnose, or change care instructions.",
      inputSchema: toolInputSchemas.getShiftBrief, annotations: { ...baseAnnotations, readOnlyHint: true },
      async execute(args: unknown) { return actions.getShiftBrief(parseArgs(getShiftBriefArgsSchema, args)); }
    } satisfies WebMCPTool,
    shiftHandoff: {
      name: "prepare_shift_handoff", title: "Prepare shift handoff",
      description: "Stage an assignment-bound handoff from completed visit evidence for the next caregiver. The outgoing caregiver must approve it before the recipient can see and acknowledge it.",
      inputSchema: toolInputSchemas.prepareShiftHandoff, annotations: baseAnnotations,
      async execute(args: unknown) { return actions.prepareShiftHandoff(parseArgs(prepareShiftHandoffArgsSchema, args)); }
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
    useWebMCPTool(enabled.has(tools.context.name) ? tools.context : null),
    useWebMCPTool(enabled.has(tools.story.name) ? tools.story : null),
    useWebMCPTool(enabled.has(tools.residentCheckIn.name) ? tools.residentCheckIn : null),
    useWebMCPTool(enabled.has(tools.prepare.name) ? tools.prepare : null),
    useWebMCPTool(enabled.has(tools.deviceHealth.name) ? tools.deviceHealth : null),
    useWebMCPTool(enabled.has(tools.careTeamReview.name) ? tools.careTeamReview : null),
    useWebMCPTool(enabled.has(tools.shiftContext.name) ? tools.shiftContext : null),
    useWebMCPTool(enabled.has(tools.coverageCandidates.name) ? tools.coverageCandidates : null),
    useWebMCPTool(enabled.has(tools.prepareCoverage.name) ? tools.prepareCoverage : null),
    useWebMCPTool(enabled.has(tools.changesSinceLastShift.name) ? tools.changesSinceLastShift : null),
    useWebMCPTool(enabled.has(tools.shiftBrief.name) ? tools.shiftBrief : null),
    useWebMCPTool(enabled.has(tools.shiftHandoff.name) ? tools.shiftHandoff : null),
    useWebMCPTool(enabled.has(tools.careTeamOverview.name) ? tools.careTeamOverview : null),
    useWebMCPTool(enabled.has(tools.teamInquiry.name) ? tools.teamInquiry : null),
    useWebMCPTool(enabled.has(tools.assignmentOrientation.name) ? tools.assignmentOrientation : null)
  ];
  const orderedTools = [tools.overview, tools.schedule, tools.inventory, tools.devices, tools.evidence, tools.context, tools.story, tools.residentCheckIn, tools.prepare, tools.deviceHealth, tools.careTeamReview, tools.shiftContext, tools.coverageCandidates, tools.prepareCoverage, tools.changesSinceLastShift, tools.shiftBrief, tools.shiftHandoff, tools.careTeamOverview, tools.teamInquiry, tools.assignmentOrientation];
  const activeRegistrations = registrations.filter((_, index) => enabled.has(orderedTools[index].name));
  return { supported: registrations.some((item) => item.supported), registered: activeRegistrations.length > 0 && activeRegistrations.every((item) => item.registered), error: activeRegistrations.find((item) => item.error)?.error ?? null, count: activeRegistrations.filter((item) => item.registered).length, availableNames };
}
