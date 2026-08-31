import {
  ArrowRightIcon,
  BuildingsIcon,
  CheckCircleIcon,
  HouseIcon,
  ListChecksIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PackageIcon,
  ShieldCheckIcon,
  WarningIcon,
  WaveformIcon
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { responseNeeds, type ResponseNeed, type ResponsePartner } from "./responseSchemas";
import { useResponse } from "./useResponse";
import { useResponseWebMCPTools } from "./useResponseWebMCPTools";

function Sidebar({ toolCount }: { toolCount: number }) {
  return <aside className="app-sidebar">
    <div className="brand-block">
      <span className="brand-mark"><WaveformIcon weight="bold" /></span>
      <span><strong>Project Grapevine</strong><small>Relief intelligence</small></span>
    </div>
    <p className="nav-group-label">Demo 1 · Live ground truth</p>
    <nav className="primary-nav" aria-label="Live ground truth navigation">
      <a href="/"><HouseIcon /><span>Operations</span></a>
      <a href="/drive"><ListChecksIcon /><span>Field inbox</span></a>
    </nav>
    <p className="nav-group-label">Demo 2 · Resource coordination</p>
    <nav className="primary-nav" aria-label="Resource coordination navigation">
      <a className="active" href="/response"><BuildingsIcon weight="fill" /><span>Partner directory</span></a>
    </nav>
    <div className="sidebar-status">
      <span className="simulation-label">Fictional simulation</span>
      <p><ShieldCheckIcon weight="fill" /> {toolCount} resource tools ready</p>
    </div>
  </aside>;
}

function PartnerCard({ partner, selected, onSelect }: {
  partner: ResponsePartner;
  selected: boolean;
  onSelect: (partner: ResponsePartner) => void;
}) {
  return <button type="button" className={`partner-card ${selected ? "selected" : ""}`} onClick={() => onSelect(partner)} aria-pressed={selected}>
    <span className="partner-select">{selected ? <CheckCircleIcon weight="fill" /> : <span />}</span>
    <span className="partner-copy">
      <span className="partner-title"><strong>{partner.name}</strong>{partner.local_led && <em>Locally led</em>}</span>
      <span>{partner.summary}</span>
      <span className="partner-tags">{partner.capabilities.map((capability) => <i key={capability}>{capability}</i>)}</span>
    </span>
    <span className="partner-evidence">
      <strong>{partner.response_status}</strong>
      <span>{partner.verification_status.replace("_", " ")}</span>
      <small>{partner.verification_note}</small>
    </span>
  </button>;
}

export default function ResponseApp() {
  const response = useResponse();
  const tools = useResponseWebMCPTools(response.actions);
  const [need, setNeed] = useState<ResponseNeed>("water");
  const [area, setArea] = useState("Watauga Relief Corridor");
  const [localOnly, setLocalOnly] = useState(false);
  const [matches, setMatches] = useState<ResponsePartner[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const bundle = response.bundle;
  const currentShortlist = bundle?.shortlists[0] ?? null;
  const currentRequest = bundle?.requests[0] ?? null;
  const fieldVerification = bundle?.field_verification ?? null;
  const routeCleared = fieldVerification?.answer_value === "passable";
  const visiblePartners = matches.length ? matches : bundle?.partners ?? [];
  const selectedPartners = useMemo(() => visiblePartners.filter((partner) => selectedIds.includes(partner.id)), [visiblePartners, selectedIds]);

  useEffect(() => {
    if (!bundle || selectedIds.length) return;
    setSelectedIds(bundle.partners.filter((partner) => partner.capabilities.includes("water") && partner.response_status === "active").slice(0, 2).map((partner) => partner.id));
  }, [bundle, selectedIds.length]);

  async function find() {
    setBusy(true);
    response.setError(null);
    try {
      const result = await response.actions.findPartners(need, area, localOnly);
      setMatches(result.partners);
      setSelectedIds(result.partners.slice(0, 2).map((partner) => partner.id));
    } catch (caught) {
      response.setError(caught instanceof Error ? caught.message : "Partner search failed.");
    } finally { setBusy(false); }
  }

  async function saveShortlist() {
    if (!selectedPartners.length) return;
    setBusy(true);
    try {
      await response.actions.createShortlist({
        title: `${area} ${need} response`,
        need,
        area,
        partner_ids: selectedPartners.map((partner) => partner.id),
        rationale: "Selected for matching capability, active status, operating area, and transparent verification evidence."
      });
    } finally { setBusy(false); }
  }

  async function prepare() {
    if (!currentShortlist) return;
    setBusy(true);
    try {
      await response.actions.prepareCoordination({
        shortlist_id: currentShortlist.id,
        objective: bundle?.incident.operational_need ?? "Coordinate relief supplies.",
        available_resources: "Two truckloads of bottled water and 40 temporary shelter kits at the Boone Staging Hub."
      });
    } finally { setBusy(false); }
  }

  if (!bundle) return <div className="dashboard-shell"><Sidebar toolCount={tools.count} /><main className="dashboard-main"><p>Loading response directory...</p></main></div>;

  return <div className="dashboard-shell response-shell">
    <Sidebar toolCount={tools.count} />
    <main className="dashboard-main response-main">
      <header className="operation-header response-header">
        <div><p className="eyebrow">Demo 2 · From crisis page to response plan</p><h1>Resource Coordination</h1><p className="deck">Find the right partner, then verify the route before dispatch.</p></div>
        <span className="demo-badge"><ShieldCheckIcon weight="fill" /> Simulated data</span>
      </header>
      {response.error && <p className="error" role="alert">{response.error}</p>}

      <section className="incident-strip">
        <div><span className="incident-icon"><WarningIcon weight="fill" /></span><span><small>Active coordination scenario</small><strong>{bundle.incident.name}</strong></span></div>
        <p>{bundle.incident.operational_need}</p>
        <span className="incident-uncertainty"><WarningIcon /> Route status needs live verification</span>
      </section>

      <section className="response-layout">
        <div className="directory-panel">
          <div className="response-section-heading"><div><p className="eyebrow">Structured directory</p><h2>Find response partners</h2></div><span>{visiblePartners.length} available</span></div>
          <div className="partner-filters">
            <label>Need<select value={need} onChange={(event) => setNeed(event.target.value as ResponseNeed)}>{responseNeeds.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label>Area<input value={area} onChange={(event) => setArea(event.target.value)} /></label>
            <label className="local-filter"><input type="checkbox" checked={localOnly} onChange={(event) => setLocalOnly(event.target.checked)} /> Locally led only</label>
            <button type="button" onClick={() => void find()} disabled={busy}><MagnifyingGlassIcon /> Find partners</button>
          </div>
          <div className="partner-list">
            {visiblePartners.map((partner) => <PartnerCard key={partner.id} partner={partner} selected={selectedIds.includes(partner.id)} onSelect={(item) => setSelectedIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} />)}
          </div>
          <div className="directory-footer"><span>{selectedPartners.length} selected</span><button type="button" disabled={busy || !selectedPartners.length} onClick={() => void saveShortlist()}>Save shortlist <ArrowRightIcon /></button></div>
        </div>

        <aside className="response-plan-panel">
          <div className="response-section-heading"><div><p className="eyebrow">Agent workspace</p><h2>Response plan</h2></div></div>
          <section className="plan-step complete">
            <span>1</span><div><small>Incident brief</small><strong>Need and area identified</strong><p>{bundle.incident.published_status}</p></div>
          </section>
          <section className={`plan-step ${currentShortlist ? "complete" : ""}`}>
            <span>2</span><div><small>Partner match</small><strong>{currentShortlist?.title ?? "Shortlist not saved"}</strong>{currentShortlist && <p>{currentShortlist.partners?.map((partner) => partner.name).join(" + ")}</p>}</div>
          </section>
          <section className={`plan-step ${currentRequest ? "warning" : ""}`}>
            <span>3</span><div><small>Coordination request</small><strong>{currentRequest ? "Prepared for approval" : "Not prepared"}</strong>{currentShortlist && !currentRequest && <button type="button" disabled={busy} onClick={() => void prepare()}><PackageIcon /> Prepare request</button>}{currentRequest && <p>{currentRequest.available_resources}</p>}</div>
          </section>
          <section className={`plan-step verification ${fieldVerification ? (routeCleared ? "complete" : "warning") : currentRequest ? "active" : ""}`}>
            <span>4</span><div><small>Live ground truth</small><strong>{fieldVerification ? `Route reported ${fieldVerification.answer_value}` : "Verify before dispatch"}</strong><p>{fieldVerification ? `${fieldVerification.source_name}: ${fieldVerification.answer_note || "Structured field report received."}` : bundle.incident.uncertainty}</p><a href="/?handoff=response-plan"><MapPinIcon weight="fill" /> {fieldVerification ? "Review field verification" : "Open field verification"} <ArrowRightIcon /></a></div>
          </section>
          {currentRequest?.status === "pending_approval" && <div className="coordination-approval"><ShieldCheckIcon weight="fill" /><div><strong>{routeCleared ? "Coordinator approval required" : "Dispatch approval locked"}</strong><p>{routeCleared ? "The route is verified. No partner is contacted until you approve." : "A current passable field report is required before dispatch approval."}</p></div><button type="button" disabled={!routeCleared} onClick={() => void response.actions.approveCoordination(currentRequest.id)}>Approve plan</button></div>}
          {currentRequest?.status === "approved" && <div className="coordination-approved"><CheckCircleIcon weight="fill" /> Plan approved; field verification is still required before dispatch.</div>}
        </aside>
      </section>
    </main>
  </div>;
}
