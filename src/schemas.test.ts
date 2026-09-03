import { describe, expect, it } from "vitest";
import { getShiftContextArgsSchema, parseArgs, prepareCaregiverCheckInArgsSchema, prepareCareTeamReviewArgsSchema, prepareShiftCoverageArgsSchema, prepareShiftHandoffArgsSchema } from "./schemas";

describe("care tool inputs", () => {
  it("lets natural-language coverage work bootstrap without an opaque shift ID", () => {
    expect(parseArgs(getShiftContextArgsSchema, {})).toEqual({});
    expect(parseArgs(getShiftContextArgsSchema, { shift_id: "shift-wed-pm" }).shift_id).toBe("shift-wed-pm");
  });

  it("requires a bounded reason and idempotency key for staged outreach", () => {
    expect(() => parseArgs(prepareCaregiverCheckInArgsSchema, { resident_id: "rose-demo", channel: "call", reason: "short", evidence_snapshot_id: "snapshot-current-001", idempotency_key: "tiny" })).toThrow();
    expect(parseArgs(prepareCaregiverCheckInArgsSchema, { resident_id: "rose-demo", channel: "visit", reason: "Review the missed confirmation with current evidence.", evidence_snapshot_id: "snapshot-current-001", idempotency_key: "scenario-missed-visit" }).channel).toBe("visit");
  });

  it("rejects autonomous or unknown action channels", () => {
    expect(() => parseArgs(prepareCaregiverCheckInArgsSchema, { resident_id: "rose-demo", channel: "dispatch_emergency_services", reason: "An agent decided this is an emergency.", evidence_snapshot_id: "snapshot-current-001", idempotency_key: "unsafe-action-001" })).toThrow();
  });

  it("bounds care-team review to the supported nurse-review type and periods", () => {
    expect(parseArgs(prepareCareTeamReviewArgsSchema, { resident_id: "rose-demo", review_type: "nurse_review", period_hours: 72, reason: "Two signed-plan monitoring signals require qualified human review.", evidence_snapshot_id: "snapshot-current-001", idempotency_key: "care-team-review-001" }).period_hours).toBe(72);
    expect(() => parseArgs(prepareCareTeamReviewArgsSchema, { resident_id: "rose-demo", review_type: "change_medication", period_hours: 12, reason: "Let the agent change Rose's plan.", evidence_snapshot_id: "snapshot-current-001", idempotency_key: "unsafe-review-001" })).toThrow();
  });

  it("requires a current schedule snapshot and bounded explanation for coverage", () => {
    expect(parseArgs(prepareShiftCoverageArgsSchema, { shift_id: "shift-wed-pm", caregiver_id: "caregiver-jordan", schedule_snapshot_id: "schedule-snapshot-001", reason: "Jordan passes every explicit operational constraint.", idempotency_key: "coverage-schema-001" }).caregiver_id).toBe("caregiver-jordan");
    expect(() => parseArgs(prepareShiftCoverageArgsSchema, { shift_id: "shift-wed-pm", caregiver_id: "caregiver-jordan", schedule_snapshot_id: "old", reason: "Pick Jordan.", idempotency_key: "short" })).toThrow();
  });

  it("bounds operational handoff preparation to an identified shift and recipient", () => {
    expect(parseArgs(prepareShiftHandoffArgsSchema, { shift_id: "shift-wed-pm", to_caregiver_id: "caregiver-luis", schedule_snapshot_id: "schedule-snapshot-002", reason: "Preserve completed work and unresolved context for Luis.", idempotency_key: "handoff-schema-001" }).to_caregiver_id).toBe("caregiver-luis");
    expect(() => parseArgs(prepareShiftHandoffArgsSchema, { shift_id: "x", to_caregiver_id: "y", schedule_snapshot_id: "old", reason: "Send it", idempotency_key: "bad" })).toThrow();
  });
});
