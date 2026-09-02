import { describe, expect, it } from "vitest";
import { parseArgs, prepareCaregiverCheckInArgsSchema, prepareCareTeamReviewArgsSchema } from "./schemas";

describe("care tool inputs", () => {
  it("requires a bounded reason and idempotency key for staged outreach", () => {
    expect(() => parseArgs(prepareCaregiverCheckInArgsSchema, { resident_id: "rose-demo", channel: "call", reason: "short", evidence_snapshot_id: "snapshot-current-001", idempotency_key: "tiny" })).toThrow();
    expect(parseArgs(prepareCaregiverCheckInArgsSchema, { resident_id: "rose-demo", channel: "visit", reason: "Review the missed confirmation with current evidence.", evidence_snapshot_id: "snapshot-current-001", idempotency_key: "scenario-missed-visit" }).channel).toBe("visit");
  });

  it("rejects autonomous or unknown action channels", () => {
    expect(() => parseArgs(prepareCaregiverCheckInArgsSchema, { resident_id: "rose-demo", channel: "dispatch_emergency_services", reason: "An agent decided this is an emergency.", evidence_snapshot_id: "snapshot-current-001", idempotency_key: "unsafe-action-001" })).toThrow();
  });

  it("bounds care-team handoffs to supported human review types and periods", () => {
    expect(parseArgs(prepareCareTeamReviewArgsSchema, { resident_id: "rose-demo", review_type: "nurse_review", period_hours: 72, reason: "Two signed-plan monitoring signals require qualified human review.", evidence_snapshot_id: "snapshot-current-001", idempotency_key: "care-team-review-001" }).period_hours).toBe(72);
    expect(() => parseArgs(prepareCareTeamReviewArgsSchema, { resident_id: "rose-demo", review_type: "change_medication", period_hours: 12, reason: "Let the agent change Rose's plan.", evidence_snapshot_id: "snapshot-current-001", idempotency_key: "unsafe-review-001" })).toThrow();
  });
});
