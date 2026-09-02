import * as z from "zod/mini";

z.config(z.locales.en());

export const residentIdSchema = z.string().check(z.trim(), z.minLength(1), z.maxLength(64));
export const scenarioSchema = z.enum(["on_schedule", "missed_window", "care_story", "door_fault", "device_offline"]);

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
  resident_id: residentIdSchema
});
export const getCareStoryArgsSchema = z.object({
  resident_id: residentIdSchema,
  horizon: z.optional(z.enum(["24_hours", "72_hours"]).check(z.describe("Longitudinal care-story horizon. Defaults to 72 hours.")))
});
export const prepareCareTeamReviewArgsSchema = z.object({
  resident_id: residentIdSchema,
  review_type: z.enum(["nurse_review", "shift_handoff"]).check(z.describe("The human review surface to prepare. Nothing is sent automatically.")),
  period_hours: z.union([z.literal(24), z.literal(72)]).check(z.describe("Evidence period summarized in the prepared handoff.")),
  reason: z.string().check(z.trim(), z.minLength(12), z.maxLength(320), z.describe("Evidence-based reason tied to the authorized monitoring plan. Do not diagnose.")),
  evidence_snapshot_id: z.string().check(z.trim(), z.minLength(12), z.maxLength(96), z.describe("Current snapshot returned by get_care_evidence.")),
  idempotency_key: z.string().check(z.trim(), z.minLength(8), z.maxLength(80), z.describe("Unique key preventing duplicate handoffs."))
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
  prepareCareTeamReview: z.toJSONSchema(prepareCareTeamReviewArgsSchema, { target: "draft-07", io: "input" })
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
export type CareTeamHandoff = { id: string; resident_id: string; review_type: "nurse_review" | "shift_handoff"; period_hours: 24 | 72; reason: string; status: "awaiting_human_approval" | "approved_in_demo" | "dismissed"; evidence_snapshot_id: string; idempotency_key: string; created_at: string; resolved_at: string | null; };
export type CarePlanProvenance = { version: string; effective_at: string; authorized_by: string; authorization_role: string; device_applied_version: string | null; alignment: "aligned" | "mismatch"; };
export type BaselineComparison = { signal: string; baseline: string; observed: string; interpretation: string; evidence_status: "consistent" | "changed" | "unresolved"; };
export type CareStory = { horizon_hours: 24 | 72; starts_at: string; ends_at: string; routine_confirmations: number; unconfirmed_windows: number; resident_check_ins: number; routine_activity_signals: number; device_interruptions: number; summary: string; unresolved: string[]; baseline_comparisons: BaselineComparison[]; };
export type CareState = { fictional: true; demo_run_id: string; evidence_version: number; resident: Resident; profile: ResidentProfile; monitoring_plan: MonitoringRule[]; care_story: CareStory; doses: Dose[]; devices: CareDevice[]; inventory: Inventory; events: CareEvent[]; resident_check_ins: ResidentCheckIn[]; actions: PreparedAction[]; handoffs: CareTeamHandoff[]; care_plan: CarePlanProvenance; safety_contract: { ai_may: string[]; ai_may_not: string[]; emergency_notice: string; }; };
