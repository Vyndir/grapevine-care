# Grapevine Care architecture

## Responsibility boundaries

```text
Fictional device adapters
  └─ emit scoped signals + provenance
       └─ D1 evidence model
            ├─ Resident UI: local confirmation + bounded self-report
            ├─ Caregiver UI: Now + Story + Care Plan + Care Circle
            └─ WebMCP: state-dependent evidence and preparation tools

Medication release: deterministic device controller only
Caregiver outreach: human approval only
Medical and emergency decisions: outside the product
```

## Longitudinal care layer

The 72-hour episode adds three D1-backed concepts without changing the existing
authority model:

- `care_demo_profiles` stores Rose's fictional care-team-supplied history,
  routine, support arrangement, and preferences.
- `care_demo_monitoring_rules` stores the signed instructions that determine
  what the care circle should review. The agent cannot author these rules.
- `care_demo_handoffs` stores snapshot-bound nurse-review or shift-handoff
  drafts and their explicit caregiver decision.

`get_resident_context` separates clinical/care-team facts from personal
baseline and preferences. `get_care_story` returns a bounded 24/72-hour summary,
baseline comparisons, provenance, and unresolved questions. A difference from
baseline is represented as a coordination signal—not as a diagnosis.

When the seeded story contains two unconfirmed medication windows within 72
hours, the server—not the model—matches the signed plan threshold before
`prepare_care_team_review` can succeed.

The browser page is the WebMCP server. Agents discover tools in the same page a
person is using, so the visible interface and tool results share one workflow
state. The Worker provides same-origin endpoints and parameterized D1 queries.

## Device adapter contract

`grapevine.care.device.v1` normalizes:

- stable device ID and resident scope;
- device type, health, battery, firmware, and last-seen time;
- a list of least-privilege capabilities;
- timestamped events with source and severity.

The current registry demonstrates a medication dispenser, room/fall sensor, and
blood-pressure cuff. Device capabilities are data, not dynamically executable
code. An adapter cannot add a WebMCP tool or exceed the platform’s safety policy.

## Evidence resolution state machine

```text
Device observation
  → agent reads current evidence snapshot
  → agent prepares a bounded resident question
  → Rose answers in the human-only surface
  → prior snapshot becomes stale
  → agent re-reads the changed evidence
  → agent prepares a caregiver check-in
  → caregiver approves or dismisses
```

The longitudinal branch extends this safely:

```text
Read Rose's authorized context
  → summarize 72-hour evidence relative to her baseline
  → preserve unresolved causes
  → verify the signed monitoring threshold
  → prepare nurse review or shift handoff from a current snapshot
  → caregiver approves or dismisses
```

Each evidence-changing transition increments `evidence_version`. The server
stores the version captured by `get_care_evidence` and rejects preparation from
an older snapshot. This makes tool order a server invariant rather than a
prompt-only instruction.

## Tool lifecycle

Each tool is registered with an `AbortController`, bounded JSON Schema, and
annotations. The page aborts registrations when the workflow changes and
registers only capabilities valid for the new state. All device-derived outputs
use `untrustedContentHint: true`.

`prepare_resident_check_in` creates a visible human-only card;
`request_device_health_snapshot` records only non-clinical diagnostics; and
`prepare_caregiver_check_in` creates an `awaiting_human_approval` record. Each
uses bounded input and idempotency. None contacts an external person or controls
medication.

## Persistence

D1 stores an isolated fictional run for each browser session. Every medication
window, device, inventory record, evidence snapshot, resident question, event,
profile, monitoring rule, care-team handoff, diagnostic, and staged action is
keyed by the opaque `demo_run_id` sent in a same-origin header. Indexed query paths begin
with that run ID; a composite unique constraint prevents duplicate idempotency
keys within a run without coupling different judges.

The scenario endpoint is a full reset, not a partial mutation. A single D1
batch removes that run's mutable records and reconstructs doses, devices,
inventory, snapshots, resident responses, evidence, diagnostics, and actions
from a known seed. Another browser's run is
never read or changed.

Conditional server updates enforce single dose confirmation and single action
resolution. Review events use Rose's simulated time, so the visible timeline
and structured evidence remain deterministic.

Every event carries structured provenance: actor type and ID, evidence class,
observation and recording times, trust boundary, and applicable plan version.
Nurse Ava participates as the signed source of Care Plan v4; the device reports
which plan version it has applied without exposing medication details.

## Production evolution

A real implementation would require regulated product classification, clinical
governance, validated hardware, identity and authorization, encrypted protected
health information, immutable audit retention, consent and delegation, vendor
risk review, reliability engineering, incident response, and jurisdiction-
specific legal review. None of those capabilities are claimed by this demo.
