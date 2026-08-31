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
import type { CareState, Dose, PreparedAction, Scenario } from "./schemas";

type Workspace = "resident" | "caregiver" | "system";

const scenarios: Array<{ id: Scenario; label: string }> = [
  { id: "on_schedule", label: "On schedule" },
  { id: "missed_window", label: "Missed window" },
  { id: "door_fault", label: "Door fault" },
  { id: "device_offline", label: "Device offline" }
];

function timeLabel(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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
  return <a className="brand" href="/" aria-label="Grapevine Care home"><span className="brand-mark"><LeafIcon weight="fill" /></span><span><strong>Grapevine Care</strong><small>Medication support, with people in control</small></span></a>;
}

function ResidentView({ state, actions, busy, onMessage }: { state: CareState; actions: CareActions; busy: boolean; onMessage(message: string): void; }) {
  const current = state.doses.find((dose) => ["ready", "missed", "blocked"].includes(dose.status));
  const completed = state.doses.filter((dose) => dose.status === "confirmed").length;
  const pillbox = state.devices.find((device) => device.device_type === "medication_dispenser")!;
  const canConfirm = current?.status === "ready" && pillbox.status === "online" && pillbox.door_state === "closed";
  const message = current?.status === "missed" ? "This window has closed. The compartment remains locked. Your care circle can review what happened." : current?.status === "blocked" ? "The care station has paused release because a safety check needs attention." : current ? "The dispenser has checked the care plan and safety lock. It will release only this scheduled compartment." : "All scheduled windows so far have been confirmed.";

  async function confirm() {
    if (!current || !canConfirm) return;
    try { await actions.confirmDose(current.id); onMessage("Dose confirmation recorded. One compartment was released in this simulation."); }
    catch (caught) { onMessage(caught instanceof Error ? caught.message : "The device could not confirm that dose."); }
  }

  return <main className="care-layout">
    <section className="resident-workspace" aria-labelledby="today-title">
      <div className="welcome-row"><div><p className="date-line">Monday, August 31 · {timeLabel(state.resident.simulated_time)}</p><h1 id="today-title">Good morning, {state.resident.display_name}.</h1><p>{state.resident.severity === "routine" ? "Your care plan is on schedule." : "Your care station has an update for you."} {current?.status === "ready" ? "One medicine is ready during the current window." : "Nothing unexpected will be released."}</p></div><span className="verified-pill"><ShieldCheckIcon weight="fill" /> Plan verified</span></div>
      <article className={`dose-card ${state.resident.severity}`}>
        <header><div><p><ClockIcon /> {current?.status === "ready" ? `Available now · ${current.window_label}` : current ? doseStatusLabel(current.status) : "Schedule complete"}</p><h2>{current?.label ?? "Today’s schedule"}</h2><span>{message}</span></div>{current && <aside><small>Compartment</small><strong>{current.compartment}</strong></aside>}</header>
        <div className="dose-body"><div className="dose-evidence"><div className="evidence-title"><span>{state.resident.severity === "routine" ? <CheckCircleIcon weight="fill" /> : <WarningCircleIcon weight="fill" />}</span><div><strong>{canConfirm ? "Safety check complete" : current?.status === "missed" ? "Window safely closed" : current ? "Safety hold active" : "Schedule recorded"}</strong><p>{pillbox.status === "offline" ? "Device telemetry is offline · local schedule remains active · no remote release" : pillbox.door_state === "open" ? "Door sensor open · all compartments locked · caregiver evidence available" : canConfirm ? "Correct time window · no duplicate release · device door closed" : "Compartment secured · no autonomous action · care circle can review"}</p></div></div><div className="explanation"><strong>What happens next</strong><p>{canConfirm ? `${state.resident.display_name} confirms locally. The device—not the AI—enforces the care plan and records the result for her care circle.` : "The AI may summarize the evidence, but it cannot release medication, alter the plan, or decide that an emergency has occurred."}</p></div></div>
          <button className="verify-button" type="button" disabled={!canConfirm || busy} onClick={() => void confirm()}><FingerprintIcon /><strong>{canConfirm ? "Hold to verify" : "Compartment secured"}</strong><small>{canConfirm ? "Release scheduled dose" : "Device rules remain in control"}</small></button></div>
      </article>
      <div className="summary-grid"><article><small>Next check-in</small><strong>{state.doses.find((dose) => dose.status === "upcoming")?.scheduled_time === "12:00" ? "12:00 PM" : "8:00 PM"}</strong><span>Care plan</span></article><article><small>Supply remaining</small><strong>{Math.floor(state.inventory.units_remaining / state.inventory.daily_cadence)} days</strong><span>{state.inventory.units_remaining} units · refill watch</span></article><article><small>Last confirmed</small><strong>{state.events.find((event) => event.event_type === "dose_confirmed") ? "Yesterday · 8:07 PM" : "No recent record"}</strong><span>Local attestation</span></article></div>
    </section>
    <aside className="status-rail" aria-label="Care status"><section className="rail-panel"><div className="rail-heading"><span><small>Today</small><h2>Medication timeline</h2></span><strong>{completed} of {state.doses.length}</strong></div><ol>{state.doses.map((dose, index) => <li className={dose.status} key={dose.id}><i>{dose.status === "confirmed" ? "✓" : index + 1}</i><strong>{dose.scheduled_time === "08:00" ? "8:00 AM" : dose.scheduled_time === "12:00" ? "12:00 PM" : "8:00 PM"}</strong><span>{doseStatusLabel(dose.status)}</span></li>)}</ol></section><CareCircle /><p className="demo-note">Fictional demonstration only. Grapevine Care does not diagnose, prescribe, or replace clinical judgment or emergency services.</p></aside>
  </main>;
}

function CareCircle() {
  return <section className="rail-panel"><div className="circle-heading"><span><HeartIcon weight="fill" /></span><div><small>Connected</small><h2>Rose’s care circle</h2></div></div><ul className="care-circle"><li><i>MG</i><span><strong>Miles</strong><small>Primary caregiver</small></span><b /></li><li><i>RN</i><span><strong>Nurse Ava</strong><small>Care team</small></span><b /></li></ul></section>;
}

function CaregiverView({ state, actions, busy, onMessage }: { state: CareState; actions: CareActions; busy: boolean; onMessage(message: string): void; }) {
  const openAction = state.actions.find((action) => action.status === "awaiting_human_approval");
  const days = Math.floor(state.inventory.units_remaining / state.inventory.daily_cadence);
  async function stage(channel: PreparedAction["channel"]) {
    try { await actions.prepareAction({ resident_id: state.resident.id, channel, reason: state.resident.severity === "routine" ? "Routine caregiver check-in prepared from the visible care workspace." : `${state.events[0]?.summary ?? "Care signal requires review"}. Review the evidence before deciding what to do next.`, idempotency_key: `manual-${state.resident.scenario}-${channel}` }); onMessage("Check-in prepared. Review is required before anything else happens."); }
    catch (caught) { onMessage(caught instanceof Error ? caught.message : "Could not prepare that check-in."); }
  }
  return <main className="caregiver-layout">
    <section className="caregiver-main"><div className="workspace-heading"><div><p className="eyebrow">Caregiver workspace · fictional resident</p><h1>{state.resident.severity === "routine" ? "Rose is on schedule" : state.resident.severity === "urgent" ? "A device safety hold needs review" : "Rose’s care routine needs attention"}</h1><p>Evidence is separated from interpretation. You choose whether a prepared action should proceed.</p></div><span className={`severity-badge ${state.resident.severity}`}><i /> {state.resident.severity}</span></div>
      <section className={`attention-panel ${state.resident.severity}`}><div className="attention-icon">{state.resident.severity === "routine" ? <CheckCircleIcon weight="fill" /> : <WarningCircleIcon weight="fill" />}</div><div><p className="eyebrow">Current signal</p><h2>{state.events[0]?.summary}</h2><p>{state.events[0]?.detail}</p><dl><div><dt>Observed</dt><dd>{timeLabel(state.events[0]?.occurred_at)}</dd></div><div><dt>Source</dt><dd>{state.events[0]?.source}</dd></div><div><dt>Meaning</dt><dd>{state.resident.scenario === "missed_window" ? "Removal was not confirmed; ingestion and welfare remain unknown." : state.resident.scenario === "device_offline" ? "Telemetry is stale; the local controller remains authoritative." : "A deterministic device rule produced this state."}</dd></div></dl></div></section>
      <div className="care-metrics"><article><small>Adherence today</small><strong>{state.doses.filter((dose) => dose.status === "confirmed").length}/{state.doses.length}</strong><span>Confirmed windows</span></article><article><small>Supply forecast</small><strong>{days} days</strong><span>{days <= 10 ? "Review refill timing" : "Above reminder threshold"}</span></article><article><small>Device health</small><strong>{state.devices.filter((device) => device.status === "online").length}/{state.devices.length}</strong><span>Reporting normally</span></article><article><small>Prepared actions</small><strong>{openAction ? "1" : "0"}</strong><span>Awaiting your review</span></article></div>
      <section className="evidence-panel"><div className="section-heading"><div><p className="eyebrow">Evidence trail</p><h2>What the system actually knows</h2></div><span>Provenance on every event</span></div><ol>{state.events.slice(0, 7).map((event) => <li key={event.id}><span className={`event-dot ${event.severity}`} /><div><strong>{event.summary}</strong><p>{event.detail}</p><small>{timeLabel(event.occurred_at)} · {event.source}</small></div></li>)}</ol></section>
    </section>
    <aside className="caregiver-rail"><section className="action-panel"><p className="eyebrow">Human-controlled next step</p><h2>{openAction ? "One check-in is ready to review" : "Prepare a check-in"}</h2><p>{openAction ? "Nothing has been sent. Open the review panel below to approve or dismiss it." : "Choose a channel to stage. The action will remain locked until a person reviews it."}</p><div className="action-buttons"><button type="button" disabled={busy || Boolean(openAction)} onClick={() => void stage("call")}>Prepare call</button><button type="button" disabled={busy || Boolean(openAction)} onClick={() => void stage("visit")}>Prepare visit</button></div></section><section className="schedule-panel"><p className="eyebrow">Today’s care plan</p><h2>Medication windows</h2><ul>{state.doses.map((dose) => <li key={dose.id}><span><strong>{dose.label}</strong><small>{dose.window_label}</small></span><b className={dose.status}>{doseStatusLabel(dose.status)}</b></li>)}</ul></section><CareCircle /></aside>
  </main>;
}

const tools = [
  ["get_care_overview", "Status, active window, device health, and safety boundaries"],
  ["get_medication_schedule", "Read-only windows with no medication release capability"],
  ["get_inventory_forecast", "Transparent unit-to-days calculation and refill reminder"],
  ["get_device_capabilities", "Least-privilege adapter registry for future equipment"],
  ["get_care_evidence", "Bounded event history with provenance and uncertainty"],
  ["prepare_caregiver_check_in", "Stages an action; a person must approve it"]
];

function SystemView({ state, webmcp }: { state: CareState; webmcp: WebMCPToolsState; }) {
  return <main className="system-layout"><section className="workspace-heading system-heading"><div><p className="eyebrow">WebMCP + device interoperability</p><h1>A safe control plane for connected care</h1><p>One shared evidence model, six bounded agent tools, and adapters that can grow beyond the pillbox.</p></div><span className={`tool-status ${webmcp.registered ? "ready" : "preview"}`}><RadioIcon weight="fill" /> {webMcpLabel(webmcp)}</span></section>
    <section className="boundary-flow" aria-label="Grapevine Care control boundaries"><article><span><WaveformIcon /></span><small>Observe</small><strong>Devices emit bounded signals</strong><p>Schedule state, door state, inventory count, and timestamped events.</p></article><i>→</i><article><span><ListChecksIcon /></span><small>Interpret</small><strong>WebMCP structures evidence</strong><p>Agents read provenance and uncertainty instead of scraping the interface.</p></article><i>→</i><article><span><ShieldCheckIcon /></span><small>Decide</small><strong>People approve consequences</strong><p>The device enforces release; caregivers approve staged outreach.</p></article></section>
    <div className="system-grid"><section className="tool-registry"><div className="section-heading"><div><p className="eyebrow">Page-scoped tools</p><h2>Agent contract</h2></div><span>{webmcp.count}/6 registered</span></div><ul>{tools.map(([name, detail], index) => <li key={name}><i>{index + 1}</i><span><code>{name}</code><small>{detail}</small></span><b>{index < 5 ? "read only" : "approval gated"}</b></li>)}</ul></section><section className="safety-contract"><p className="eyebrow">Non-negotiable boundaries</p><h2>What the AI cannot do</h2><ul>{state.safety_contract.ai_may_not.map((item) => <li key={item}><ShieldCheckIcon weight="fill" />{item}</li>)}</ul><div><strong>Emergency boundary</strong><p>{state.safety_contract.emergency_notice}</p></div></section></div>
    <section className="device-registry"><div className="section-heading"><div><p className="eyebrow">Capability adapter · grapevine.care.device.v1</p><h2>Connected equipment</h2></div><span>Future-ready</span></div><div className="device-grid">{state.devices.map((device) => <article key={device.id}><header><span className={`device-icon ${device.status}`}>{device.device_type === "medication_dispenser" ? <GaugeIcon /> : device.device_type === "fall_sensor" ? <RadioIcon /> : <HeartIcon />}</span><b className={device.status}><i />{device.status}</b></header><h3>{device.name}</h3><p>{device.device_type.replaceAll("_", " ")}</p><dl><div><dt>Battery</dt><dd>{device.battery_percent}%</dd></div><div><dt>Firmware</dt><dd>{device.firmware}</dd></div><div><dt>Last seen</dt><dd>{timeLabel(device.last_seen)}</dd></div></dl><ul>{device.capabilities.map((capability) => <li key={capability}><code>{capability}</code></li>)}</ul></article>)}</div></section>
  </main>;
}

function ReviewDrawer({ action, actions, busy, onMessage }: { action: PreparedAction; actions: CareActions; busy: boolean; onMessage(message: string): void; }) {
  async function resolve(resolution: "approved_in_demo" | "dismissed") { try { await actions.resolveAction(action.id, resolution); onMessage(resolution === "approved_in_demo" ? "Human approval recorded in the simulation. No external communication was sent." : "Prepared action dismissed."); } catch (caught) { onMessage(caught instanceof Error ? caught.message : "Could not review that action."); } }
  return <div className="review-scrim" role="presentation"><aside className="review-drawer" role="dialog" aria-modal="true" aria-labelledby="review-title"><header><div><p className="eyebrow">Human approval required</p><h2 id="review-title">Review caregiver check-in</h2></div><span><ShieldCheckIcon weight="fill" /> Locked</span></header><div className="review-summary"><small>Proposed channel</small><strong>{action.channel}</strong><p>{action.reason}</p></div><div className="review-facts"><p><CheckCircleIcon weight="fill" />No one has been contacted</p><p><CheckCircleIcon weight="fill" />No emergency determination was made</p><p><CheckCircleIcon weight="fill" />No medication or care plan was changed</p></div><div className="review-actions"><button type="button" className="secondary" disabled={busy} onClick={() => void resolve("dismissed")}>Dismiss</button><button type="button" disabled={busy} onClick={() => void resolve("approved_in_demo")}>Approve in demo</button></div><p className="demo-note">Approval records a simulated decision only. This prototype has no messaging, calling, dispatch, pharmacy, or emergency-service integration.</p></aside></div>;
}

export default function App() {
  const care = useCare();
  const webmcp = useWebMCPTools(care.actions);
  const [workspace, setWorkspace] = useState<Workspace>("resident");
  const [message, setMessage] = useState("");
  const pending = care.state?.actions.find((action) => action.status === "awaiting_human_approval");
  const pageTitle = useMemo(() => ({ resident: "Rose’s station", caregiver: "Caregiver workspace", system: "Devices & WebMCP" })[workspace], [workspace]);
  useEffect(() => { document.title = `${pageTitle} · Grapevine Care`; }, [pageTitle]);

  if (!care.state) return <main className="loading-page"><span className="brand-mark"><LeafIcon weight="fill" /></span><h1>Preparing Rose’s care workspace</h1><p>{care.error ?? "Loading the fictional demo state…"}</p>{care.error && <button type="button" onClick={() => void care.actions.refresh()}>Try again</button>}</main>;
  const state = care.state;
  return <div className="care-shell"><header className="care-header"><Brand /><nav className="workspace-nav" aria-label="Choose workspace"><button className={workspace === "resident" ? "active" : ""} type="button" onClick={() => setWorkspace("resident")}><HouseIcon />Resident</button><button className={workspace === "caregiver" ? "active" : ""} type="button" onClick={() => setWorkspace("caregiver")}><UsersThreeIcon />Caregiver</button><button className={workspace === "system" ? "active" : ""} type="button" onClick={() => setWorkspace("system")}><GaugeIcon />Devices & MCP</button></nav><button className="quiet-button" type="button" onClick={() => setWorkspace("caregiver")}><BellIcon />{pending ? "1 action to review" : "No new alerts"}</button></header>
    <section className="demo-bar" aria-label="Demo scenario controls"><div><span><WaveformIcon />Judge demo</span><p>Fictional data · deterministic outcomes · reset anytime</p></div><div className="scenario-controls">{scenarios.map((scenario) => <button key={scenario.id} className={state.resident.scenario === scenario.id ? "active" : ""} type="button" disabled={care.busy} onClick={() => void care.actions.setScenario(scenario.id)}>{scenario.label}</button>)}<button className="reset-button" type="button" disabled={care.busy} onClick={() => void care.actions.setScenario("on_schedule")} aria-label="Reset demo"><ArrowClockwiseIcon /></button></div></section>
    {workspace === "resident" && <ResidentView state={state} actions={care.actions} busy={care.busy} onMessage={setMessage} />}{workspace === "caregiver" && <CaregiverView state={state} actions={care.actions} busy={care.busy} onMessage={setMessage} />}{workspace === "system" && <SystemView state={state} webmcp={webmcp} />}
    <footer className="care-footer"><Brand /><p>Safety-first WebMCP prototype · fictional demonstration · MIT licensed adaptation of Project Grapevine</p><a href="https://github.com/samueltate/project-grapevine" target="_blank" rel="noreferrer">Source foundation</a></footer>
    {pending && <ReviewDrawer action={pending} actions={care.actions} busy={care.busy} onMessage={setMessage} />}
    <div className="sr-live" aria-live="polite" aria-atomic="true">{message || care.error}</div>
  </div>;
}
