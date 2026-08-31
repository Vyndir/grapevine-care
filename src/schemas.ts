import * as z from "zod/mini";

z.config(z.locales.en());

export const requestTypes = [
  "route_status",
  "flood_depth",
  "supply_access",
  "hazard_report",
  "custom"
] as const;

export const answerOptions = {
  route_status: ["passable", "caution", "blocked", "unknown"],
  flood_depth: ["clear", "under 6 in", "6-12 in", "over 12 in"],
  supply_access: ["accessible", "limited", "inaccessible", "unknown"],
  hazard_report: ["none", "debris", "downed lines", "flooding"],
  custom: ["yes", "no", "unclear"]
} as const;

export const nearSchema = z
  .string()
  .check(z.trim(), z.minLength(1, "An operational area is required."));

export const spotSchema = z
  .string()
  .check(z.trim(), z.minLength(1, "An operational area is required."));

export const sourceIdSchema = z
  .string()
  .check(z.trim(), z.minLength(1, "A source ID is required."));

export const sessionIdSchema = z
  .string()
  .check(z.trim(), z.minLength(1, "A session ID is required."));

export const findAvailableSourcesArgsSchema = z.object({
  near: nearSchema.check(
    z.describe("An operational area, route, facility, or incident site.")
  ),
  radius_m: z.optional(
    z
      .number()
      .check(
        z.minimum(50),
        z.maximum(10000),
        z.describe("Search radius in meters. Defaults to 1500.")
      )
  )
});

export const getWebBaselineArgsSchema = z.object({
  spot: spotSchema.check(z.describe("The operational area whose baseline should be read."))
});

export const askSourceArgsSchema = z.object({
  source_id: sourceIdSchema.check(
    z.describe("The source ID returned by find_available_sources.")
  ),
  request_type: z.enum(requestTypes).check(
    z.describe(
      "One of route_status, flood_depth, supply_access, hazard_report, or custom."
    )
  ),
  question: z.optional(
    z
      .string()
      .check(
        z.trim(),
        z.maxLength(240, "Questions must be 240 characters or fewer."),
        z.describe("Optional human-readable question for the source.")
      )
  )
});

export const getResponseArgsSchema = z.object({
  session_id: sessionIdSchema.check(
    z.describe("The session ID returned by ask_source.")
  )
});

export const rateResponseArgsSchema = z.object({
  session_id: sessionIdSchema.check(
    z.describe("The answered session ID to rate.")
  ),
  stars: z
    .number()
    .check(
      z.minimum(1),
      z.maximum(5),
      z.describe("Whole-star rating from 1 to 5.")
    )
});

export const toolInputSchemas = {
  findAvailableSources: z.toJSONSchema(findAvailableSourcesArgsSchema, {
    target: "draft-07",
    io: "input"
  }),
  getWebBaseline: z.toJSONSchema(getWebBaselineArgsSchema, {
    target: "draft-07",
    io: "input"
  }),
  askSource: z.toJSONSchema(askSourceArgsSchema, {
    target: "draft-07",
    io: "input"
  }),
  getResponse: z.toJSONSchema(getResponseArgsSchema, {
    target: "draft-07",
    io: "input"
  }),
  rateResponse: z.toJSONSchema(rateResponseArgsSchema, {
    target: "draft-07",
    io: "input"
  })
} as const;

export type RequestType = (typeof requestTypes)[number];
export type AnswerValue = (typeof answerOptions)[RequestType][number];

export type Spot = {
  place_id: string;
  name: string;
  address: string;
  baseline_status: string;
  baseline_detail: string;
  confidence: number;
  lat: number;
  lng: number;
  is_seeded: boolean;
  as_of?: string;
};

export type Source = {
  id: string;
  handle: string;
  trust_score: number;
  place_id: string;
  location_name: string;
  source_kind: "human" | "system";
  verification_label: string;
  lat: number;
  lng: number;
  offered: RequestType[];
  online: boolean;
  checked_in_at: string;
  last_active: string;
  distance_m?: number;
};

export type SessionStatus =
  | "pending_approval"
  | "sent"
  | "answered"
  | "rated";

export type Session = {
  id: string;
  source_id: string;
  requester_label: string;
  place_id: string;
  spot_name: string;
  request_type: RequestType;
  question: string;
  status: SessionStatus;
  answer_value: string | null;
  answer_note: string | null;
  photo_url: string | null;
  stars: number | null;
  created_at: string;
  answered_at: string | null;
  source?: Source;
};

export type AppState = {
  spots: Spot[];
  sources: Source[];
  sessions: Session[];
};

export function parseArgs<Schema extends z.ZodMiniType>(
  schema: Schema,
  input: unknown
): z.output<Schema> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error(z.prettifyError(result.error));
  }
  return result.data;
}
