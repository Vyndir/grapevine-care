# OpenAI WebMCP Challenge checklist

Verified against the live Devpost challenge requirements and judging criteria on
September 3, 2026.

## Implemented

- [x] Working WebMCP application using `document.modelContext.registerTool`
- [x] JSON Schema inputs and bounded runtime validation
- [x] Read-only annotations and untrusted-content annotations
- [x] Human-agent collaboration in the same visible interface
- [x] Explicit human approval before consequence
- [x] Deterministic scenarios and reset
- [x] Per-browser demo isolation and complete atomic reset
- [x] Server invariant tests and GitHub Actions verification
- [x] Resident evidence-resolution loop with human-only response controls
- [x] Evidence-snapshot binding and stale-state rejection
- [x] State-dependent WebMCP capability registration
- [x] Synchronous and Promise-returning `registerTool` browser compatibility with regression coverage
- [x] Natural-language workflow bootstrap with optional shift ID
- [x] Persistent safe caregiver-context reads with state-dependent actions
- [x] Visible active-tool diagnostic on the primary caregiver workspace
- [x] Structured evidence chain of custody and safe device diagnostics
- [x] Fictional Rose profile, personal baseline, and care-team-authored monitoring plan
- [x] Deterministic compressed 72-hour care episode
- [x] Agent-readable longitudinal care brief with unresolved questions
- [x] Snapshot-bound nurse review with server-enforced plan threshold
- [x] Nurse review and operational shift handoff separated into non-overlapping workflows
- [x] Caregiver-first workspace with a focused Today → My Shift → Handoff path and contextual supporting detail
- [x] Full call-out recovery loop from disruption through recipient acknowledgement
- [x] Deterministic eight-constraint caregiver eligibility with no opaque ranking score
- [x] Schedule-snapshot binding and stale-shift rejection
- [x] Human-only scheduler approval, visit acknowledgement, handoff approval, and recipient acknowledgement
- [x] Coordinator-led 5:00 PM readiness loop; the judge never impersonates Jordan to acknowledge her brief
- [x] Coordinator-led 7:35 PM visit-record loop; the judge reviews Jordan's submission instead of acting as Jordan
- [x] Coordinator-led handoff approval and receipt; the judge never impersonates Jordan or Luis
- [x] “Since you were last here” assignment brief with unchanged facts and explicit unknowns
- [x] Simulated EVV events that do not treat missing check-in as proof of absence
- [x] Multi-resident Care Team Day with exactly three distinct operational needs
- [x] Deterministic six-block workday with a server-enforced advance gate and one focused decision at a time
- [x] No timeline reveal resolves an open question; Evelyn's missing verification uses an inquiry, response, and closure loop
- [x] Cross-resident WebMCP overview with knowns, unknowns, sources, policy bases, deadlines, and human owners
- [x] Natural resident references that resolve exactly or fail without guessing
- [x] Idempotent Walter orientation preparation with coordinator outreach, explicit Elena response, and coordinator verification
- [x] Responsive, keyboard-focusable, reduced-motion-aware UI
- [x] Public-repository-ready source, setup, tests, and MIT license
- [x] Clear source lineage from Project Grapevine
- [x] Dedicated repository identity, origin record, and WebMCP evaluation matrix
- [x] Submission copy and under-three-minute demo script

## Required before final Devpost submission

- [x] Deploy the caregiver-continuity build to the live Sites URL
- [x] Publish this healthcare adaptation in a public repository
- [x] Confirm the joint MIT license is visible at the repository root/about area
- [x] Record and publicly upload the demo video to YouTube with audio
- [x] Add the live URL, repository URL, and video URL to Devpost
- [ ] Add Sam Tate to the Devpost project and confirm the invitation is accepted
- [ ] Add an optional project thumbnail/screenshots if desired
- [x] Run the complete cold-start judge protocol and a separate final-release smoke check
- [x] Set the Sites deployment to judge-accessible public access
- [ ] Submit before the extended deadline: September 4, 2026 at 1:00 a.m. PT

The project must remain available throughout judging. Any external libraries,
data, or assets added later must be authorized for use and documented.
