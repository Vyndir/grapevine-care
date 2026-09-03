import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockCountdownIcon,
  MagnifyingGlassIcon,
  RadioIcon,
  ShieldCheckIcon,
  UserFocusIcon,
  UsersThreeIcon,
  WarningCircleIcon
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type { CareState, CoverageCandidate, TeamResident } from "./schemas";
import type { CareActions } from "./useCare";
import type { WebMCPToolsState } from "./useWebMCPTools";

function formatClock(value: string) {
  return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
}

const statusLabel: Record<TeamResident["status"], string> = {
  routine: "Later today",
  attention: "Needs attention",
  waiting_on_human: "Waiting on a person",
  resolved: "Addressed"
};

export function CareTeamDayView({ state, actions, busy, webmcp, onMessage }: { state: CareState; actions: CareActions; busy: boolean; webmcp: WebMCPToolsState; onMessage(message: string): void; }) {
  const day = state.care_team_day!;
  const focusedItem = day.attention_queue.find((item) => item.state === "attention_now" || item.state === "waiting_on_human") ?? day.attention_queue.at(-1);
  const [selectedId, setSelectedId] = useState<TeamResident["id"]>(focusedItem?.resident_id ?? "evelyn-demo");
  const [coverageCandidates, setCoverageCandidates] = useState<CoverageCandidate[]>([]);
  const [scheduleSnapshotId, setScheduleSnapshotId] = useState("");
  const selected = day.residents.find((resident) => resident.id === selectedId) ?? day.residents[0];
  const selectedAttention = [...day.attention_queue].reverse().find((item) => item.resident_id === selected.id);
  const evelynInquiry = day.inquiries.find((item) => item.resident_id === "evelyn-demo" && item.inquiry_type === "visit_verification");
  const jordanReadiness = day.inquiries.find((item) => item.resident_id === "rose-demo" && item.inquiry_type === "shift_readiness");
  const jordanVisitOutcome = day.inquiries.find((item) => item.resident_id === "rose-demo" && item.inquiry_type === "visit_outcome");
  const jordanHandoffApproval = day.inquiries.find((item) => item.resident_id === "rose-demo" && item.inquiry_type === "handoff_approval");
  const luisHandoffReceipt = day.inquiries.find((item) => item.resident_id === "rose-demo" && item.inquiry_type === "handoff_receipt");
  const packet = day.orientation_packets.find((item) => item.resident_id === "walter-demo");
  const roseShift = state.shifts.find((shift) => shift.id === "shift-wed-pm");
  const coverageProposal = state.coverage_proposals.find((proposal) => proposal.shift_id === "shift-wed-pm" && proposal.status === "awaiting_scheduler_approval");
  const shiftHandoff = state.shift_handoffs.find((handoff) => handoff.shift_id === "shift-wed-pm");
  const resolvedCount = day.attention_queue.filter((item) => item.state === "resolved").length;
  const progress = Math.round(((day.step + (day.advance_gate.allowed ? 1 : 0)) / day.timeline.length) * 100);

  useEffect(() => {
    if (focusedItem) setSelectedId(focusedItem.resident_id);
    setCoverageCandidates([]);
    setScheduleSnapshotId("");
  }, [day.step, focusedItem?.id]);

  async function run(task: () => Promise<unknown>, success: string) {
    try { await task(); onMessage(success); }
    catch (caught) { onMessage(caught instanceof Error ? caught.message : "That step could not be completed."); }
  }

  function prepareEvelynInquiry() {
    return run(() => actions.prepareTeamInquiry({ resident_ref: "Evelyn", caregiver_id: "caregiver-luis", prompt: "Your 9:00 AM visit with Evelyn has no verification record. Please confirm your current status and whether assistance is needed.", idempotency_key: "evelyn-visit-verification-v1" }), "Luis’s status check is prepared. A coordinator must approve it before the simulation returns a response.");
  }

  function prepareWalter() {
    return run(() => actions.prepareAssignmentOrientation({ resident_ref: "Walter", caregiver_id: "caregiver-elena", reason: "Elena needs Walter-specific orientation and Care Plan v2 acknowledgement before the 1:00 PM assignment.", idempotency_key: "ui-walter-orientation-v2" }), "Walter’s orientation packet is ready for Elena. Nothing was marked complete.");
  }

  function prepareJordanReadiness() {
    return run(() => actions.prepareTeamInquiry({ resident_ref: "Rose", caregiver_id: "caregiver-jordan", prompt: "Please review Rose’s current assignment brief, confirm the changes and unresolved items are understood, and report whether you are ready to begin the 5:00 PM visit.", idempotency_key: "jordan-shift-readiness-v1" }), "Jordan’s readiness check-in is prepared. A coordinator must approve it before the simulation returns her response.");
  }

  function prepareJordanVisitOutcome() {
    return run(() => actions.prepareTeamInquiry({ resident_ref: "Rose", caregiver_id: "caregiver-jordan", prompt: "Please submit the completed tasks, bounded observations, and unresolved items from Rose’s visit so the coordinator can verify the record before handoff.", idempotency_key: "jordan-visit-outcome-v1" }), "Jordan’s visit-update request is prepared. A coordinator must approve it before the simulation returns her record.");
  }

  function prepareHandoffConfirmation(caregiver: "Jordan" | "Luis") {
    const isJordan = caregiver === "Jordan";
    return run(() => actions.prepareTeamInquiry({ resident_ref: "Rose", caregiver_id: isJordan ? "caregiver-jordan" : "caregiver-luis", prompt: isJordan ? "Please review the prepared handoff for Rose and confirm whether it accurately separates completed tasks, direct observations, and unresolved items." : "Please review Rose’s approved handoff and confirm that you received the continuity context needed for the next visit.", idempotency_key: isJordan ? "jordan-handoff-approval-v1" : "luis-handoff-receipt-v1" }), isJordan ? "Jordan’s handoff-review request is prepared for coordinator approval." : "Luis’s handoff-receipt check-in is prepared for coordinator approval.");
  }

  async function compareCoverage() {
    if (!roseShift) return;
    try {
      const context = await actions.getShiftContext({ shift_id: roseShift.id });
      const result = await actions.getCoverageCandidates({ shift_id: roseShift.id });
      setScheduleSnapshotId(String(context.schedule_snapshot_id ?? ""));
      setCoverageCandidates(result.candidates);
      onMessage("Caregivers were compared using explicit readiness, availability, travel, conflict, and workload rules.");
    } catch (caught) { onMessage(caught instanceof Error ? caught.message : "Coverage could not be reviewed."); }
  }

  function prepareCoverage(candidate: CoverageCandidate) {
    if (!roseShift || !scheduleSnapshotId) return;
    return run(() => actions.prepareShiftCoverage({ shift_id: roseShift.id, caregiver_id: candidate.caregiver.id, schedule_snapshot_id: scheduleSnapshotId, reason: `${candidate.caregiver.display_name} passed every explicit readiness, availability, conflict, travel, and workload check for Rose's evening visit.`, idempotency_key: `team-day-coverage-${candidate.caregiver.id}` }), "Qualified coverage is prepared for scheduler approval. The schedule has not changed.");
  }

  async function prepareHandoff() {
    if (!roseShift?.next_caregiver_id) return;
    try {
      const context = await actions.getShiftContext({ shift_id: roseShift.id });
      await actions.prepareShiftHandoff({ shift_id: roseShift.id, to_caregiver_id: roseShift.next_caregiver_id, schedule_snapshot_id: String(context.schedule_snapshot_id), reason: "Preserve completed visit evidence, bounded observations, and unresolved items for the next caregiver.", idempotency_key: "team-day-shift-handoff-v1" });
      onMessage("The continuity handoff is prepared. Jordan must approve it before Luis can acknowledge it.");
    } catch (caught) { onMessage(caught instanceof Error ? caught.message : "The handoff could not be prepared."); }
  }

  const actionArea = selected.id === "evelyn-demo" && day.step === 0 ? <section className="decision-actions">
    <p className="eyebrow">Investigation path</p>
    {!evelynInquiry && <><h3>Ask before assuming</h3><p>No verification record does not prove Luis is absent. Prepare one bounded status question.</p><button className="primary-inline" type="button" disabled={busy} onClick={() => void prepareEvelynInquiry()}><MagnifyingGlassIcon /> Prepare check-in to Luis</button></>}
    {evelynInquiry?.status === "awaiting_coordinator_approval" && <><h3>Coordinator review required</h3><blockquote>{evelynInquiry.prompt}</blockquote><p>Approving this demo action returns a clearly labeled simulated caregiver response. No real message is sent.</p><div className="decision-buttons"><button type="button" className="secondary-inline" disabled={busy} onClick={() => void run(() => actions.resolveTeamInquiry(evelynInquiry.id, "dismissed"), "The draft was dismissed. Evelyn’s verification question remains open.")}>Dismiss</button><button type="button" className="primary-inline" disabled={busy} onClick={() => void run(() => actions.resolveTeamInquiry(evelynInquiry.id, "send_in_demo"), "Luis replied. Review his self-report before closing the exception.")}>Approve simulated check-in</button></div></>}
    {evelynInquiry?.status === "response_received" && <><h3>Luis responded</h3><blockquote>{evelynInquiry.response_detail}</blockquote><p><strong>Evidence boundary:</strong> This is Luis’s self-report. It explains the missing record but is not independent proof of earlier activity.</p><button className="primary-inline" type="button" disabled={busy} onClick={() => void run(() => actions.closeTeamInquiry(evelynInquiry.id), "Evelyn’s verification exception is resolved with its evidence boundary preserved.")}><CheckCircleIcon /> Record disposition and close</button></>}
    {evelynInquiry?.status === "resolved" && <p className="resolved-callout"><CheckCircleIcon weight="fill" /> The coordinator investigated, reviewed Luis’s response, and recorded the disposition.</p>}
  </section> : selected.id === "walter-demo" && day.step === 1 ? <section className="decision-actions">
    <p className="eyebrow">Assignment readiness</p>
    {!packet && <><h3>Elena is available—one readiness requirement remains</h3><p>Her general qualification and availability are already verified. Walter’s orientation packet and Care Plan v2 acknowledgement still need to be completed before she proceeds.</p><button className="primary-inline" type="button" disabled={busy} onClick={() => void prepareWalter()}><ShieldCheckIcon /> Prepare packet and follow-up</button></>}
    {packet?.status === "awaiting_coordinator_outreach" && <><h3>Readiness follow-up is ready</h3>{packet.sections.map((section) => <div className="packet-line" key={section.title}><strong>{section.title}</strong><span>{section.detail}</span></div>)}<p>The judge remains the coordinator. Sending this simulated check-in asks Elena to finish the one outstanding requirement; it does not impersonate her.</p><button className="primary-inline" type="button" disabled={busy} onClick={() => void run(() => actions.sendAssignmentOrientationFollowUp(packet.id), "Elena replied that she reviewed and submitted the packet. Verify receipt before clearing her.")}>Send readiness check-in to Elena</button></>}
    {packet?.status === "response_received" && <><h3>Elena submitted her acknowledgement</h3><blockquote>{packet.response_detail}</blockquote><p><strong>Coordinator check:</strong> Walter’s packet and Care Plan v2 acknowledgement are visible in the readiness record. Confirm receipt to clear Elena for the visit.</p><button className="primary-inline" type="button" disabled={busy} onClick={() => void run(() => actions.verifyAssignmentOrientation(packet.id), "Receipt is verified. Elena may proceed with Walter’s visit.")}><CheckCircleIcon /> Verify receipt and clear Elena</button></>}
    {packet?.status === "verified" && <p className="resolved-callout"><CheckCircleIcon weight="fill" /> Verified. Elena may proceed with Walter’s visit.</p>}
  </section> : selected.id === "rose-demo" && day.step === 2 ? <section className="decision-actions">
    <p className="eyebrow">Coverage recovery</p><h3>Maya called out for the 5:00 PM visit</h3>
    {!coverageProposal && !roseShift?.assigned_caregiver_id && coverageCandidates.length === 0 && <button className="primary-inline" type="button" disabled={busy} onClick={() => void compareCoverage()}><UserFocusIcon /> Compare qualified caregivers</button>}
    {!coverageProposal && !roseShift?.assigned_caregiver_id && coverageCandidates.length > 0 && <div className="candidate-list">{coverageCandidates.map((candidate) => <article key={candidate.caregiver.id} className={candidate.eligible ? "eligible" : "excluded"}><div><strong>{candidate.caregiver.display_name}</strong><span>{candidate.eligible ? "Eligible" : "Excluded by explicit rules"}</span></div><p>{candidate.eligible ? candidate.continuity_note : candidate.exclusion_reasons.join(" ")}</p>{candidate.eligible && <button type="button" disabled={busy} onClick={() => void prepareCoverage(candidate)}>Prepare {candidate.caregiver.display_name}</button>}</article>)}</div>}
    {coverageProposal && <><p>Jordan passed every deterministic constraint. The proposal is prepared, but the assignment has not changed.</p><div className="decision-buttons"><button className="secondary-inline" type="button" disabled={busy} onClick={() => void run(() => actions.resolveShiftCoverage(coverageProposal.id, "dismissed"), "The scheduler dismissed the proposal. Coverage remains open.")}>Dismiss</button><button className="primary-inline" type="button" disabled={busy} onClick={() => void run(() => actions.resolveShiftCoverage(coverageProposal.id, "approved_in_demo"), "The scheduler approved Jordan. Rose’s evening visit is covered.")}>Approve Jordan</button></div></>}
    {roseShift?.assigned_caregiver_id && roseShift.assigned_caregiver_id !== "caregiver-maya" && <p className="resolved-callout"><CheckCircleIcon weight="fill" /> Jordan is assigned after explicit scheduler approval.</p>}
  </section> : selected.id === "rose-demo" && day.step === 3 ? <section className="decision-actions"><p className="eyebrow">Visit readiness</p><h3>Confirm Jordan is prepared—without speaking for her</h3><p>Jordan is assigned and qualified. The coordinator now confirms she has the current context and is ready to begin Rose’s visit.</p>{roseShift?.visit_status === "not_started" && !jordanReadiness && <button className="primary-inline" type="button" disabled={busy} onClick={() => void prepareJordanReadiness()}><UserFocusIcon /> Prepare readiness check-in to Jordan</button>}{jordanReadiness?.status === "awaiting_coordinator_approval" && <><h3>Current brief is ready to send</h3><div className="packet-line"><strong>Rose’s current plan</strong><span>Care Plan v4, preferences, visit expectations, and contact path</span></div><div className="packet-line"><strong>Since Jordan’s last visit</strong><span>Assignment-relevant changes and the unresolved nurse-review item</span></div><blockquote>{jordanReadiness.prompt}</blockquote><p>The judge remains the coordinator. Sending this simulated check-in asks Jordan to review and respond; it does not impersonate her or start the visit.</p><button className="primary-inline" type="button" disabled={busy} onClick={() => void run(() => actions.resolveTeamInquiry(jordanReadiness.id, "send_in_demo"), "Jordan replied with her current-brief acknowledgement and readiness. Verify the response before clearing the visit.")}>Send readiness check-in to Jordan</button></>}{jordanReadiness?.status === "response_received" && <><h3>Jordan confirmed readiness</h3><blockquote>{jordanReadiness.response_detail}</blockquote><p><strong>Coordinator check:</strong> Her acknowledgement references the current plan, changes, and unresolved item. Verify the response to clear the visit to begin.</p><button className="primary-inline" type="button" disabled={busy} onClick={() => void run(() => actions.closeTeamInquiry(jordanReadiness.id), "Jordan’s response is verified. She is cleared and the simulated visit has begun.")}><CheckCircleIcon /> Verify response and clear Jordan</button></>}{roseShift?.visit_status !== "not_started" && <p className="resolved-callout"><CheckCircleIcon weight="fill" /> Jordan’s readiness was verified by the coordinator before the visit began.</p>}</section>
    : selected.id === "rose-demo" && day.step === 4 ? <section className="decision-actions"><p className="eyebrow">Visit evidence</p><h3>Request Jordan’s record—without speaking for her</h3><p>The coordinator asks Jordan for completed tasks, bounded observations, and unresolved items before anything becomes handoff evidence.</p>{roseShift?.visit_status === "in_progress" && !jordanVisitOutcome && <button className="primary-inline" type="button" disabled={busy} onClick={() => void prepareJordanVisitOutcome()}><MagnifyingGlassIcon /> Prepare visit-update request to Jordan</button>}{jordanVisitOutcome?.status === "awaiting_coordinator_approval" && <><h3>Visit-update request is ready</h3><blockquote>{jordanVisitOutcome.prompt}</blockquote><p>Sending this simulated request asks Jordan to submit her record. The judge remains the coordinator, and no visit evidence is created yet.</p><button className="primary-inline" type="button" disabled={busy} onClick={() => void run(() => actions.resolveTeamInquiry(jordanVisitOutcome.id, "send_in_demo"), "Jordan submitted her bounded visit record. Review it before making it available for handoff.")}>Send visit-update request to Jordan</button></>}{jordanVisitOutcome?.status === "response_received" && <><h3>Jordan submitted the visit record</h3><blockquote>{jordanVisitOutcome.response_detail}</blockquote><p><strong>Coordinator check:</strong> The response distinguishes completed tasks, a direct observation, and an unresolved item without adding a clinical conclusion.</p><button className="primary-inline" type="button" disabled={busy} onClick={() => void run(() => actions.closeTeamInquiry(jordanVisitOutcome.id), "Jordan’s visit record is verified. The handoff can now be prepared.")}><CheckCircleIcon /> Verify visit record</button></>}{roseShift?.visit_status === "completed" && <p className="resolved-callout"><CheckCircleIcon weight="fill" /> Jordan’s submitted visit record was verified before becoming continuity evidence.</p>}</section>
    : selected.id === "rose-demo" && day.step === 5 ? <section className="decision-actions"><p className="eyebrow">Continuity handoff</p><h3>Verify both sides of the handoff</h3><p>The coordinator keeps the outgoing approval and incoming receipt in each caregiver’s own voice.</p>{!shiftHandoff && <button className="primary-inline" type="button" disabled={busy} onClick={() => void prepareHandoff()}>Prepare continuity handoff</button>}{shiftHandoff?.status === "awaiting_caregiver_approval" && !jordanHandoffApproval && <button className="primary-inline" type="button" disabled={busy} onClick={() => void prepareHandoffConfirmation("Jordan")}>Prepare handoff review for Jordan</button>}{jordanHandoffApproval?.status === "awaiting_coordinator_approval" && <><blockquote>{jordanHandoffApproval.prompt}</blockquote><button className="primary-inline" type="button" disabled={busy} onClick={() => void run(() => actions.resolveTeamInquiry(jordanHandoffApproval.id, "send_in_demo"), "Jordan reviewed the handoff and responded. Verify her approval before sharing it with Luis.")}>Send handoff review to Jordan</button></>}{jordanHandoffApproval?.status === "response_received" && <><h3>Jordan approved the handoff</h3><blockquote>{jordanHandoffApproval.response_detail}</blockquote><button className="primary-inline" type="button" disabled={busy} onClick={() => void run(() => actions.closeTeamInquiry(jordanHandoffApproval.id), "Jordan’s approval is verified. The handoff is now available to Luis.")}><CheckCircleIcon /> Verify Jordan’s approval</button></>}{shiftHandoff?.status === "available_to_next_caregiver" && !luisHandoffReceipt && <button className="primary-inline" type="button" disabled={busy} onClick={() => void prepareHandoffConfirmation("Luis")}>Prepare receipt check-in to Luis</button>}{luisHandoffReceipt?.status === "awaiting_coordinator_approval" && <><blockquote>{luisHandoffReceipt.prompt}</blockquote><button className="primary-inline" type="button" disabled={busy} onClick={() => void run(() => actions.resolveTeamInquiry(luisHandoffReceipt.id, "send_in_demo"), "Luis confirmed receipt. Verify his response to close the continuity loop.")}>Send receipt check-in to Luis</button></>}{luisHandoffReceipt?.status === "response_received" && <><h3>Luis confirmed receipt</h3><blockquote>{luisHandoffReceipt.response_detail}</blockquote><button className="primary-inline" type="button" disabled={busy} onClick={() => void run(() => actions.closeTeamInquiry(luisHandoffReceipt.id), "Luis’s receipt is verified. The care-team day is complete.")}><CheckCircleIcon /> Verify Luis’s receipt</button></>}{shiftHandoff?.status === "acknowledged" && <p className="resolved-callout"><CheckCircleIcon weight="fill" /> The coordinator verified Jordan’s approval and Luis’s receipt.</p>}</section> : null;

  return <main className="team-day-layout">
    <section className="day-clock-hero">
      <div className="day-clock" aria-live="polite" aria-label={`Current simulated time ${formatClock(state.resident.simulated_time)}, ${day.step_label}`}><small>Wednesday · simulated care-team day</small><strong>{formatClock(state.resident.simulated_time)}</strong><span>{day.step_label}</span></div>
      <div className="day-progress"><div><span>Shift progress</span><strong>{resolvedCount} decisions addressed</strong></div><div className="progress-track"><i style={{ width: `${progress}%` }} /></div><ol>{day.timeline.map((item) => <li key={item.step} className={item.step < day.step ? "complete" : item.step === day.step ? "current" : "future"}><b>{item.time}</b><span>{item.label}</span></li>)}</ol></div>
      <details className="agent-tool-status"><summary><RadioIcon weight="fill" /> {webmcp.registered ? `${webmcp.count} agent tools active` : "Agent tools"}</summary><div><strong>Tools available for this decision</strong><ul>{webmcp.availableNames.map((name) => <li key={name}><code>{name}</code></li>)}</ul><p>The set changes as the day advances. Human acknowledgements remain human-only.</p></div></details>
    </section>

    <section className="time-gate" aria-live="polite"><div>{day.advance_gate.allowed ? <CheckCircleIcon weight="fill" /> : <ClockCountdownIcon weight="fill" />}<span><strong>{day.advance_gate.allowed ? "This time block is accounted for" : "Time is paused for one accountable decision"}</strong><small>{day.advance_gate.allowed ? (day.next_event_label ? `Ready to continue to ${day.next_event_label}.` : "Every handoff is complete.") : day.advance_gate.blockers[0]}</small></span></div><button type="button" disabled={busy || !day.next_event_label || !day.advance_gate.allowed} onClick={() => void run(() => actions.advanceCareTeamDay(), "The current work is preserved and the next time block is now active.")}>{day.next_event_label ? <>Advance to {day.timeline[day.step + 1]?.time} <ArrowRightIcon /></> : "Day complete"}</button></section>

    <section className="team-day-grid focused">
      <aside className="team-rail" aria-label="Care team residents"><header><UsersThreeIcon weight="fill" /><div><span>People receiving care</span><strong>Today’s continuity</strong></div></header>{day.residents.map((resident) => <button type="button" key={resident.id} className={selected.id === resident.id ? "active" : ""} onClick={() => setSelectedId(resident.id)}><i className={resident.status} /><span><strong>{resident.display_name}</strong><small>{resident.headline}</small></span><em>{statusLabel[resident.status]}</em></button>)}<details className="completed-history"><summary>{resolvedCount} addressed item{resolvedCount === 1 ? "" : "s"}</summary>{day.attention_queue.filter((item) => item.state === "resolved").map((item) => <p key={item.id}><CheckCircleIcon weight="fill" /><span><strong>{item.resident_name}</strong>{item.attention_reason}</span></p>)}</details></aside>

      <section className="attention-workspace focused-workspace">
        <header className="focus-heading"><div><p className="eyebrow">Current decision · {selectedAttention?.deadline}</p><h1>{selectedAttention?.attention_reason ?? `${selected.display_name} has no active item`}</h1><p>{selectedAttention?.policy_basis}</p></div><span className={selectedAttention?.state ?? "resolved"}>{selectedAttention?.state === "resolved" ? <CheckCircleIcon weight="fill" /> : <WarningCircleIcon weight="fill" />}{selectedAttention?.state?.replaceAll("_", " ") ?? "context"}</span></header>
        <div className="evidence-split"><section><h3>What is known</h3><ul>{selectedAttention?.known.map((item) => <li key={item}>{item}</li>) ?? <li>No current operational evidence.</li>}</ul></section><section><h3>What remains unknown</h3><ul>{selectedAttention?.unknown.length ? selectedAttention.unknown.map((item) => <li key={item}>{item}</li>) : <li>No open questions in this item.</li>}</ul></section></div>
        {actionArea}
        <details className="resident-context-details"><summary>View {selected.display_name}’s authorized context</summary><div><section><h3>Care-team context</h3><ul>{selected.context.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3>Support preferences</h3><ul>{selected.preferences.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3>Ownership</h3><p>{selectedAttention?.human_owner ?? "Care coordinator"}</p><small>{selectedAttention?.source}</small></section></div></details>
      </section>
    </section>
  </main>;
}
