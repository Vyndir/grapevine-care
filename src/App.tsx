import {
  ArrowClockwiseIcon,
  BellIcon,
  CheckCircleIcon,
  ClockIcon,
  FingerprintIcon,
  GaugeIcon,
  HeartIcon,
  HouseIcon,
  LeafIcon,
  ListChecksIcon,
  RadioIcon,
  ShieldCheckIcon,
  UsersThreeIcon,
  WarningCircleIcon,
  WaveformIcon
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import type { CareActions } from "./useCare";
import { useCare } from "./useCare";
import { useWebMCPTools, type WebMCPToolsState } from "./useWebMCPTools";
import { CoverageCaregiverView } from "./CoverageCaregiverView";
import { CareTeamDayView } from "./CareTeamDayView";
import type { CareState, CareTeamHandoff, Dose, PreparedAction, ResidentResponseCode, Scenario } from "./schemas";

type Workspace = "resident" | "caregiver" | "system";

const scenarios: Array<{ id: Scenario; label: string }> = [
  { id: "coverage_callout", label: "Caregiver call-out" },
  { id: "care_team_day", label: "Care Team Day" },
  { id: "on_schedule", label: "On schedule" },
  { id: "missed_window", label: "Missed window" },
  { id: "care_story", label: "72-hour story" },
  { id: "door_fault", label: "Door fault" },
  { id: "device_offline", label: "Device offline" }
];

function timeLabel(value: string, timeZone: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone });
}

function eventDateTimeLabel(value: string, timeZone: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone })} · ${timeLabel(value, timeZone)}`;
}

function doseStatusLabel(status: Dose["status"]) {
  return { ready: "Ready now", upcoming: "Upcoming", confirmed: "Confirmed", missed: "Window missed", blocked: "Release blocked" }[status];
}

function webMcpLabel(webmcp: WebMCPToolsState) {
  if (webmcp.error) return "Tool registration needs attention";
  if (webmcp.registered) return `${webmcp.count} care tools available`;
  if (webmcp.supported) return "Registering care tools";
  return "Preview mode · WebMCP browser needed";
}

function Brand() {
  return <a className="brand" href="/" aria-label="Grapevine Care home"><span className="brand-mark"><LeafIcon weight="fill" /></span><span><strong>Grapevine Care</strong><small>Context that follows the care</small></span></a>;
}

function ResidentView({ state, actions, busy, onMessage }: { state: CareState; actions: CareActions; busy: boolean; onMessage(message: string): void; }) {
  const current = state.doses.find((dose) => ["ready", "missed", "blocked"].includes(dose.status));
  const completed = state.doses.filter((dose) => dose.status === "confirmed").length;
  const pillbox = state.devices.find((device) => device.device_type === "medication_dispenser")!;
  const lastConfirmed = state.events.find((event) => event.event_type === "dose_confirmed");
  const residentCheckIn = state.resident_check_ins[0];
  const canConfirm = current?.status === "ready" && pillbox.status === "online" && pillbox.door_state === "closed";
  const message = current?.status === "missed" ? "This window has closed. The compartment remains locked. Your care circle can review what happened." : current?.status === "blocked" ? "The care station has paused release because a safety check needs attention." : current ? "The dispenser has checked the care plan and safety lock. It will release only this scheduled compartment." : "All scheduled windows so far have been confirmed.";

  async function confirm() {
    if (!current || !canConfirm) return;
    try { await actions.confirmDose(current.id); onMessage("Dose confirmation recorded. One compartment was released in this simulation."); }
    catch (caught) { onMessage(caught instanceof Error ? caught.message : "The device could not confirm that dose."); }
  }

  async function respond(responseCode: ResidentResponseCode) {
    if (!residentCheckIn || residentCheckIn.status !== "awaiting_resident") return;
    try { await actions.respondResidentCheckIn(residentCheckIn.id, responseCode); onMessage("Rose's response was recorded as self-reported evidence. Medication state was not changed."); }
    catch (caught) { onMessage(caught instanceof Error ? caught.message : "The response could not be recorded."); }
  }

  return <main className="care-layout">
    <section className="resident-workspace" aria-labelledby="today-title">
      <div className="welcome-row"><div><p className="date-line">Monday, August 31 · {timeLabel(state.resident.simulated_time, state.resident.timezone)}</p><h1 id="today-title">Good morning, {state.resident.display_name}.</h1><p>{state.resident.severity === "routine" ? "Your care plan is on schedule." : "Your care station has an update for you."} {current?.status === "ready" ? "One medicine is ready during the current window." : "Nothing unexpected will be released."}</p></div><span className="verified-pill"><ShieldCheckIcon weight="fill" /> Plan verified</span></div>
      <article className={`dose-card ${state.resident.severity}`}>
        <header><div><p><ClockIcon /> {current?.status === "ready" ? `Available now · ${current.window_label}` : current ? doseStatusLabel(current.status) : "Schedule complete"}</p><h2>{current?.label ?? "Today’s schedule"}</h2><span>{message}</span></div>{current && <aside><small>Compartment</small><strong>{current.compartment}</strong></aside>}</header>
        <div className="dose-body"><div className="dose-evidence"><div className="evidence-title"><span>{state.resident.severity === "routine" ? <CheckCircleIcon weight="fill" /> : <WarningCircleIcon weight="fill" />}</span><div><strong>{canConfirm ? "Safety check complete" : current?.status === "missed" ? "Window safely closed" : current ? "Safety hold active" : "Schedule recorded"}</strong><p>{pillbox.status === "offline" ? "Device telemetry is offline · local schedule remains active · no remote release" : pillbox.door_state === "open" ? "Door sensor open · all compartments locked · caregiver evidence available" : canConfirm ? "Correct time window · no duplicate release · device door closed" : "Compartment secured · no autonomous action · care circle can review"}</p></div></div><div className="explanation"><strong>What happens next</strong><p>{canConfirm ? `${state.resident.display_name} confirms locally. The device—not the AI—enforces the care plan and records the result for her care circle.` : "The AI may summarize the evidence, but it cannot release medication, alter the plan, or decide that an emergency has occurred."}</p></div></div>
          <button className="verify-button" type="button" disabled={!canConfirm || busy} onClick={() => void confirm()}><FingerprintIcon /><strong>{canConfirm ? "Verify locally" : "Compartment secured"}</strong><small>{canConfirm ? "Confirm scheduled dose" : "Device rules remain in control"}</small></button></div>
      </article>
      {residentCheckIn?.status === "awaiting_resident" && <section className="resident-check-in" aria-labelledby="resident-check-in-title"><div><p className="eyebrow">A question for Rose · only Rose can answer</p><h2 id="resident-check-in-title">{residentCheckIn.prompt}</h2><p>Your answer becomes a self-report for your care circle. It will not release medicine, change your plan, or make an emergency decision.</p></div><div className="resident-response-grid"><button type="button" disabled={busy} onClick={() => void respond("im_okay")}>I'm okay</button><button type="button" disabled={busy} onClick={() => void respond("not_sure")}>I'm not sure</button><button type="button" disabled={busy} onClick={() => void respond("contact_caregiver")}>I'd like my caregiver to contact me</button></div></section>}
      {residentCheckIn?.status === "responded" && <section className="resident-check-in resolved"><div><p className="eyebrow">Response recorded</p><h2>Thank you, Rose.</h2><p>Your care circle can see your response. The medication confirmation remains a separate piece of evidence.</p></div><span><CheckCircleIcon weight="fill" /> Self-report added</span></section>}
      <div className="summary-grid"><article><small>Next check-in</small><strong>{state.doses.find((dose) => dose.status === "upcoming")?.scheduled_time === "12:00" ? "12:00 PM" : "8:00 PM"}</strong><span>Care plan</span></article><article><small>Supply remaining</small><strong>{Math.floor(state.inventory.units_remaining / state.inventory.daily_cadence)} days</strong><span>{state.inventory.units_remaining} units · refill watch</span></article><article><small>Last confirmed</small><strong>{lastConfirmed ? eventDateTimeLabel(lastConfirmed.occurred_at, state.resident.timezone) : "No recent record"}</strong><span>{lastConfirmed?.source ?? "Local attestation"}</span></article></div>
    </section>
    <aside className="status-rail" aria-label="Care status"><section className="rail-panel"><div className="rail-heading"><span><small>Today</small><h2>Medication timeline</h2></span><strong>{completed} of {state.doses.length}</strong></div><ol>{state.doses.map((dose, index) => <li className={dose.status} key={dose.id}><i>{dose.status === "confirmed" ? "✓" : index + 1}</i><strong>{dose.scheduled_time === "08:00" ? "8:00 AM" : dose.scheduled_time === "12:00" ? "12:00 PM" : "8:00 PM"}</strong><span>{doseStatusLabel(dose.status)}</span></li>)}</ol></section><CareCircle /><p className="demo-note">Fictional demonstration only. Grapevine Care does not diagnose, prescribe, or replace clinical judgment or emergency services.</p></aside>
  </main>;
}

function CareCircle() {
  return <section className="rail-panel"><div className="circle-heading"><span><HeartIcon weight="fill" /></span><div><small>Connected</small><h2>Rose’s care circle</h2></div></div><ul className="care-circle"><li><i>MG</i><span><strong>Miles</strong><small>Primary caregiver · decision authority</small></span><b /></li><li><i>RN</i><span><strong>Nurse Ava</strong><small>Care team RN · signed plan provenance</small></span><b /></li></ul></section>;
}

type CaregiverTab = "now" | "story" | "plan" | "circle";

function StoryPanel({ state }: { state: CareState }) {
  const story = state.care_story;
  return <div className="story-stack">
    <section className="care-brief"><div className="section-heading"><div><p className="eyebrow">Agent-readable care brief · {story.horizon_hours} hours</p><h2>How Rose has been doing, relative to Rose</h2></div><span>Facts · baseline · uncertainty</span></div><p className="brief-summary">{story.summary}</p><div className="brief-metrics"><article><strong>{story.routine_confirmations}</strong><span>routine confirmations</span></article><article><strong>{story.unconfirmed_windows}</strong><span>unconfirmed windows</span></article><article><strong>{story.resident_check_ins}</strong><span>resident check-in</span></article><article><strong>{story.device_interruptions}</strong><span>device interruptions</span></article></div><div className="unresolved-box"><strong>Still unresolved</strong><ul>{story.unresolved.map((item) => <li key={item}>{item}</li>)}</ul></div></section>
    <section className="baseline-panel"><div className="section-heading"><div><p className="eyebrow">Baseline-aware monitoring</p><h2>What changed for Rose?</h2></div><span>Not a generic definition of normal</span></div><div className="comparison-grid">{story.baseline_comparisons.map((item) => <article key={item.signal} className={item.evidence_status}><header><strong>{item.signal}</strong><span>{item.evidence_status}</span></header><dl><div><dt>Rose’s baseline</dt><dd>{item.baseline}</dd></div><div><dt>Observed</dt><dd>{item.observed}</dd></div><div><dt>Why it matters</dt><dd>{item.interpretation}</dd></div></dl></article>)}</div></section>
    <section className="evidence-panel story-timeline"><div className="section-heading"><div><p className="eyebrow">Three-day care story</p><h2>What happened, in sequence</h2></div><span>Source-visible evidence</span></div><ol>{[...state.events].reverse().slice(-12).map((event) => <li key={event.id}><span className={`event-dot ${event.severity}`} /><div><strong>{event.summary}</strong><p>{event.detail}</p><small>{eventDateTimeLabel(event.observed_at, state.resident.timezone)} · {event.actor_type.replaceAll("_", " ")} · {event.evidence_type.replaceAll("_", " ")}</small></div></li>)}</ol></section>
  </div>;
}

function CarePlanPanel({ state }: { state: CareState }) {
  return <div className="plan-stack"><section className="profile-card"><div><p className="eyebrow">About Rose · care-team supplied</p><h2>Rose, {state.profile.age}</h2><p>{state.profile.living_arrangement}. {state.profile.support_schedule}.</p></div><span><ShieldCheckIcon weight="fill" /> {state.care_plan.version} signed by {state.care_plan.authorized_by}</span><div className="profile-columns"><article><strong>Relevant history</strong><ul>{state.profile.relevant_history.map((item) => <li key={item}>{item}</li>)}</ul></article><article><strong>Documented baseline</strong><ul>{state.profile.baseline.map((item) => <li key={item}>{item}</li>)}</ul></article><article><strong>Care preferences</strong><ul>{state.profile.preferences.map((item) => <li key={item}>{item}</li>)}</ul></article></div></section><section className="monitoring-panel"><div className="section-heading"><div><p className="eyebrow">What we’re watching</p><h2>Authorized monitoring instructions</h2></div><span>The agent does not invent criteria</span></div><div className="monitoring-grid">{state.monitoring_plan.map((rule) => <article key={rule.id}><span>{rule.category.replaceAll("_", " ")}</span><h3>{rule.title}</h3><p>{rule.instruction}</p><footer><strong>Review threshold</strong>{rule.threshold_description}</footer></article>)}</div></section></div>;
}

function CaregiverView({ state, actions, busy, onMessage, webmcp }: { state: CareState; actions: CareActions; busy: boolean; onMessage(message: string): void; webmcp: WebMCPToolsState; }) {
  if (state.resident.scenario === "care_team_day") return <CareTeamDayView state={state} actions={actions} busy={busy} onMessage={onMessage} webmcp={webmcp} />;
  if (state.resident.scenario === "coverage_callout") return <CoverageCaregiverView state={state} actions={actions} busy={busy} onMessage={onMessage} story={<StoryPanel state={state} />} plan={<CarePlanPanel state={state} />} webmcp={webmcp} />;
  const openAction = state.actions.find((action) => action.status === "awaiting_human_approval");
  const openHandoff = state.handoffs.find((handoff) => handoff.status === "awaiting_human_approval");
  const residentCheckIn = state.resident_check_ins[0];
  const canPrepare = state.resident.scenario !== "missed_window" || residentCheckIn?.status === "responded";
  const days = Math.floor(state.inventory.units_remaining / state.inventory.daily_cadence);
  const [tab, setTab] = useState<CaregiverTab>(state.resident.scenario === "care_story" ? "story" : "now");
  useEffect(() => { setTab(state.resident.scenario === "care_story" ? "story" : "now"); }, [state.resident.scenario]);
  async function stage(channel: PreparedAction["channel"]) {
    try { const snapshot = await actions.getEvidenceSnapshot({ resident_id: state.resident.id, event_limit: 5 }); await actions.prepareAction({ resident_id: state.resident.id, channel, reason: state.resident.severity === "routine" ? "Routine caregiver check-in prepared from the visible care workspace." : `${state.events[0]?.summary ?? "Care signal requires review"}. Review the evidence before deciding what to do next.`, evidence_snapshot_id: snapshot.evidence_snapshot_id, idempotency_key: `manual-${state.resident.scenario}-${channel}-${state.evidence_version}` }); onMessage("Check-in prepared from current evidence. Review is required before anything else happens."); }
    catch (caught) { onMessage(caught instanceof Error ? caught.message : "Could not prepare that check-in."); }
  }
  async function stageHandoff(reviewType: CareTeamHandoff["review_type"]) {
    try {
      const snapshot = await actions.getEvidenceSnapshot({ resident_id: state.resident.id, event_limit: 8 });
      await actions.prepareCareTeamReview({ resident_id: state.resident.id, review_type: reviewType, period_hours: 72, reason: "Two monitoring-plan signals occurred within 72 hours: repeated medication-confirmation gaps and a later-than-baseline morning activity signal. Causes remain unresolved; qualified human review is requested.", evidence_snapshot_id: snapshot.evidence_snapshot_id, idempotency_key: `manual-${reviewType}-${state.evidence_version}` });
      onMessage("A structured nurse review was prepared from current evidence. Nothing was sent; caregiver approval is required.");
    } catch (caught) { onMessage(caught instanceof Error ? caught.message : "Could not prepare that handoff."); }
  }
  return <main className="caregiver-layout">
    <section className="caregiver-main"><div className="workspace-heading"><div><p className="eyebrow">Caregiver care cockpit · fictional resident</p><h1>{state.resident.scenario === "care_story" ? "Rose’s routine changed in context" : state.resident.severity === "routine" ? "Rose is on schedule" : state.resident.severity === "urgent" ? "A device safety hold needs review" : "Rose’s care routine needs attention"}</h1><p>{state.resident.scenario === "care_story" ? "Understand what changed for Rose across three days, what remains unknown, and which signed monitoring instruction applies." : "Evidence is separated from interpretation. You choose whether a prepared action should proceed."}</p></div><span className={`severity-badge ${state.resident.severity}`}><i /> {state.resident.severity}</span></div>
      <nav className="cockpit-tabs" aria-label="Caregiver views">{(["now", "story", "plan", "circle"] as CaregiverTab[]).map((item) => <button key={item} className={tab === item ? "active" : ""} type="button" onClick={() => setTab(item)}>{item === "plan" ? "Care plan" : item === "circle" ? "Care circle" : item[0].toUpperCase() + item.slice(1)}</button>)}</nav>
      {tab === "story" && <StoryPanel state={state} />}
      {tab === "plan" && <CarePlanPanel state={state} />}
      {tab === "circle" && <div className="circle-workspace"><CareCircle /><section className="handoff-explainer"><p className="eyebrow">Continuity between people</p><h2>Context travels; authority does not</h2><p>A prepared nurse review contains the signed plan, relevant evidence, Rose’s self-report, baseline comparisons, and unresolved questions. Operational shift handoffs remain assignment-bound.</p></section></div>}
      {tab === "now" && <><section className={`attention-panel ${state.resident.severity}`}><div className="attention-icon">{state.resident.severity === "routine" ? <CheckCircleIcon weight="fill" /> : <WarningCircleIcon weight="fill" />}</div><div><p className="eyebrow">Current signal</p><h2>{state.events[0]?.summary}</h2><p>{state.events[0]?.detail}</p><dl><div><dt>Observed</dt><dd>{timeLabel(state.events[0]?.occurred_at, state.resident.timezone)}</dd></div><div><dt>Source</dt><dd>{state.events[0]?.source}</dd></div><div><dt>Why we’re showing this</dt><dd>{state.resident.scenario === "care_story" ? "Rose’s care plan asks the care circle to review two confirmation gaps within 72 hours." : state.resident.scenario === "missed_window" ? "The plan asks the care circle to resolve a medication-confirmation gap without assuming ingestion." : state.resident.scenario === "device_offline" ? "Telemetry is stale; the local controller remains authoritative." : "A deterministic device rule produced this state."}</dd></div></dl></div></section><div className="care-metrics"><article><small>Confirmed in story</small><strong>{state.care_story.routine_confirmations}</strong><span>Routine windows</span></article><article><small>Supply forecast</small><strong>{days} days</strong><span>{days <= 10 ? "Review refill timing" : "Above reminder threshold"}</span></article><article><small>Device health</small><strong>{state.devices.filter((device) => device.status === "online").length}/{state.devices.length}</strong><span>Reporting normally</span></article><article><small>Human reviews</small><strong>{openAction || openHandoff ? "1" : "0"}</strong><span>Awaiting your decision</span></article></div><section className="evidence-panel"><div className="section-heading"><div><p className="eyebrow">Evidence chain of custody</p><h2>What the system actually knows</h2></div><span>Actor · class · trust boundary</span></div><ol>{state.events.slice(0, 7).map((event) => <li key={event.id}><span className={`event-dot ${event.severity}`} /><div><strong>{event.summary}</strong><p>{event.detail}</p><small>{timeLabel(event.observed_at, state.resident.timezone)} · {event.actor_type.replaceAll("_", " ")} · {event.evidence_type.replaceAll("_", " ")} · {event.source}</small></div></li>)}</ol></section></>}
    </section>
    <aside className="caregiver-rail"><section className="action-panel"><p className="eyebrow">Human-controlled next step</p>{state.resident.scenario === "care_story" ? <><h2>{openHandoff ? "One nurse review awaits approval" : "Prepare contextual review"}</h2><p>{openHandoff ? "Nothing has been transmitted. Review the visible evidence package." : "The signed plan’s repeated-gap threshold is present. Stage a nurse review without making a clinical conclusion."}</p><div className="action-buttons single"><button type="button" disabled={busy || Boolean(openAction || openHandoff)} onClick={() => void stageHandoff("nurse_review")}>Prepare nurse review</button></div></> : <><h2>{openAction ? "One check-in is ready to review" : canPrepare ? "Prepare a check-in" : "Waiting for Rose"}</h2><p>{openAction ? "Nothing has been sent. Open the review panel below to approve or dismiss it." : canPrepare ? "Choose a channel to stage from current evidence. A person must still review it." : "A bounded question is available on Rose's station. The agent cannot answer on her behalf or skip this evidence step."}</p><div className="action-buttons"><button type="button" disabled={busy || Boolean(openAction || openHandoff) || !canPrepare} onClick={() => void stage("call")}>Prepare call</button><button type="button" disabled={busy || Boolean(openAction || openHandoff) || !canPrepare} onClick={() => void stage("visit")}>Prepare visit</button></div></>}</section><section className="schedule-panel"><p className="eyebrow">Signed monitoring plan</p><h2>What requires review</h2><ul>{state.monitoring_plan.map((rule) => <li key={rule.id}><span><strong>{rule.title}</strong><small>{rule.threshold_description}</small></span></li>)}</ul></section><CareCircle /></aside>
  </main>;
}

const toolDetails: Record<string, [string, string]> = {
  get_care_overview: ["Status, workflow state, plan provenance, and safety boundaries", "read only"],
  get_medication_schedule: ["Medication windows without names, doses, or release authority", "read only"],
  get_inventory_forecast: ["Transparent unit-to-days calculation", "read only"],
  get_device_capabilities: ["Least-privilege adapter registry", "read only"],
  get_care_evidence: ["Compact chain of custody plus a current snapshot ID", "read only"],
  get_resident_context: ["Profile, personal baseline, preferences, and signed monitoring rules", "read only"],
  get_care_story: ["24/72-hour care brief relative to Rose’s documented baseline", "read only"],
  prepare_resident_check_in: ["Places a bounded question only Rose can answer", "resident gated"],
  prepare_caregiver_check_in: ["Requires current evidence and visible human approval", "approval gated"],
  request_device_health_snapshot: ["Fresh non-clinical diagnostic without device control", "diagnostic"],
  prepare_care_team_review: ["Snapshot-bound nurse review", "approval gated"],
  get_shift_context: ["Version-bound assignment, disruption, visit, and handoff state", "read only"],
  get_coverage_candidates: ["Eight explicit eligibility constraints with no opaque score", "read only"],
  prepare_shift_coverage: ["Eligible recommendation staged for scheduler approval", "approval gated"],
  get_changes_since_last_shift: ["Assignment-relevant changes since the caregiver last visited", "read only"],
  get_shift_brief: ["Person, plan, changes, unresolved items, and boundaries", "read only"],
  prepare_shift_handoff: ["Completed visit evidence staged for outgoing-caregiver approval", "approval gated"]
};

function SystemView({ state, webmcp }: { state: CareState; webmcp: WebMCPToolsState; }) {
  return <main className="system-layout"><section className="workspace-heading system-heading"><div><p className="eyebrow">WebMCP + device interoperability</p><h1>A safe control plane for connected care</h1><p>Versioned evidence, state-dependent agent capabilities, and adapters that can grow beyond the pillbox without transferring human authority.</p></div><span className={`tool-status ${webmcp.registered ? "ready" : "preview"}`}><RadioIcon weight="fill" /> {webMcpLabel(webmcp)}</span></section>
    <section className="boundary-flow" aria-label="Grapevine Care control boundaries"><article><span><WaveformIcon /></span><small>Observe</small><strong>Devices and people contribute evidence</strong><p>Every record carries actor, time, evidence class, trust boundary, and plan version.</p></article><i>→</i><article><span><ListChecksIcon /></span><small>Resolve uncertainty</small><strong>The agent requests—never invents—missing context</strong><p>Changed evidence invalidates old snapshots and forces re-observation.</p></article><i>→</i><article><span><ShieldCheckIcon /></span><small>Decide</small><strong>Authority stays with Rose, the device, and caregiver</strong><p>Human-only controls answer, release, and approve consequences.</p></article></section>
    <div className="system-grid"><section className="tool-registry"><div className="section-heading"><div><p className="eyebrow">State-dependent tools</p><h2>Capabilities available now</h2></div><span>{webmcp.count}/{webmcp.availableNames.length} registered</span></div><ul>{webmcp.availableNames.map((name, index) => <li key={name}><i>{index + 1}</i><span><code>{name}</code><small>{toolDetails[name]?.[0]}</small></span><b>{toolDetails[name]?.[1]}</b></li>)}</ul><p className="registry-note">The page removes preparation tools while Rose or a caregiver has a pending human decision. Capabilities follow workflow state instead of remaining a static bag.</p></section><section className="safety-contract"><p className="eyebrow">Non-negotiable boundaries</p><h2>What the AI cannot do</h2><ul>{state.safety_contract.ai_may_not.map((item) => <li key={item}><ShieldCheckIcon weight="fill" />{item}</li>)}</ul><div><strong>Signed plan provenance</strong><p>{state.care_plan.version} · {state.care_plan.authorized_by}, {state.care_plan.authorization_role} · device {state.care_plan.alignment}</p></div><div><strong>Emergency boundary</strong><p>{state.safety_contract.emergency_notice}</p></div></section></div>
    <section className="device-registry"><div className="section-heading"><div><p className="eyebrow">Capability adapter · grapevine.care.device.v1</p><h2>Connected equipment</h2></div><span>Future-ready</span></div><div className="device-grid">{state.devices.map((device) => <article key={device.id}><header><span className={`device-icon ${device.status}`}>{device.device_type === "medication_dispenser" ? <GaugeIcon /> : device.device_type === "fall_sensor" ? <RadioIcon /> : <HeartIcon />}</span><b className={device.status}><i />{device.status}</b></header><h3>{device.name}</h3><p>{device.device_type.replaceAll("_", " ")}</p><dl><div><dt>Battery</dt><dd>{device.battery_percent}%</dd></div><div><dt>Firmware</dt><dd>{device.firmware}</dd></div><div><dt>Last seen</dt><dd>{timeLabel(device.last_seen, state.resident.timezone)}</dd></div></dl><ul>{device.capabilities.map((capability) => <li key={capability}><code>{capability}</code></li>)}</ul></article>)}</div></section>
  </main>;
}

function ReviewDrawer({ action, handoff, actions, busy, onMessage }: { action?: PreparedAction; handoff?: CareTeamHandoff; actions: CareActions; busy: boolean; onMessage(message: string): void; }) {
  const item = handoff ?? action;
  if (!item) return null;
  async function resolve(resolution: "approved_in_demo" | "dismissed") { try { if (handoff) await actions.resolveCareTeamReview(handoff.id, resolution); else if (action) await actions.resolveAction(action.id, resolution); onMessage(resolution === "approved_in_demo" ? "Human approval recorded in the simulation. Nothing was transmitted externally." : "Prepared review dismissed."); } catch (caught) { onMessage(caught instanceof Error ? caught.message : "Could not review that action."); } }
  return <div className="review-scrim" role="presentation"><aside className="review-drawer" role="dialog" aria-modal="true" aria-labelledby="review-title"><header><div><p className="eyebrow">Human approval required</p><h2 id="review-title">{handoff ? `Review ${handoff.review_type === "nurse_review" ? "nurse review" : "shift handoff"}` : "Review caregiver check-in"}</h2></div><span><ShieldCheckIcon weight="fill" /> Locked</span></header><div className="review-summary"><small>{handoff ? `${handoff.period_hours}-hour contextual evidence package` : "Proposed channel"}</small><strong>{handoff ? handoff.review_type.replaceAll("_", " ") : action?.channel}</strong><p>{item.reason}</p></div><div className="review-facts"><p><CheckCircleIcon weight="fill" />Nothing has been sent or transmitted</p><p><CheckCircleIcon weight="fill" />No diagnosis or emergency determination was made</p><p><CheckCircleIcon weight="fill" />No medication or care plan was changed</p></div><div className="review-actions"><button type="button" className="secondary" disabled={busy} onClick={() => void resolve("dismissed")}>Dismiss</button><button type="button" disabled={busy} onClick={() => void resolve("approved_in_demo")}>Approve in demo</button></div><p className="demo-note">Approval records a simulated human decision only. This prototype has no clinical-record, messaging, calling, pharmacy, or emergency-service integration.</p></aside></div>;
}

export default function App() {
  const care = useCare();
  const [workspace, setWorkspace] = useState<Workspace>("caregiver");
  const webmcp = useWebMCPTools(care.actions, care.state, workspace);
  const [message, setMessage] = useState("");
  const pending = care.state?.actions.find((action) => action.status === "awaiting_human_approval");
  const pendingHandoff = care.state?.handoffs.find((handoff) => handoff.status === "awaiting_human_approval");
  const pageTitle = useMemo(() => ({ resident: "Rose’s station", caregiver: "Caregiver workspace", system: "How WebMCP works" })[workspace], [workspace]);
  useEffect(() => { document.title = `${pageTitle} · Grapevine Care`; }, [pageTitle]);

  if (!care.state) return <main className="loading-page"><span className="brand-mark"><LeafIcon weight="fill" /></span><h1>Preparing Rose’s care workspace</h1><p>{care.error ?? "Loading the fictional demo state…"}</p>{care.error && <button type="button" onClick={() => void care.actions.refresh()}>Try again</button>}</main>;
  const state = care.state;
  return <div className="care-shell"><header className="care-header"><Brand /><nav className="workspace-nav" aria-label="Choose workspace"><button className={workspace === "caregiver" ? "active" : ""} type="button" onClick={() => setWorkspace("caregiver")}><UsersThreeIcon />Caregiver workspace</button><button className={workspace === "resident" ? "active" : ""} type="button" onClick={() => setWorkspace("resident")}><HouseIcon />Rose’s station</button><button className={workspace === "system" ? "active" : ""} type="button" onClick={() => setWorkspace("system")}><GaugeIcon />How WebMCP works</button></nav>{(pending || pendingHandoff) && <button className="quiet-button" type="button" onClick={() => setWorkspace("caregiver")}><BellIcon />1 review waiting</button>}</header>
    <section className="demo-bar" aria-label="Demo scenario controls"><div><span><WaveformIcon />Judge demo</span><p>Fictional data · isolated browser run · full deterministic reset</p></div><div className="scenario-picker"><label htmlFor="demo-scenario"><span>Demo scenario</span><select id="demo-scenario" value={state.resident.scenario} disabled={care.busy} onChange={(event) => void care.actions.setScenario(event.target.value as Scenario)}>{scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.label}</option>)}</select></label><button className="reset-button" type="button" disabled={care.busy} onClick={() => void care.actions.setScenario(state.resident.scenario)} aria-label="Reset current demo"><ArrowClockwiseIcon /></button></div></section>
    {workspace === "resident" && <ResidentView state={state} actions={care.actions} busy={care.busy} onMessage={setMessage} />}{workspace === "caregiver" && <CaregiverView state={state} actions={care.actions} busy={care.busy} onMessage={setMessage} webmcp={webmcp} />}{workspace === "system" && <SystemView state={state} webmcp={webmcp} />}
    <footer className="care-footer"><Brand /><p>Safety-first WebMCP prototype · fictional demonstration · independent MIT-licensed healthcare adaptation</p><a href="https://github.com/Vyndir/grapevine-care" target="_blank" rel="noreferrer">Public source</a></footer>
    {(pending || pendingHandoff) && <ReviewDrawer action={pending} handoff={pendingHandoff} actions={care.actions} busy={care.busy} onMessage={setMessage} />}
    <div className="sr-live" aria-live="polite" aria-atomic="true">{message || care.error}</div>
  </div>;
}
