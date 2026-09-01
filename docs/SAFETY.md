# Grapevine Care safety case

## Intended use

Demonstrate how WebMCP can help an agent summarize fictional elder-care device
evidence and prepare a caregiver check-in while preserving human control.

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
| Duplicate staged outreach | Unique, caller-supplied idempotency key enforced by D1 |
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
