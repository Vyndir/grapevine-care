import { describe, expect, it } from "vitest";
import { parseArgs, prepareCaregiverCheckInArgsSchema } from "./schemas";

describe("care tool inputs", () => {
  it("requires a bounded reason and idempotency key for staged outreach", () => {
    expect(() => parseArgs(prepareCaregiverCheckInArgsSchema, { resident_id: "rose-demo", channel: "call", reason: "short", evidence_snapshot_id: "snapshot-current-001", idempotency_key: "tiny" })).toThrow();
    expect(parseArgs(prepareCaregiverCheckInArgsSchema, { resident_id: "rose-demo", channel: "visit", reason: "Review the missed confirmation with current evidence.", evidence_snapshot_id: "snapshot-current-001", idempotency_key: "scenario-missed-visit" }).channel).toBe("visit");
  });

  it("rejects autonomous or unknown action channels", () => {
    expect(() => parseArgs(prepareCaregiverCheckInArgsSchema, { resident_id: "rose-demo", channel: "dispatch_emergency_services", reason: "An agent decided this is an emergency.", evidence_snapshot_id: "snapshot-current-001", idempotency_key: "unsafe-action-001" })).toThrow();
  });
});
