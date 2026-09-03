import { ArrowRightIcon, CheckCircleIcon, ClockCountdownIcon, RadioIcon, ShieldCheckIcon, UsersThreeIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import type { CareState, TeamResident } from "./schemas";
import type { CareActions } from "./useCare";
import type { WebMCPToolsState } from "./useWebMCPTools";

function formatClock(value: string) {
  return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
}

const statusLabel: Record<TeamResident["status"], string> = {
  routine: "On track",
  attention: "Needs attention",
  waiting_on_human: "Waiting on human",
  resolved: "Resolved"
};

export function CareTeamDayView({ state, actions, busy, webmcp, onMessage }: { state: CareState; actions: CareActions; busy: boolean; webmcp: WebMCPToolsState; onMessage(message: string): void; }) {
  const day = state.care_team_day!;
  const [selectedId, setSelectedId] = useState<TeamResident["id"]>(day.attention_queue.find((item) => item.state === "attention_now")?.resident_id ?? "evelyn-demo");
  const selected = day.residents.find((resident) => resident.id === selectedId) ?? day.residents[0];
  const selectedAttention = day.attention_queue.find((item) => item.resident_id === selected.id);
  const packet = day.orientation_packets.find((item) => item.resident_id === "walter-demo");
  const canPrepareWalter = day.step >= 2 && !packet;

  const prepareWalter = async () => {
    await actions.prepareAssignmentOrientation({ resident_ref: "Walter", caregiver_id: "caregiver-elena", reason: "Elena needs Walter-specific orientation and Care Plan v2 acknowledgement before the 1:00 PM assignment.", idempotency_key: "ui-walter-orientation-v2" });
    onMessage("Walter’s orientation packet is ready for Elena. Nothing was marked complete.");
  };

  return <main className="team-day-layout">
    <section className="team-day-hero">
      <div><p className="eyebrow">Care Team Day · {formatClock(state.resident.simulated_time)}</p><h1>Run the day without dropping the context.</h1><p>One calm operational view across three residents, changing caregivers, readiness requirements, and evidence gaps.</p></div>
      <div className="team-day-controls"><details className="agent-tool-status"><summary><RadioIcon weight="fill" /> Agent tools · {webmcp.registered ? `${webmcp.count} active` : `${webmcp.availableNames.length} available`}</summary><div><strong>Current WebMCP capabilities</strong><ul>{webmcp.availableNames.map((name) => <li key={name}><code>{name}</code></li>)}</ul><p>The tool set changes with the work. Human acknowledgement never becomes an agent capability.</p></div></details><button type="button" disabled={busy || !day.next_event_label} onClick={() => void actions.advanceCareTeamDay()}>{day.next_event_label ? <>Advance simulated time <ArrowRightIcon /></> : "Day complete"}</button></div>
    </section>

    <section className="team-day-grid">
      <aside className="team-rail" aria-label="Care team residents"><header><UsersThreeIcon weight="fill" /><div><span>Today</span><strong>3 residents</strong></div></header>{day.residents.map((resident) => <button type="button" key={resident.id} className={selected.id === resident.id ? "active" : ""} onClick={() => setSelectedId(resident.id)}><i className={resident.status} /> <span><strong>{resident.display_name}</strong><small>{resident.headline}</small></span><em>{statusLabel[resident.status]}</em></button>)}<section className="care-team-roster" aria-label="Care team on duty"><header><span>Care team on duty</span><strong>People behind the plan</strong></header><ul><li><b>MC</b><span><strong>Maya Thompson</strong><small>Rose · original evening caregiver</small></span></li><li><b>JL</b><span><strong>Jordan Lee</strong><small>Rose · qualified backup</small></span></li><li><b>LR</b><span><strong>Luis Rivera</strong><small>Evelyn · morning caregiver</small></span></li><li><b>EB</b><span><strong>Elena Brooks</strong><small>Walter · awaiting orientation</small></span></li></ul></section></aside>

      <section className="attention-workspace">
        <header className="attention-heading"><div><p className="eyebrow">Operational attention queue</p><h2>What needs the coordinator’s attention</h2></div><span><ClockCountdownIcon /> Ordered by policy deadlines—not medical severity</span></header>
        <div className="attention-list">{day.attention_queue.map((item) => <button type="button" key={item.id} className={`${item.state} ${selected.id === item.resident_id ? "active" : ""}`} onClick={() => setSelectedId(item.resident_id)}><span className="attention-state">{item.state === "resolved" ? <CheckCircleIcon weight="fill" /> : <WarningCircleIcon weight="fill" />}{item.state.replaceAll("_", " ")}</span><strong>{item.resident_name}</strong><h3>{item.attention_reason}</h3><p>{item.deadline}</p><small>{item.human_owner}</small></button>)}</div>

        <article className="resident-context-card">
          <header><div><p className="eyebrow">Selected resident context</p><h2>{selected.display_name}, {selected.age}</h2><p>{selected.support_setting}</p></div><span className={selected.status}>{statusLabel[selected.status]}</span></header>
          <div className="resident-context-columns"><section><h3>What the care team supplied</h3><ul>{selected.context.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3>How to support {selected.display_name}</h3><ul>{selected.preferences.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3>Current operational evidence</h3>{selectedAttention ? <><p><strong>Known</strong></p><ul>{selectedAttention.known.map((item) => <li key={item}>{item}</li>)}</ul><p><strong>Unknown</strong></p><ul>{selectedAttention.unknown.length ? selectedAttention.unknown.map((item) => <li key={item}>{item}</li>) : <li>No open operational unknowns in this simulation.</li>}</ul></> : <p>No active attention item.</p>}</section></div>
          {selected.id === "walter-demo" && canPrepareWalter && <button className="primary-inline" type="button" disabled={busy} onClick={() => void prepareWalter()}>Prepare Walter orientation for Elena</button>}
        </article>

        {packet && <article className={`orientation-card ${packet.status}`}><header><div><p className="eyebrow">Human-gated assignment readiness</p><h2>Walter orientation · Care Plan {packet.care_plan_version}</h2></div><span>{packet.status === "acknowledged" ? <><CheckCircleIcon weight="fill" /> Acknowledged by Elena</> : <><ShieldCheckIcon weight="fill" /> Awaiting Elena</>}</span></header><div>{packet.sections.map((section) => <section key={section.title}><strong>{section.title}</strong><p>{section.detail}</p></section>)}</div>{packet.status !== "acknowledged" && <button type="button" disabled={busy} onClick={() => void actions.acknowledgeAssignmentOrientation(packet.id)}>I’m Elena · I reviewed and acknowledge</button>}<footer>The agent may prepare this packet. Only the caregiver can acknowledge it.</footer></article>}
      </section>
    </section>

    <section className="day-timeline" aria-label="Compressed care-team day"><header><div><p className="eyebrow">Compressed simulation</p><h2>A workday in minutes</h2></div><span>{day.step_label}</span></header><ol>{day.timeline.map((item) => <li key={item.step} className={item.step < day.step ? "complete" : item.step === day.step ? "current" : ""}><i>{item.step < day.step ? "✓" : item.step + 1}</i><strong>{item.time}</strong><span>{item.label}</span></li>)}</ol></section>
  </main>;
}
