import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CareEvent, CareState, CareTeamDay, CareTeamHandoff, CoverageCandidate, CoverageProposal, OrientationPacket, PreparedAction, ResidentCheckIn, ResidentResponseCode, Scenario, ShiftHandoff } from "./schemas";

const demoRunStorageKey = "grapevine-care-demo-run";

function getOrCreateDemoRun() {
  const existing = sessionStorage.getItem(demoRunStorageKey);
  if (existing) return { id: existing, isNew: false };
  const created = `run_${crypto.randomUUID().replaceAll("-", "")}`;
  sessionStorage.setItem(demoRunStorageKey, created);
  return { id: created, isNew: true };
}

async function api<T>(path: string, demoRunId: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", "x-grapevine-demo-run": demoRunId, ...(init?.headers ?? {}) }
  });
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status}).`);
  return data;
}

export type CareActions = {
  getState(): Promise<CareState>;
  refresh(): Promise<CareState>;
  setScenario(scenario: Scenario): Promise<CareState>;
  confirmDose(doseId: string): Promise<CareState>;
  getEvidenceSnapshot(input: { resident_id: string; event_limit?: number; }): Promise<{ fictional: true; evidence_snapshot_id: string; evidence_version: number; observed_at: string; events: Array<Pick<CareEvent, "id" | "event_type" | "actor_type" | "actor_id" | "evidence_type" | "observed_at" | "summary" | "trust_boundary" | "plan_version">>; uncertainty: string; next_step: string; }>;
  prepareResidentCheckIn(input: { resident_id: string; prompt: string; evidence_snapshot_id: string; idempotency_key: string; }): Promise<{ check_in: ResidentCheckIn; resident_response_required: true; external_side_effect: false; }>;
  respondResidentCheckIn(checkInId: string, responseCode: ResidentResponseCode): Promise<CareState>;
  prepareAction(input: { resident_id: string; channel: PreparedAction["channel"]; reason: string; evidence_snapshot_id: string; idempotency_key: string; }): Promise<{ action: PreparedAction; approval_required: true; external_side_effect: false; }>;
  requestDeviceHealthSnapshot(input: { resident_id: string; device_id: string; idempotency_key: string; }): Promise<{ fictional: true; diagnostic: Record<string, unknown>; external_side_effect: false; duplicate_prevented: boolean; evidence_changed: boolean; next_step?: string; }>;
  prepareCareTeamReview(input: { resident_id: string; review_type: CareTeamHandoff["review_type"]; period_hours: 24 | 72; reason: string; evidence_snapshot_id: string; idempotency_key: string; }): Promise<{ handoff: CareTeamHandoff; approval_required: true; external_side_effect: false; }>;
  resolveAction(actionId: string, resolution: "approved_in_demo" | "dismissed"): Promise<CareState>;
  resolveCareTeamReview(handoffId: string, resolution: "approved_in_demo" | "dismissed"): Promise<CareState>;
  getShiftContext(input?: { shift_id?: string; resident_ref?: string; }): Promise<Record<string, unknown>>;
  getCareTeamOverview(): Promise<{ fictional: true; simulated_time: string; step: number; step_label: string; residents: CareTeamDay["residents"]; attention_queue: CareTeamDay["attention_queue"]; next_event_label: string | null; ordering_basis: string; interpretation_boundary: string; }>;
  advanceCareTeamDay(): Promise<CareState>;
  prepareAssignmentOrientation(input: { resident_ref: string; caregiver_id: string; reason: string; idempotency_key: string; }): Promise<{ packet: OrientationPacket; acknowledgement_required: boolean; external_side_effect: false; }>;
  acknowledgeAssignmentOrientation(packetId: string): Promise<CareState>;
  getCoverageCandidates(input: { shift_id: string; }): Promise<{ fictional: true; shift_id: string; candidates: CoverageCandidate[]; method: string; }>;
  prepareShiftCoverage(input: { shift_id: string; caregiver_id: string; schedule_snapshot_id: string; reason: string; idempotency_key: string; }): Promise<{ proposal: CoverageProposal; approval_required: true; external_side_effect: false; duplicate_prevented: boolean; }>;
  resolveShiftCoverage(proposalId: string, resolution: "approved_in_demo" | "dismissed"): Promise<CareState>;
  getChangesSinceLastShift(input: { caregiver_id: string; resident_id: string; }): Promise<Record<string, unknown>>;
  getShiftBrief(input: { shift_id: string; caregiver_id: string; }): Promise<Record<string, unknown>>;
  startShift(shiftId: string, caregiverId: string): Promise<CareState>;
  completeShift(shiftId: string, caregiverId: string): Promise<CareState>;
  prepareShiftHandoff(input: { shift_id: string; to_caregiver_id: string; schedule_snapshot_id: string; reason: string; idempotency_key: string; }): Promise<{ handoff: ShiftHandoff; approval_required: true; external_side_effect: false; duplicate_prevented: boolean; }>;
  resolveShiftHandoff(handoffId: string, resolution: "approved_in_demo" | "dismissed"): Promise<CareState>;
  acknowledgeShiftHandoff(handoffId: string, caregiverId: string): Promise<CareState>;
};

export function useCare() {
  const [state, setState] = useState<CareState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const stateRef = useRef<CareState | null>(null);
  const demoRunRef = useRef(getOrCreateDemoRun());

  const commit = useCallback((next: CareState) => {
    stateRef.current = next;
    setState(next);
    setError(null);
    return next;
  }, []);

  const getState = useCallback(() => api<CareState>("/api/care/state?resident_id=rose-demo", demoRunRef.current.id), []);
  const refresh = useCallback(async () => commit(await getState()), [commit, getState]);

  useEffect(() => {
    const initialize = async () => {
      if (!demoRunRef.current.isNew) return refresh();
      demoRunRef.current.isNew = false;
      const result = await api<{ state: CareState }>("/api/care/scenario", demoRunRef.current.id, { method: "POST", body: JSON.stringify({ scenario: "coverage_callout" }) });
      return commit(result.state);
    };
    void initialize().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Could not load care workspace."));
  }, [commit, refresh]);

  const setScenario = useCallback(async (scenario: Scenario) => {
    setBusy(true);
    try {
      const result = await api<{ state: CareState }>("/api/care/scenario", demoRunRef.current.id, { method: "POST", body: JSON.stringify({ scenario }) });
      return commit(result.state);
    } finally { setBusy(false); }
  }, [commit]);

  const confirmDose = useCallback(async (doseId: string) => {
    setBusy(true);
    try {
      const result = await api<{ state: CareState }>(`/api/care/doses/${encodeURIComponent(doseId)}/confirm`, demoRunRef.current.id, { method: "POST", body: "{}" });
      return commit(result.state);
    } finally { setBusy(false); }
  }, [commit]);

  const getEvidenceSnapshot = useCallback((input: { resident_id: string; event_limit?: number; }) =>
    api<Awaited<ReturnType<CareActions["getEvidenceSnapshot"]>>>("/api/care/evidence-snapshot", demoRunRef.current.id, { method: "POST", body: JSON.stringify(input) }), []);

  const prepareResidentCheckIn = useCallback(async (input: { resident_id: string; prompt: string; evidence_snapshot_id: string; idempotency_key: string; }) => {
    const result = await api<Awaited<ReturnType<CareActions["prepareResidentCheckIn"]>>>("/api/care/resident-check-ins", demoRunRef.current.id, { method: "POST", body: JSON.stringify(input) });
    await refresh();
    return result;
  }, [refresh]);

  const respondResidentCheckIn = useCallback(async (checkInId: string, responseCode: ResidentResponseCode) => {
    setBusy(true);
    try {
      const result = await api<{ state: CareState }>(`/api/care/resident-check-ins/${encodeURIComponent(checkInId)}/respond`, demoRunRef.current.id, { method: "POST", body: JSON.stringify({ response_code: responseCode }) });
      return commit(result.state);
    } finally { setBusy(false); }
  }, [commit]);

  const prepareAction = useCallback(async (input: { resident_id: string; channel: PreparedAction["channel"]; reason: string; evidence_snapshot_id: string; idempotency_key: string; }) => {
    const result = await api<{ action: PreparedAction; approval_required: true; external_side_effect: false; }>("/api/care/actions", demoRunRef.current.id, { method: "POST", body: JSON.stringify(input) });
    await refresh();
    return result;
  }, [refresh]);

  const requestDeviceHealthSnapshot = useCallback(async (input: { resident_id: string; device_id: string; idempotency_key: string; }) => {
    const result = await api<Awaited<ReturnType<CareActions["requestDeviceHealthSnapshot"]>>>("/api/care/device-health-snapshots", demoRunRef.current.id, { method: "POST", body: JSON.stringify(input) });
    await refresh();
    return result;
  }, [refresh]);

  const prepareCareTeamReview = useCallback(async (input: { resident_id: string; review_type: CareTeamHandoff["review_type"]; period_hours: 24 | 72; reason: string; evidence_snapshot_id: string; idempotency_key: string; }) => {
    const result = await api<Awaited<ReturnType<CareActions["prepareCareTeamReview"]>>>("/api/care/handoffs", demoRunRef.current.id, { method: "POST", body: JSON.stringify(input) });
    await refresh();
    return result;
  }, [refresh]);

  const resolveAction = useCallback(async (actionId: string, resolution: "approved_in_demo" | "dismissed") => {
    setBusy(true);
    try {
      const result = await api<{ state: CareState }>(`/api/care/actions/${encodeURIComponent(actionId)}/resolve`, demoRunRef.current.id, { method: "POST", body: JSON.stringify({ resolution }) });
      return commit(result.state);
    } finally { setBusy(false); }
  }, [commit]);

  const resolveCareTeamReview = useCallback(async (handoffId: string, resolution: "approved_in_demo" | "dismissed") => {
    setBusy(true);
    try {
      const result = await api<{ state: CareState }>(`/api/care/handoffs/${encodeURIComponent(handoffId)}/resolve`, demoRunRef.current.id, { method: "POST", body: JSON.stringify({ resolution }) });
      return commit(result.state);
    } finally { setBusy(false); }
  }, [commit]);

  const getShiftContext = useCallback((input: { shift_id?: string; resident_ref?: string; } = {}) =>
    api<Record<string, unknown>>("/api/care/shift-context", demoRunRef.current.id, { method: "POST", body: JSON.stringify(input) }), []);

  const getCareTeamOverview = useCallback(() =>
    api<Awaited<ReturnType<CareActions["getCareTeamOverview"]>>>("/api/care/team-overview", demoRunRef.current.id, { method: "POST", body: "{}" }), []);

  const advanceCareTeamDay = useCallback(async () => {
    setBusy(true);
    try {
      const result = await api<{ state: CareState }>("/api/care/team-day/advance", demoRunRef.current.id, { method: "POST", body: "{}" });
      return commit(result.state);
    } finally { setBusy(false); }
  }, [commit]);

  const prepareAssignmentOrientation = useCallback(async (input: { resident_ref: string; caregiver_id: string; reason: string; idempotency_key: string; }) => {
    const result = await api<Awaited<ReturnType<CareActions["prepareAssignmentOrientation"]>>>("/api/care/orientation-packets", demoRunRef.current.id, { method: "POST", body: JSON.stringify(input) });
    await refresh();
    return result;
  }, [refresh]);

  const acknowledgeAssignmentOrientation = useCallback(async (packetId: string) => {
    setBusy(true);
    try {
      const result = await api<{ state: CareState }>(`/api/care/orientation-packets/${encodeURIComponent(packetId)}/acknowledge`, demoRunRef.current.id, { method: "POST", body: "{}" });
      return commit(result.state);
    } finally { setBusy(false); }
  }, [commit]);

  const getCoverageCandidates = useCallback((input: { shift_id: string; }) =>
    api<Awaited<ReturnType<CareActions["getCoverageCandidates"]>>>("/api/care/coverage-candidates", demoRunRef.current.id, { method: "POST", body: JSON.stringify(input) }), []);

  const prepareShiftCoverage = useCallback(async (input: { shift_id: string; caregiver_id: string; schedule_snapshot_id: string; reason: string; idempotency_key: string; }) => {
    const result = await api<Awaited<ReturnType<CareActions["prepareShiftCoverage"]>>>("/api/care/coverage-proposals", demoRunRef.current.id, { method: "POST", body: JSON.stringify(input) });
    await refresh();
    return result;
  }, [refresh]);

  const resolveShiftCoverage = useCallback(async (proposalId: string, resolution: "approved_in_demo" | "dismissed") => {
    setBusy(true);
    try {
      const result = await api<{ state: CareState }>(`/api/care/coverage-proposals/${encodeURIComponent(proposalId)}/resolve`, demoRunRef.current.id, { method: "POST", body: JSON.stringify({ resolution }) });
      return commit(result.state);
    } finally { setBusy(false); }
  }, [commit]);

  const getChangesSinceLastShift = useCallback((input: { caregiver_id: string; resident_id: string; }) =>
    api<Record<string, unknown>>("/api/care/changes-since-last-shift", demoRunRef.current.id, { method: "POST", body: JSON.stringify(input) }), []);

  const getShiftBrief = useCallback((input: { shift_id: string; caregiver_id: string; }) =>
    api<Record<string, unknown>>("/api/care/shift-brief", demoRunRef.current.id, { method: "POST", body: JSON.stringify(input) }), []);

  const startShift = useCallback(async (shiftId: string, caregiverId: string) => {
    setBusy(true);
    try {
      const result = await api<{ state: CareState }>(`/api/care/shifts/${encodeURIComponent(shiftId)}/start`, demoRunRef.current.id, { method: "POST", body: JSON.stringify({ caregiver_id: caregiverId }) });
      return commit(result.state);
    } finally { setBusy(false); }
  }, [commit]);

  const completeShift = useCallback(async (shiftId: string, caregiverId: string) => {
    setBusy(true);
    try {
      const result = await api<{ state: CareState }>(`/api/care/shifts/${encodeURIComponent(shiftId)}/complete`, demoRunRef.current.id, { method: "POST", body: JSON.stringify({ caregiver_id: caregiverId }) });
      return commit(result.state);
    } finally { setBusy(false); }
  }, [commit]);

  const prepareShiftHandoff = useCallback(async (input: { shift_id: string; to_caregiver_id: string; schedule_snapshot_id: string; reason: string; idempotency_key: string; }) => {
    const result = await api<Awaited<ReturnType<CareActions["prepareShiftHandoff"]>>>("/api/care/shift-handoffs", demoRunRef.current.id, { method: "POST", body: JSON.stringify(input) });
    await refresh();
    return result;
  }, [refresh]);

  const resolveShiftHandoff = useCallback(async (handoffId: string, resolution: "approved_in_demo" | "dismissed") => {
    setBusy(true);
    try {
      const result = await api<{ state: CareState }>(`/api/care/shift-handoffs/${encodeURIComponent(handoffId)}/resolve`, demoRunRef.current.id, { method: "POST", body: JSON.stringify({ resolution }) });
      return commit(result.state);
    } finally { setBusy(false); }
  }, [commit]);

  const acknowledgeShiftHandoff = useCallback(async (handoffId: string, caregiverId: string) => {
    setBusy(true);
    try {
      const result = await api<{ state: CareState }>(`/api/care/shift-handoffs/${encodeURIComponent(handoffId)}/acknowledge`, demoRunRef.current.id, { method: "POST", body: JSON.stringify({ caregiver_id: caregiverId }) });
      return commit(result.state);
    } finally { setBusy(false); }
  }, [commit]);

  const actions = useMemo<CareActions>(() => ({ getState, refresh, setScenario, confirmDose, getEvidenceSnapshot, prepareResidentCheckIn, respondResidentCheckIn, prepareAction, requestDeviceHealthSnapshot, prepareCareTeamReview, resolveAction, resolveCareTeamReview, getShiftContext, getCareTeamOverview, advanceCareTeamDay, prepareAssignmentOrientation, acknowledgeAssignmentOrientation, getCoverageCandidates, prepareShiftCoverage, resolveShiftCoverage, getChangesSinceLastShift, getShiftBrief, startShift, completeShift, prepareShiftHandoff, resolveShiftHandoff, acknowledgeShiftHandoff }), [getState, refresh, setScenario, confirmDose, getEvidenceSnapshot, prepareResidentCheckIn, respondResidentCheckIn, prepareAction, requestDeviceHealthSnapshot, prepareCareTeamReview, resolveAction, resolveCareTeamReview, getShiftContext, getCareTeamOverview, advanceCareTeamDay, prepareAssignmentOrientation, acknowledgeAssignmentOrientation, getCoverageCandidates, prepareShiftCoverage, resolveShiftCoverage, getChangesSinceLastShift, getShiftBrief, startShift, completeShift, prepareShiftHandoff, resolveShiftHandoff, acknowledgeShiftHandoff]);
  return { state, error, setError, busy, actions };
}
