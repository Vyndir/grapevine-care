# Grapevine Care architecture

## Responsibility boundaries

```text
Fictional device adapters
  └─ emit scoped signals + provenance
       └─ D1 evidence model
            ├─ Resident UI: local confirmation request
            ├─ Caregiver UI: evidence + explicit review
            └─ WebMCP: bounded read tools + staged action

Medication release: deterministic device controller only
Caregiver outreach: human approval only
Medical and emergency decisions: outside the product
```

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

## Tool lifecycle

Each tool is registered with an `AbortController`, a bounded JSON Schema, and
annotations. Five tools use `readOnlyHint: true`. All device-derived outputs use
`untrustedContentHint: true`. Component unmount aborts registration.

The only state-changing tool, `prepare_caregiver_check_in`, validates a bounded
reason and caller-generated idempotency key. It creates an
`awaiting_human_approval` record. A separate visible human action resolves it.

## Persistence

D1 stores the fictional resident, medication windows, device registry,
inventory, evidence events, and staged actions. Indexed query paths are based on
resident ID plus schedule time, device type, or event/action time. The unique
idempotency index prevents duplicate staged actions.

## Production evolution

A real implementation would require regulated product classification, clinical
governance, validated hardware, identity and authorization, encrypted protected
health information, immutable audit retention, consent and delegation, vendor
risk review, reliability engineering, incident response, and jurisdiction-
specific legal review. None of those capabilities are claimed by this demo.
