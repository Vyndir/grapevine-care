# Grapevine Care safety case

## Intended use

Demonstrate how WebMCP can help an agent summarize fictional elder-care evidence
over time, compare it with a care-team-authored baseline, and prepare caregiver
or care-team review while preserving human control.

## Explicit non-use

This prototype must not be used to deliver, prescribe, select, change, or verify
real medication; diagnose a condition; infer ingestion; determine welfare;
dispatch help; or replace emergency services, clinicians, pharmacists, or
caregivers.

## Primary hazards and controls

| Hazard | Control in this demo |
| --- | --- |
| Duplicate or out-of-window release | Deterministic controller state; no WebMCP release tool |
| Agent impersonates biometric proof | Local attestation is human-only; no fingerprint data or agent capability |
| Missed confirmation treated as proof of harm | UI and tool outputs state that ingestion and welfare remain unknown |
| Stale telemetry appears current | Every event has source and time; offline scenario surfaces uncertainty |
| Agent contacts someone without consent | Tool can only stage; visible human approval is required |
| Agent answers on the resident’s behalf | Resident response endpoint is absent from WebMCP; only visible Rose-station controls contribute self-report |
| Resident self-report treated as medication proof | Structured trust boundary explicitly separates self-report from removal, ingestion, and clinical verification |
| Agent acts on stale evidence | Preparation requires the current server-issued evidence snapshot ID |
| Static tools remain available during human decisions | Page unregisters preparation tools while resident or caregiver review is pending |
| Duplicate staged outreach | Unique, caller-supplied idempotency key enforced by D1 |
| Device diagnostic becomes remote control | Diagnostic returns non-clinical health only; no release, biometric, or clinical-reading capability |
| Agent invents what is medically significant | Monitoring criteria come from a signed fictional care plan; the agent can compare but cannot author or modify them |
| Baseline difference is treated as diagnosis | UI and tools label differences as coordination signals with unknown causes |
| Longitudinal summary hides contradictory evidence | Care brief carries counts, source-visible events, and a dedicated unresolved-questions list |
| Nurse review bypasses monitoring criteria | Server requires the seeded signed-plan threshold and a current evidence snapshot |
| Prepared handoff is mistaken for transmission | Visible drawer and tool output state `external_side_effect: false`; no care-provider integration exists |
| One judge changes another judge's demo | Every mutable row is scoped to an isolated browser run |
| Reset leaves stale inventory or evidence | Full run reconstruction in one D1 batch |
| Repeated approval creates duplicate history | Conditional resolution; already-resolved actions return without another event |
| Device adapter gains excessive authority | Static least-privilege capabilities; adapters cannot add executable tools |
| Sensitive real-world data enters the demo | Fixed fictional resident and devices; no authentication, uploads, contacts, or external APIs |

## Fail-safe behavior

- Door open: release is blocked.
- Device offline: remote evidence is marked stale; the local controller remains
  authoritative.
- Window missed: compartment remains locked; no emergency conclusion is made.
- Invalid or oversized input: request is rejected.
- Repeated idempotency key: existing staged action is returned.
- Changed evidence: an old snapshot is rejected and the agent must re-observe.
- Resident response pending: preparation capabilities are removed.
- Caregiver or care-team review pending: all preparation capabilities are removed.
- Monitoring threshold absent: care-team review preparation is rejected.
- Repeated dose confirmation or action resolution: no second mutation or event.
- Scenario reset: all mutable run state returns to the documented seed.

## Human factors

The resident surface uses large touch targets, plain language, visible status,
and no medication names. The caregiver surface separates observation, source,
and meaning. Consequential review copy lists what has *not* happened before the
approval control. Reduced-motion preferences and keyboard focus are supported.

## Before any real-world pilot

Do not connect this prototype to people, medication, biometric systems,
pharmacies, clinicians, emergency services, or medical devices. A real pilot
requires independent clinical, regulatory, privacy, security, accessibility,
hardware, and human-factors validation.
