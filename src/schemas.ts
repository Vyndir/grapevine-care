import * as z from "zod/mini";

z.config(z.locales.en());

export const residentIdSchema = z.string().check(z.trim(), z.minLength(1), z.maxLength(64));
export const scenarioSchema = z.enum(["on_schedule", "missed_window", "door_fault", "device_offline"]);

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
  event_limit: z.optional(z.number().check(z.minimum(1), z.maximum(20), z.describe("Maximum evidence events to return. Defaults to 8.")))
});
export const prepareCaregiverCheckInArgsSchema = z.object({
  resident_id: residentIdSchema,
  channel: z.enum(["call", "visit", "message"]).check(z.describe("Proposed caregiver check-in channel. This is staged only and is never sent automatically.")),
  reason: z.string().check(z.trim(), z.minLength(8), z.maxLength(240), z.describe("Concise evidence-based reason for a caregiver to review.")),
  idempotency_key: z.string().check(z.trim(), z.minLength(8), z.maxLength(80), z.describe("Unique caller-generated key that prevents duplicate staged actions."))
});

export const toolInputSchemas = {
  getCareOverview: z.toJSONSchema(getCareOverviewArgsSchema, { target: "draft-07", io: "input" }),
  getMedicationSchedule: z.toJSONSchema(getMedicationScheduleArgsSchema, { target: "draft-07", io: "input" }),
  getInventoryForecast: z.toJSONSchema(getInventoryForecastArgsSchema, { target: "draft-07", io: "input" }),
  getDeviceCapabilities: z.toJSONSchema(getDeviceCapabilitiesArgsSchema, { target: "draft-07", io: "input" }),
  getCareEvidence: z.toJSONSchema(getCareEvidenceArgsSchema, { target: "draft-07", io: "input" }),
  prepareCaregiverCheckIn: z.toJSONSchema(prepareCaregiverCheckInArgsSchema, { target: "draft-07", io: "input" })
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
export type Dose = { id: string; resident_id: string; label: string; scheduled_time: string; window_label: string; compartment: string; status: DoseStatus; confirmed_at: string | null; };
export type CareDevice = { id: string; resident_id: string; name: string; device_type: "medication_dispenser" | "fall_sensor" | "blood_pressure_cuff"; status: "online" | "offline" | "attention"; battery_percent: number; firmware: string; capabilities: string[]; door_state: "closed" | "open" | "not_applicable"; last_seen: string; };
export type Inventory = { resident_id: string; units_remaining: number; daily_cadence: number; updated_at: string; };
export type CareEvent = { id: string; resident_id: string; event_type: string; severity: CareSeverity; summary: string; detail: string; source: string; occurred_at: string; };
export type PreparedAction = { id: string; resident_id: string; channel: "call" | "visit" | "message"; reason: string; status: "awaiting_human_approval" | "approved_in_demo" | "dismissed"; idempotency_key: string; created_at: string; resolved_at: string | null; };
export type CareState = { fictional: true; demo_run_id: string; resident: Resident; doses: Dose[]; devices: CareDevice[]; inventory: Inventory; events: CareEvent[]; actions: PreparedAction[]; safety_contract: { ai_may: string[]; ai_may_not: string[]; emergency_notice: string; }; };
