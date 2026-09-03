import * as z from "zod/mini";

z.config(z.locales.en());

export const residentIdSchema = z.string().check(z.trim(), z.minLength(1), z.maxLength(64));
export const residentRefSchema = z.string().check(z.trim(), z.minLength(2), z.maxLength(64), z.describe("Resident name or identifier returned by a prior tool, such as Rose, Walter, Evelyn, or rose-demo."));
export const scenarioSchema = z.enum(["on_schedule", "missed_window", "care_story", "coverage_callout", "care_team_day", "door_fault", "device_offline"]);
export const shiftIdSchema = z.string().check(z.trim(), z.minLength(3), z.maxLength(64));
export const caregiverIdSchema = z.string().check(z.trim(), z.minLength(3), z.maxLength(64));

export const getCareOverviewArgsSchema = z.object({
  resident_id: residentIdSchema.check(z.describe("Resident identifier shown by the care workspace. Use rose-demo for this fictional demo."))
});
export const getMedicationScheduleArgsSchema = z.object({
  resident_id: residentIdSchema,
  horizon: z.optional(z.enum(["today", "48_hours"]).check(z.describe("Schedule horizon. Defaults to today.")))
});
export const getInventoryForecastArgsSchema = z.object({
  resident_id: residentIdSchema,
  threshold_days: z.optional(z.number().check(z.minimum(1), z.maximum(30), z.describe("Caregiver reminder threshold in days, from 1 through 30. Defaults to 10.")))
});
export const getDeviceCapabilitiesArgsSchema = z.object({
  resident_id: residentIdSchema,
  device_type: z.optional(z.enum(["medication_dispenser", "fall_sensor", "blood_pressure_cuff"]).check(z.describe("Optional device category to filter. Omit to return every registered device.")))
});
export const getCareEvidenceArgsSchema = z.object({
  resident_id: residentIdSchema,
  event_limit: z.optional(z.number().check(z.minimum(1), z.maximum(8), z.describe("Maximum compact evidence records to return. Defaults to 5.")))
});
export const prepareResidentCheckInArgsSchema = z.object({
  resident_id: residentIdSchema,
  prompt: z.string().check(z.trim(), z.minLength(8), z.maxLength(180), z.describe("Short, non-clinical check-in shown on Rose's station.")),
  evidence_snapshot_id: z.string().check(z.trim(), z.minLength(12), z.maxLength(96), z.describe("Current snapshot returned by get_care_evidence.")),
  idempotency_key: z.string().check(z.trim(), z.minLength(8), z.maxLength(80), z.describe("Unique key preventing duplicate resident cards."))
});
export const prepareCaregiverCheckInArgsSchema = z.object({
  resident_id: residentIdSchema,
  channel: z.enum(["call", "visit", "message"]).check(z.describe("Proposed caregiver check-in channel. This is staged only and is never sent automatically.")),
  reason: z.string().check(z.trim(), z.minLength(8), z.maxLength(240), z.describe("Concise evidence-based reason for a caregiver to review.")),
  evidence_snapshot_id: z.string().check(z.trim(), z.minLength(12), z.maxLength(96), z.describe("Current snapshot returned by get_care_evidence.")),
  idempotency_key: z.string().check(z.trim(), z.minLength(8), z.maxLength(80), z.describe("Unique caller-generated key that prevents duplicate staged actions."))
});
export const requestDeviceHealthSnapshotArgsSchema = z.object({
  resident_id: residentIdSchema,
  device_id: z.string().check(z.trim(), z.minLength(3), z.maxLength(64), z.describe("Registered device identifier.")),
  idempotency_key: z.string().check(z.trim(), z.minLength(8), z.maxLength(80), z.describe("Unique key preventing duplicate diagnostic records."))
});
export const getResidentContextArgsSchema = z.object({
  resident_id: z.optional(residentIdSchema),
  resident_ref: z.optional(residentRefSchema)
});
export const getCareStoryArgsSchema = z.object({
  resident_id: residentIdSchema,
  horizon: z.optional(z.enum(["24_hours", "72_hours"]).check(z.describe("Longitudinal care-story horizon. Defaults to 72 hours.")))
});
export const prepareCareTeamReviewArgsSchema = z.object({
  resident_id: residentIdSchema,
  review_type: z.literal("nurse_review").check(z.describe("A contextual nurse-review surface. Operational caregiver handoffs use prepare_shift_handoff.")),
  period_hours: z.union([z.literal(24), z.literal(72)]).check(z.describe("Evidence period summarized in the prepared handoff.")),
  reason: z.string().check(z.trim(), z.minLength(12), z.maxLength(320), z.describe("Evidence-based reason tied to the authorized monitoring plan. Do not diagnose.")),
  evidence_snapshot_id: z.string().check(z.trim(), z.minLength(12), z.maxLength(96), z.describe("Current snapshot returned by get_care_evidence.")),
  idempotency_key: z.string().check(z.trim(), z.minLength(8), z.maxLength(80), z.describe("Unique key preventing duplicate handoffs."))
});
export const getShiftContextArgsSchema = z.object({
  shift_id: z.optional(shiftIdSchema.check(z.describe("Optional shift identifier returned by a prior tool."))),
  resident_ref: z.optional(residentRefSchema.check(z.describe("Optional resident name or ID. Use this when more than one shift is relevant; never guess when the resident is ambiguous.")))
});
export const getCareTeamOverviewArgsSchema = z.object({});
export const prepareAssignmentOrientationArgsSchema = z.object({
  resident_ref: residentRefSchema,
  caregiver_id: caregiverIdSchema,
  reason: z.string().check(z.trim(), z.minLength(12), z.maxLength(320), z.describe("Operational reason for preparing the resident-specific orientation packet. Do not claim the caregiver completed it.")),
  idempotency_key: z.string().check(z.trim(), z.minLength(8), z.maxLength(80))
});
export const prepareTeamInquiryArgsSchema = z.object({
  resident_ref: residentRefSchema,
  caregiver_id: caregiverIdSchema,
  prompt: z.string().check(z.trim(), z.minLength(12), z.maxLength(240), z.describe("A bounded operational question for the assigned caregiver. Do not assume absence or make a clinical inference.")),
  idempotency_key: z.string().check(z.trim(), z.minLength(8), z.maxLength(80))
});
export const getCoverageCandidatesArgsSchema = z.object({ shift_id: shiftIdSchema });
export const prepareShiftCoverageArgsSchema = z.object({
  shift_id: shiftIdSchema,
  caregiver_id: caregiverIdSchema,
  schedule_snapshot_id: z.string().check(z.trim(), z.minLength(12), z.maxLength(96), z.describe("Current schedule snapshot returned by get_shift_context.")),
  reason: z.string().check(z.trim(), z.minLength(12), z.maxLength(360), z.describe("Constraint-based explanation for the staged coverage choice. Do not use a black-box score.")),
  idempotency_key: z.string().check(z.trim(), z.minLength(8), z.maxLength(80))
});
export const getChangesSinceLastShiftArgsSchema = z.object({ caregiver_id: caregiverIdSchema, resident_id: residentIdSchema });
export const getShiftBriefArgsSchema = z.object({ shift_id: shiftIdSchema, caregiver_id: caregiverIdSchema });
export const prepareShiftHandoffArgsSchema = z.object({
  shift_id: shiftIdSchema,
  to_caregiver_id: caregiverIdSchema,
  schedule_snapshot_id: z.string().check(z.trim(), z.minLength(12), z.maxLength(96)),
  reason: z.string().check(z.trim(), z.minLength(12), z.maxLength(320), z.describe("Continuity reason grounded in completed visit events and unresolved items.")),
  idempotency_key: z.string().check(z.trim(), z.minLength(8), z.maxLength(80))
});

export const toolInputSchemas = {
  getCareOverview: z.toJSONSchema(getCareOverviewArgsSchema, { target: "draft-07", io: "input" }),
  getMedicationSchedule: z.toJSONSchema(getMedicationScheduleArgsSchema, { target: "draft-07", io: "input" }),
  getInventoryForecast: z.toJSONSchema(getInventoryForecastArgsSchema, { target: "draft-07", io: "input" }),
  getDeviceCapabilities: z.toJSONSchema(getDeviceCapabilitiesArgsSchema, { target: "draft-07", io: "input" }),
  getCareEvidence: z.toJSONSchema(getCareEvidenceArgsSchema, { target: "draft-07", io: "input" }),
  prepareResidentCheckIn: z.toJSONSchema(prepareResidentCheckInArgsSchema, { target: "draft-07", io: "input" }),
  prepareCaregiverCheckIn: z.toJSONSchema(prepareCaregiverCheckInArgsSchema, { target: "draft-07", io: "input" }),
  requestDeviceHealthSnapshot: z.toJSONSchema(requestDeviceHealthSnapshotArgsSchema, { target: "draft-07", io: "input" }),
  getResidentContext: z.toJSONSchema(getResidentContextArgsSchema, { target: "draft-07", io: "input" }),
  getCareStory: z.toJSONSchema(getCareStoryArgsSchema, { target: "draft-07", io: "input" }),
  prepareCareTeamReview: z.toJSONSchema(prepareCareTeamReviewArgsSchema, { target: "draft-07", io: "input" }),
  getShiftContext: z.toJSONSchema(getShiftContextArgsSchema, { target: "draft-07", io: "input" }),
  getCareTeamOverview: z.toJSONSchema(getCareTeamOverviewArgsSchema, { target: "draft-07", io: "input" }),
  prepareAssignmentOrientation: z.toJSONSchema(prepareAssignmentOrientationArgsSchema, { target: "draft-07", io: "input" }),
  prepareTeamInquiry: z.toJSONSchema(prepareTeamInquiryArgsSchema, { target: "draft-07", io: "input" }),
  getCoverageCandidates: z.toJSONSchema(getCoverageCandidatesArgsSchema, { target: "draft-07", io: "input" }),
  prepareShiftCoverage: z.toJSONSchema(prepareShiftCoverageArgsSchema, { target: "draft-07", io: "input" }),
  getChangesSinceLastShift: z.toJSONSchema(getChangesSinceLastShiftArgsSchema, { target: "draft-07", io: "input" }),
  getShiftBrief: z.toJSONSchema(getShiftBriefArgsSchema, { target: "draft-07", io: "input" }),
  prepareShiftHandoff: z.toJSONSchema(prepareShiftHandoffArgsSchema, { target: "draft-07", io: "input" })
} as const;

export function parseArgs<Schema extends z.ZodMiniType>(schema: Schema, input: unknown): z.output<Schema> {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error(z.prettifyError(result.error));
  return result.data;
}

export type Scenario = z.output<typeof scenarioSchema>;
export type DoseStatus = "ready" | "upcoming" | "confirmed" | "missed" | "blocked";
export type CareSeverity = "routine" | "attention" | "urgent";
export type Resident = { id: string; display_name: string; timezone: string; simulated_time: string; scenario: Scenario; severity: CareSeverity; };
export type ResidentProfile = { resident_id: string; age: number; living_arrangement: string; support_schedule: string; relevant_history: string[]; baseline: string[]; preferences: string[]; source: string; updated_at: string; };
export type MonitoringRule = { id: string; resident_id: string; category: string; title: string; instruction: string; threshold_description: string; authorized_by: string; plan_version: string; };
export type Dose = { id: string; resident_id: string; label: string; scheduled_time: string; window_label: string; compartment: string; status: DoseStatus; confirmed_at: string | null; };
export type CareDevice = { id: string; resident_id: string; name: string; device_type: "medication_dispenser" | "fall_sensor" | "blood_pressure_cuff"; status: "online" | "offline" | "attention"; battery_percent: number; firmware: string; capabilities: string[]; door_state: "closed" | "open" | "not_applicable"; last_seen: string; sensor_health: "nominal" | "attention" | "unavailable"; applied_plan_version: string | null; };
export type Inventory = { resident_id: string; units_remaining: number; daily_cadence: number; updated_at: string; };
export type EvidenceActorType = "device" | "resident" | "caregiver" | "care_team" | "agent" | "system";
export type EvidenceType = "observation" | "self_report" | "plan_record" | "prepared_action" | "human_decision" | "diagnostic";
export type CareEvent = { id: string; resident_id: string; event_type: string; severity: CareSeverity; summary: string; detail: string; source: string; occurred_at: string; actor_type: EvidenceActorType; actor_id: string; evidence_type: EvidenceType; observed_at: string; recorded_at: string; trust_boundary: string; plan_version: string | null; };
export type ResidentResponseCode = "im_okay" | "not_sure" | "contact_caregiver";
export type ResidentCheckIn = { id: string; resident_id: string; prompt: string; status: "awaiting_resident" | "responded"; response_code: ResidentResponseCode | null; evidence_snapshot_id: string; idempotency_key: string; created_at: string; responded_at: string | null; };
export type PreparedAction = { id: string; resident_id: string; channel: "call" | "visit" | "message"; reason: string; status: "awaiting_human_approval" | "approved_in_demo" | "dismissed"; evidence_snapshot_id: string | null; idempotency_key: string; created_at: string; resolved_at: string | null; };
export type CareTeamHandoff = { id: string; resident_id: string; review_type: "nurse_review"; period_hours: 24 | 72; reason: string; status: "awaiting_human_approval" | "approved_in_demo" | "dismissed"; evidence_snapshot_id: string; idempotency_key: string; created_at: string; resolved_at: string | null; };
export type CaregiverProfile = { id: string; display_name: string; role: string; previous_resident_visits: number; last_resident_shift_at: string | null; scheduled_weekly_hours: number; preferred_max_hours: number; projected_hours: number; current_assignment_summary: string; availability: { from: string; until: string; status: "available" | "unavailable" | "partial"; reason: string; }; readiness: { core_training_current: boolean; role_qualification_current: boolean; resident_orientation_complete: boolean; acknowledged_care_plan_version: string | null; }; };
export type CareShift = { id: string; resident_id: string; starts_at: string; ends_at: string; required_role: string; required_orientation_plan_version: string; original_caregiver_id: string; assigned_caregiver_id: string | null; next_caregiver_id: string | null; coverage_status: "covered" | "coverage_needed" | "awaiting_scheduler_approval" | "assigned"; visit_status: "not_started" | "in_progress" | "completed"; handoff_status: "not_ready" | "ready" | "awaiting_caregiver_approval" | "available_to_next_caregiver" | "acknowledged"; disruption_reason: string | null; version: number; };
export type EligibilityCheck = { key: "availability" | "role_qualification" | "core_training" | "resident_orientation" | "care_plan_acknowledgement" | "schedule_conflict" | "travel_window" | "weekly_hours"; label: string; passed: boolean; detail: string; };
export type CoverageCandidate = { caregiver: CaregiverProfile; eligible: boolean; checks: EligibilityCheck[]; exclusion_reasons: string[]; continuity_note: string; tradeoff: string | null; };
export type CoverageProposal = { id: string; shift_id: string; caregiver_id: string; schedule_snapshot_id: string; reason: string; status: "awaiting_scheduler_approval" | "approved_in_demo" | "dismissed"; idempotency_key: string; created_at: string; resolved_at: string | null; };
export type VisitEvent = { id: string; shift_id: string; caregiver_id: string; event_type: "shift_checked_in" | "routine_completed" | "meal_delivered" | "caregiver_observation" | "shift_checked_out"; summary: string; detail: string; occurred_at: string; evidence_class: string; };
export type ShiftHandoff = { id: string; shift_id: string; from_caregiver_id: string; to_caregiver_id: string; schedule_snapshot_id: string; completed: string[]; observed: string[]; unresolved: string[]; status: "awaiting_caregiver_approval" | "available_to_next_caregiver" | "dismissed" | "acknowledged"; idempotency_key: string; created_at: string; resolved_at: string | null; };
export type HandoffAcknowledgement = { id: string; shift_handoff_id: string; caregiver_id: string; acknowledged_at: string; };
export type TeamResident = { id: "rose-demo" | "walter-demo" | "evelyn-demo"; display_name: string; age: number; care_plan_version: string; support_setting: string; headline: string; status: "routine" | "attention" | "waiting_on_human" | "resolved"; preferences: string[]; context: string[]; };
export type AttentionItem = { id: string; resident_id: TeamResident["id"]; resident_name: string; state: "attention_now" | "due_later" | "waiting_on_human" | "resolved"; attention_reason: string; deadline: string; source: string; policy_basis: string; known: string[]; unknown: string[]; human_owner: string; };
export type TeamInquiry = { id: string; resident_id: TeamResident["id"]; caregiver_id: string; inquiry_type: "visit_verification"; prompt: string; status: "awaiting_coordinator_approval" | "response_received" | "resolved" | "dismissed"; response_code: "arrived_verification_failed" | "delayed" | "cannot_attend" | "no_response" | null; response_detail: string | null; idempotency_key: string; created_at: string; responded_at: string | null; resolved_at: string | null; };
export type OrientationPacket = { id: string; resident_id: TeamResident["id"]; caregiver_id: string; care_plan_version: string; status: "awaiting_coordinator_outreach" | "response_received" | "verified"; reason: string; idempotency_key: string; created_at: string; response_detail: string | null; responded_at: string | null; verified_at: string | null; sections: Array<{ title: string; detail: string; }>; };
export type CareTeamDay = { step: number; step_label: string; next_event_label: string | null; timeline: Array<{ step: number; time: string; label: string; }>; residents: TeamResident[]; attention_queue: AttentionItem[]; orientation_packets: OrientationPacket[]; inquiries: TeamInquiry[]; advance_gate: { allowed: boolean; blockers: string[]; requirement: string; }; };
export type CarePlanProvenance = { version: string; effective_at: string; authorized_by: string; authorization_role: string; device_applied_version: string | null; alignment: "aligned" | "mismatch"; };
export type BaselineComparison = { signal: string; baseline: string; observed: string; interpretation: string; evidence_status: "consistent" | "changed" | "unresolved"; };
export type CareStory = { horizon_hours: 24 | 72; starts_at: string; ends_at: string; routine_confirmations: number; unconfirmed_windows: number; resident_check_ins: number; routine_activity_signals: number; device_interruptions: number; summary: string; unresolved: string[]; baseline_comparisons: BaselineComparison[]; };
export type CareState = { fictional: true; demo_run_id: string; evidence_version: number; resident: Resident; profile: ResidentProfile; monitoring_plan: MonitoringRule[]; care_story: CareStory; doses: Dose[]; devices: CareDevice[]; inventory: Inventory; events: CareEvent[]; resident_check_ins: ResidentCheckIn[]; actions: PreparedAction[]; handoffs: CareTeamHandoff[]; caregivers: CaregiverProfile[]; shifts: CareShift[]; coverage_proposals: CoverageProposal[]; visit_events: VisitEvent[]; shift_handoffs: ShiftHandoff[]; handoff_acknowledgements: HandoffAcknowledgement[]; care_team_day?: CareTeamDay; care_plan: CarePlanProvenance; safety_contract: { ai_may: string[]; ai_may_not: string[]; emergency_notice: string; }; };
