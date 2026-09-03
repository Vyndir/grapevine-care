# Grapevine Care architecture

## Responsibility boundaries

```text
Fictional device adapters
  └─ emit scoped signals + provenance
       └─ D1 evidence model
            ├─ Resident UI: local confirmation + bounded self-report
            ├─ Caregiver UI: Today → My Shift → Handoff, with contextual disclosures
            └─ WebMCP: state-dependent evidence and preparation tools

Medication release: deterministic device controller only
Caregiver outreach: human approval only
Shift assignment: deterministic server constraints + scheduler approval only
Shift handoff release: outgoing caregiver approval only
Medical and emergency decisions: outside the product
```

## Multi-resident care-team layer

Migrations `0006_care_team_day.sql` and `0007_inquiry_driven_day.sql` add a
six-block persisted simulation, idempotent orientation packets, and explicit
team inquiries. They model exactly three distinct operational problems: Evelyn’s
missing visit-verification evidence, Walter’s resident-specific onboarding gap,
and Rose’s later coverage disruption.

`get_care_team_overview` is the portfolio-level read. The server—not the
language model—constructs each queue item’s deadline, source, policy basis,
known facts, unknowns, and human owner. The queue is operational ordering, not
medical triage. `resident_ref` resolves exact names or IDs and fails on unknown
or ambiguous references.

```text
09:15 Evelyn: verification missing; presence unknown
      → agent prepares inquiry → coordinator sends → Luis responds
      → coordinator records disposition
11:30 Walter: orientation and Care Plan v2 acknowledgement due
      → agent prepares packet + follow-up → coordinator sends
      → Elena response arrives → coordinator verifies and clears
14:15 Rose: Maya calls out → existing coverage workflow activates
17:00 replacement visit → 19:35 completion → 20:00 handoff
```

The “Advance simulated time” control changes persisted simulated time only after
the server's advance gate confirms the current decision is accounted for. It
never reveals the answer to an open question, contacts a real person, or silently
completes a human task. The coordinator receives the exact blocking requirement.

`care_demo_team_inquiries` preserves the investigation chain: the source gap,
bounded question, approval state, response code, response evidence class, and
human closure. The seeded Luis response is explicitly a caregiver self-report;
it does not become an independent EVV record.

## Longitudinal care layer

The 72-hour episode adds three D1-backed concepts without changing the existing
authority model:

- `care_demo_profiles` stores Rose's fictional care-team-supplied history,
  routine, support arrangement, and preferences.
- `care_demo_monitoring_rules` stores the signed instructions that determine
  what the care circle should review. The agent cannot author these rules.
- `care_demo_handoffs` stores snapshot-bound nurse-review drafts and their
  explicit caregiver decision. Operational shift handoffs have a separate,
  assignment-bound model.

`get_resident_context` separates clinical/care-team facts from personal
baseline and preferences. `get_care_story` returns a bounded 24/72-hour summary,
baseline comparisons, provenance, and unresolved questions. A difference from
baseline is represented as a coordination signal—not as a diagnosis.

When the seeded story contains two unconfirmed medication windows within 72
hours, the server—not the model—matches the signed plan threshold before
`prepare_care_team_review` can succeed.

## Caregiver continuity layer

Migration `0005_caregiver_continuity_loop.sql` adds a real shift and assignment
model:

- caregiver profiles, availability, and resident-specific readiness;
- versioned shifts and schedule snapshots;
- coverage proposals with scheduler decisions;
- simulated EVV-style visit events;
- assignment-bound handoffs and recipient acknowledgements.

The primary state machine is:

```text
coverage_needed
  → get_shift_context({}) (discover active shift + schedule snapshot)
  → get_coverage_candidates (eight deterministic constraints)
  → prepare_shift_coverage
  → awaiting_scheduler_approval
  → scheduler approves
  → assigned
  → get_changes_since_last_shift + get_shift_brief
  → assigned caregiver acknowledges and starts
  → in_progress
  → assigned caregiver completes
  → handoff ready
  → prepare_shift_handoff
  → outgoing caregiver approves
  → available to next caregiver
  → next caregiver acknowledges
```

Only Jordan passes the seeded call-out scenario. Maya called out; Luis has a
schedule/travel conflict; Elena lacks Rose orientation and Care Plan v4
acknowledgement. The server returns the same eight named checks for every
candidate. There is no model-authored suitability score and no use of sensitive
personal traits.

`schedule_snapshot_id` binds coverage and handoff preparation to a specific
shift version. Assignment, visit, and handoff transitions increment the version,
so a stale agent observation fails closed. Preparation is idempotent; conditional
updates prevent two decisions from applying the same transition.

Visit events are explicitly labeled as simulated EVV attestations, caregiver
attestations, or bounded observations. Missing check-in evidence is never treated
as proof of caregiver absence. The demo's shift start, completion, approval, and
acknowledgement controls are human-only UI surfaces.

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
  → prepare nurse review from a current snapshot
  → caregiver approves or dismisses
```

Each evidence-changing transition increments `evidence_version`. The server
stores the version captured by `get_care_evidence` and rejects preparation from
an older snapshot. This makes tool order a server invariant rather than a
prompt-only instruction.

## Tool lifecycle

Each tool is registered with an `AbortController`, bounded JSON Schema, and
annotations. Four non-consequential caregiver-context tools remain available
throughout the call-out workflow so natural questions do not fall back to DOM
inspection. The page aborts and replaces consequential registrations when the
workflow changes. All device-derived outputs use `untrustedContentHint: true`.

`prepare_resident_check_in` creates a visible human-only card;
`request_device_health_snapshot` records only non-clinical diagnostics; and
`prepare_caregiver_check_in` creates an `awaiting_human_approval` record. Each
uses bounded input and idempotency. None contacts an external person or controls
medication.

## Persistence

D1 stores an isolated fictional run for each browser session. Every medication
window, device, inventory record, evidence snapshot, resident question, event,
profile, monitoring rule, nurse-review draft, diagnostic, and staged action is
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
