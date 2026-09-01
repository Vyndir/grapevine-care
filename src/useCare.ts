import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CareState, PreparedAction, Scenario } from "./schemas";

const demoRunStorageKey = "grapevine-care-demo-run";

function getOrCreateDemoRunId() {
  const existing = sessionStorage.getItem(demoRunStorageKey);
  if (existing) return existing;
  const created = `run_${crypto.randomUUID().replaceAll("-", "")}`;
  sessionStorage.setItem(demoRunStorageKey, created);
  return created;
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
  prepareAction(input: { resident_id: string; channel: PreparedAction["channel"]; reason: string; idempotency_key: string; }): Promise<{ action: PreparedAction; approval_required: true; external_side_effect: false; }>;
  resolveAction(actionId: string, resolution: "approved_in_demo" | "dismissed"): Promise<CareState>;
};

export function useCare() {
  const [state, setState] = useState<CareState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const stateRef = useRef<CareState | null>(null);
  const demoRunIdRef = useRef(getOrCreateDemoRunId());

  const commit = useCallback((next: CareState) => {
    stateRef.current = next;
    setState(next);
    setError(null);
    return next;
  }, []);

  const getState = useCallback(() => api<CareState>("/api/care/state?resident_id=rose-demo", demoRunIdRef.current), []);
  const refresh = useCallback(async () => commit(await getState()), [commit, getState]);

  useEffect(() => { void refresh().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Could not load care workspace.")); }, [refresh]);

  const setScenario = useCallback(async (scenario: Scenario) => {
    setBusy(true);
    try {
      const result = await api<{ state: CareState }>("/api/care/scenario", demoRunIdRef.current, { method: "POST", body: JSON.stringify({ scenario }) });
      return commit(result.state);
    } finally { setBusy(false); }
  }, [commit]);

  const confirmDose = useCallback(async (doseId: string) => {
    setBusy(true);
    try {
      const result = await api<{ state: CareState }>(`/api/care/doses/${encodeURIComponent(doseId)}/confirm`, demoRunIdRef.current, { method: "POST", body: "{}" });
      return commit(result.state);
    } finally { setBusy(false); }
  }, [commit]);

  const prepareAction = useCallback(async (input: { resident_id: string; channel: PreparedAction["channel"]; reason: string; idempotency_key: string; }) => {
    const result = await api<{ action: PreparedAction; approval_required: true; external_side_effect: false; }>("/api/care/actions", demoRunIdRef.current, { method: "POST", body: JSON.stringify(input) });
    await refresh();
    return result;
  }, [refresh]);

  const resolveAction = useCallback(async (actionId: string, resolution: "approved_in_demo" | "dismissed") => {
    setBusy(true);
    try {
      const result = await api<{ state: CareState }>(`/api/care/actions/${encodeURIComponent(actionId)}/resolve`, demoRunIdRef.current, { method: "POST", body: JSON.stringify({ resolution }) });
      return commit(result.state);
    } finally { setBusy(false); }
  }, [commit]);

  const actions = useMemo<CareActions>(() => ({ getState, refresh, setScenario, confirmDose, prepareAction, resolveAction }), [getState, refresh, setScenario, confirmDose, prepareAction, resolveAction]);
  return { state, error, setError, busy, actions };
}
